const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const {
  ensureUser,
  ensureSeasonSystem,
  checkAndAdvanceSeason,
  canUseCooldown,
  setCooldown,
  runFriendlyMatch,
  applyFriendlyRewards,
  checkAutomaticAchievements,
  pushHistory
} = require('../utils/gameEngine');
const { errorEmbed } = require('../utils/guards');
const { timeLeft } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('friendly')
    .setDescription('Bir kullaniciyla dostluk maci yap')
    .addUserOption((opt) => opt.setName('kullanici').setDescription('Maca cagirilacak oyuncu').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('kullanici', true);
    if (target.id === interaction.user.id) {
      return interaction.reply({
        embeds: [errorEmbed('Gecersiz rakip', 'Kendinle friendly mac yapamazsin.')],
        ephemeral: true
      });
    }

    const data = readData();
    ensureSeasonSystem(data);
    checkAndAdvanceSeason(data);

    const me = ensureUser(data, interaction.user.id);
    const rival = ensureUser(data, target.id);

    if (!me.role || !me.character) {
      return interaction.reply({
        embeds: [errorEmbed('Karakter gerekli', 'Once kendi kariyerini olusturmalisin.')],
        ephemeral: true
      });
    }

    if (!rival.role || !rival.character) {
      return interaction.reply({
        embeds: [errorEmbed('Rakibin kariyeri yok', 'Bu kullanicinin aktif kariyeri bulunmuyor.')],
        ephemeral: true
      });
    }

    const cd = canUseCooldown(me, 'friendly');
    if (!cd.ok) {
      return interaction.reply({
        embeds: [errorEmbed('Friendly hazir degil', `Yeni friendly icin kalan sure: **${timeLeft(cd.remainingMs)}**`)],
        ephemeral: true
      });
    }

    const myResult = runFriendlyMatch(me, rival);
    const rivalResult = {
      ...myResult,
      scoreline: myResult.scoreline.split(' - ').reverse().join(' - '),
      result:
        myResult.result === 'Galibiyet' ? 'Maglubiyet' : myResult.result === 'Maglubiyet' ? 'Galibiyet' : 'Berabere',
      arenaDelta: -myResult.arenaDelta
    };

    const myLevelUp = applyFriendlyRewards(me, myResult);
    const rivalLevelUp = applyFriendlyRewards(rival, rivalResult);

    setCooldown(me, 'friendly');
    pushHistory(me, `Friendly: ${rival.character.name} karsisinda ${myResult.result} (${myResult.scoreline}).`);
    pushHistory(rival, `Friendly: ${me.character.name} karsisinda ${rivalResult.result} (${rivalResult.scoreline}).`);

    const unlocked = checkAutomaticAchievements(me);
    checkAutomaticAchievements(rival);

    writeData(data);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('Friendly Mac Tamamlandi')
      .setDescription(`**${me.character.name}** vs **${rival.character.name}**`)
      .addFields(
        { name: 'Skor', value: `${myResult.scoreline} (${myResult.result})`, inline: true },
        { name: 'Arena Etkisi', value: `${myResult.arenaDelta >= 0 ? '+' : ''}${myResult.arenaDelta} puan`, inline: true },
        { name: 'Kazanc', value: `+${myResult.moneyGain.toLocaleString('tr-TR')} ₺ | +${myResult.xpGain} XP`, inline: true },
        { name: 'Senin Seviye', value: myLevelUp > 0 ? `+${myLevelUp}` : 'Degismedi', inline: true },
        { name: 'Rakip Seviye', value: rivalLevelUp > 0 ? `+${rivalLevelUp}` : 'Degismedi', inline: true },
        { name: 'Rakip', value: `${target.username} profilinde de sonuc kaydedildi.` }
      )
      .setTimestamp();

    if (unlocked.length > 0) {
      embed.addFields({
        name: 'Yeni Basarimlar',
        value: unlocked.map((a) => `🏆 ${a.title}`).join('\n')
      });
    }

    return interaction.reply({ embeds: [embed] });
  }
};
