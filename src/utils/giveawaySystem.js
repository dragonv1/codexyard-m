const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { readData, writeData } = require('./dataStore');
const { ensureSeasonSystem, checkAndAdvanceSeason, ensureUser, resolveClaim, pushHistory } = require('./gameEngine');

const DEFAULT_OWNER_ID = '1330138758535843840';
const DRAW_DURATION_MS = 1000 * 60 * 60;
const DRAW_WINNER_COUNT = 3;

let schedulerStarted = false;
let tickInProgress = false;

function ownerId() {
  return process.env.OWNER_USER_ID || DEFAULT_OWNER_ID;
}

function isOwnerUser(userId) {
  return String(userId) === String(ownerId());
}

function ensureGiveawayStore(data) {
  if (!data.giveaways) {
    data.giveaways = { configs: {} };
  }
  if (!data.giveaways.configs) {
    data.giveaways.configs = {};
  }
}

function giveawayTypeLabel(type) {
  return type === 'booster' ? 'Booster Cekilisi' : 'Cekilis';
}

function giveawayId(guildId, channelId, type) {
  return `${guildId}_${channelId}_${type}`;
}

function buildRoundEmbed(config) {
  const isBooster = config.type === 'booster';
  const color = isBooster ? 0xf1c40f : 0x5865f2;
  const title = isBooster ? '🚀 Booster Cekilisi Basladi' : '🎉 Cekilis Basladi';

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(
      `Bu kanalda otomatik cekilis aktif!\n` +
      `Bitis: <t:${Math.floor(config.current.endAt / 1000)}:R>\n` +
      `Kazanan: **${config.winnerCount} kisi**`
    )
    .addFields(
      {
        name: 'Odul',
        value: isBooster
          ? 'Daha guclu rastgele yetenek + bonus para'
          : 'Rastgele yetenek'
      },
      {
        name: 'Katilim',
        value: 'Asagidaki **Katil** butonuna tikla.'
      }
    )
    .setFooter({ text: `Round #${config.current.round} | ${giveawayTypeLabel(config.type)}` })
    .setTimestamp();
}

function buildRoundComponents(config) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`gw_join|${config.id}|${config.current.round}`)
        .setLabel('Katil')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🎟️')
    )
  ];
}

async function startNewRound(client, data, config) {
  const channel = await client.channels.fetch(config.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    config.enabled = false;
    return null;
  }

  const now = Date.now();
  const nextRound = (config.current?.round || 0) + 1;
  config.current = {
    round: nextRound,
    startAt: now,
    endAt: now + config.intervalMs,
    participants: [],
    messageId: null
  };

  const sent = await channel.send({
    embeds: [buildRoundEmbed(config)],
    components: buildRoundComponents(config)
  });

  config.current.messageId = sent.id;
  return sent;
}

function pickWinners(participants, winnerCount) {
  const copy = [...participants];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy.slice(0, Math.min(winnerCount, copy.length));
}

function applyWinnerReward(data, winnerId, type) {
  const raw = data.users[winnerId];
  if (!raw || !raw.role || !raw.character) {
    return { ok: false, text: 'Kariyer yok, odul atlandi.' };
  }

  const user = ensureUser(data, winnerId);
  const claimCount = type === 'booster' ? 2 : 1;
  const talentNames = [];

  for (let i = 0; i < claimCount; i += 1) {
    const reward = resolveClaim(user);
    talentNames.push(reward.talent.label);
  }

  if (type === 'booster') {
    user.stats.money += 5000;
  }

  pushHistory(user, `${giveawayTypeLabel(type)} odulu kazanildi (${talentNames.join(', ')}).`);

  return {
    ok: true,
    text: `${talentNames.join(' + ')}${type === 'booster' ? ' + 5000 ₺' : ''}`
  };
}

