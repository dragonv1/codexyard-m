const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const {
  ensureUser,
  ensureSeasonSystem,
  checkAndAdvanceSeason,
  ensureNpcPlayers,
  canUseCooldown,
  setCooldown,
  resetDailyCaps,
  runArenaMatch,
  applyArenaRewards,
  checkAutomaticAchievements,
  pushHistory
} = require('../utils/gameEngine');
const { errorEmbed } = require('../utils/guards');
const { pickRandom, timeLeft } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder().setName('arena').setDescription('Random rakibe karsi arena maci oyna'),

  async execute(interaction) {
    const data = readData();
    ensureSeasonSystem(data);
    const seasonReport = checkAndAdvanceSeason(data);
    ensureNpcPlayers(data);

    const user = ensureUser(data, interaction.user.id);
    if (!user.role || !user.character) {
      return interaction.reply({
        embeds: [errorEmbed('Karakter gerekli', 'Arena icin once `/başla` ve `/karakter-oluştur` komutlarini tamamla.')],
        ephemeral: true
      });
    }

    if (Date.now() < user.status.injuredUntil) {
      return interaction.reply({
        embeds: [errorEmbed('Sakatlik suruyor', 'Sakatligin devam ediyor. Biraz dinlenmen gerek.')],
        ephemeral: true
      });
    }

    resetDailyCaps(user);
    if (user.season.remainingAttacks <= 0) {
      return interaction.reply({
        embeds: [errorEmbed('Arena hakki bitti', 'Bugunku arena hakkin tukendi. Yeni haklar gun degisiminde yenilenir.')],
        ephemeral: true
      });
    }

    const arenaCooldown = canUseCooldown(user, 'arena');
    if (!arenaCooldown.ok) {
      return interaction.reply({
        embeds: [errorEmbed('Arena hazir degil', `Yeni saldiri icin kalan sure: **${timeLeft(arenaCooldown.remainingMs)}**`)],
        ephemeral: true
      });
    }

    const npc = pickRandom(data.npcPlayers);
    const result = runArenaMatch(user, npc);
    const levelUp = applyArenaRewards(user, result);
    const unlocked = checkAutomaticAchievements(user);

    setCooldown(user, 'arena');
    pushHistory(user, `Arena: ${result.npcName} (${result.npcTitle}) karsisinda ${result.result} (${result.scoreline}).`);

    writeData(data);

    const embed = new EmbedBuilder()
      .setColor(result.result === 'Galibiyet' ? 0x2ecc71 : result.result === 'Berabere' ? 0xf1c40f : 0xe74c3c)
      .setTitle('Arena Sonucu')
      .setDescription(`Rakip: **${result.npcName}** (${result.npcTitle})\n${result.npcFlavor}`)
      .addFields(
        { name: 'Skor', value: `${result.scoreline} (${result.result})`, inline: true },
        { name: 'Arena Puan', value: `${result.arenaDelta >= 0 ? '+' : ''}${result.arenaDelta}`, inline: true },
        { name: 'Kalan Hak', value: String(user.season.remainingAttacks), inline: true },
        { name: 'Oduller', value: `+${result.moneyGain.toLocaleString('tr-TR')} ₺\n+${result.xpGain} XP`, inline: true },
        { name: 'Seviye', value: levelUp > 0 ? `+${levelUp}` : 'Degismedi', inline: true },
        { name: 'Toplam Arena Puanin', value: String(user.season.arenaPoints), inline: true }
      )
      .setTimestamp();

    if (seasonReport) {
      embed.addFields({
        name: 'Yeni Sezon Basladi',
        value: `Sezon ${seasonReport.season} tamamlandi. Sampiyon: ${seasonReport.champion}`
      });
    }

    if (unlocked.length > 0) {
      embed.addFields({
        name: 'Yeni Basarimlar',
        value: unlocked.map((x) => `🏆 ${x.title}`).join('\n')
      });
    }

    return interaction.reply({ embeds: [embed] });
  }
};