async function finishRound(client, data, config) {
  const channel = await client.channels.fetch(config.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    config.enabled = false;
    return;
  }

  const participants = config.current?.participants || [];
  const winners = pickWinners(participants, config.winnerCount);

  const resultLines = [];
  if (winners.length === 0) {
    resultLines.push('Bu turda katilim olmadi.');
  } else {
    for (const winnerId of winners) {
      const reward = applyWinnerReward(data, winnerId, config.type);
      resultLines.push(`<@${winnerId}> -> ${reward.text}`);
    }
  }

  const resultEmbed = new EmbedBuilder()
    .setColor(config.type === 'booster' ? 0xe67e22 : 0x2ecc71)
    .setTitle(`🏁 ${giveawayTypeLabel(config.type)} Sonuclandi`)
    .setDescription(
      `Round #${config.current.round} tamamlandi.\n` +
      `Toplam katilim: **${participants.length}**\n` +
      `Kazanan: **${winners.length}**`
    )
    .addFields({ name: 'Odul Sonuclari', value: resultLines.join('\n') })
    .setTimestamp();

  await channel.send({
    content: winners.length > 0 ? winners.map((id) => `<@${id}>`).join(' ') : undefined,
    embeds: [resultEmbed],
    allowedMentions: { users: winners }
  });

  config.lastFinishedAt = Date.now();
  config.current = null;
}

function upsertGiveawayConfig(data, { guildId, channelId, type, createdBy }) {
  ensureGiveawayStore(data);
  const id = giveawayId(guildId, channelId, type);

  if (!data.giveaways.configs[id]) {
    data.giveaways.configs[id] = {
      id,
      guildId,
      channelId,
      type,
      enabled: true,
      intervalMs: DRAW_DURATION_MS,
      winnerCount: DRAW_WINNER_COUNT,
      createdBy,
      createdAt: Date.now(),
      lastFinishedAt: 0,
      current: null
    };
  } else {
    data.giveaways.configs[id].enabled = true;
    data.giveaways.configs[id].channelId = channelId;
  }

  return data.giveaways.configs[id];
}

async function activateGiveaway(client, { guildId, channelId, type, createdBy }) {
  const data = readData();
  ensureSeasonSystem(data);
  checkAndAdvanceSeason(data);
  ensureGiveawayStore(data);

  const config = upsertGiveawayConfig(data, { guildId, channelId, type, createdBy });

  if (!config.current) {
    await startNewRound(client, data, config);
  }

  writeData(data);
  return config;
}

async function processGiveawayTick(client) {
  if (tickInProgress) return;
  tickInProgress = true;

  try {
    const data = readData();
    ensureSeasonSystem(data);
    checkAndAdvanceSeason(data);
    ensureGiveawayStore(data);

    let changed = false;

    for (const config of Object.values(data.giveaways.configs)) {
      if (!config.enabled) continue;

      if (!config.current) {
        await startNewRound(client, data, config);
        changed = true;
        continue;
      }

      if (Date.now() >= config.current.endAt) {
        await finishRound(client, data, config);
        await startNewRound(client, data, config);
        changed = true;
      }
    }

    if (changed) {
      writeData(data);
    }
  } catch (error) {
    console.error('Giveaway tick error:', error);
  } finally {
    tickInProgress = false;
  }
}

function startGiveawayScheduler(client) {
  if (schedulerStarted) return;
  schedulerStarted = true;

  setInterval(() => {
    processGiveawayTick(client);
  }, 30 * 1000);

  processGiveawayTick(client);
}

async function handleGiveawayJoinInteraction(interaction) {
  const [_, cfgId, roundRaw] = interaction.customId.split('|');
  const round = Number(roundRaw);

  const data = readData();
  ensureSeasonSystem(data);
  checkAndAdvanceSeason(data);
  ensureGiveawayStore(data);

  const config = data.giveaways.configs[cfgId];
  if (!config || !config.enabled || !config.current) {
    return interaction.reply({ content: 'Bu cekilis aktif degil.', ephemeral: true });
  }

  if (config.current.round !== round) {
    return interaction.reply({ content: 'Bu round kapanmis. Yeni mesajdan katil.', ephemeral: true });
  }

  if (Date.now() >= config.current.endAt) {
    return interaction.reply({ content: 'Bu cekilisin suresi dolmus.', ephemeral: true });
  }

  const user = ensureUser(data, interaction.user.id);
  if (!user.role || !user.character) {
    writeData(data);
    return interaction.reply({ content: 'Katilim icin once kariyer olusturmalisin.', ephemeral: true });
  }

  if (config.current.participants.includes(interaction.user.id)) {
    writeData(data);
    return interaction.reply({ content: 'Zaten katildin.', ephemeral: true });
  }

  config.current.participants.push(interaction.user.id);
  writeData(data);

  return interaction.reply({ content: 'Cekilise katildin! Bol sans.', ephemeral: true });
}

module.exports = {
  isOwnerUser,
  activateGiveaway,
  startGiveawayScheduler,
  handleGiveawayJoinInteraction,
  ownerId
};
