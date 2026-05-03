const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const {
  ensureUser,
  ensureSeasonSystem,
  checkAndAdvanceSeason,
  runTraining,
  canUseCooldown,
  setCooldown,
  checkAutomaticAchievements,
  COOLDOWNS,
  pushHistory
} = require('../utils/gameEngine');
const { errorEmbed } = require('../utils/guards');
const { timeLeft } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antrenman')
    .setDescription('Antrenman yap ve ozelliklerini gelistir')
    .addStringOption((opt) =>
      opt
        .setName('tip')
        .setDescription('Antrenman tipi')
        .setRequired(false)
        .addChoices(
          { name: 'Normal', value: 'normal' },
          { name: 'Ozel (2500 ₺)', value: 'ozel' }
        )
    ),

  async execute(interaction) {
    const data = readData();
    ensureSeasonSystem(data);
    checkAndAdvanceSeason(data);

    const user = ensureUser(data, interaction.user.id);

    if (!user.role || !user.character) {
      return interaction.reply({
        embeds: [errorEmbed('Karakter gerekli', 'Once `/başla` ve `/karakter-oluştur` komutlarini tamamla.')],
        ephemeral: true
      });
    }

    const cooldown = canUseCooldown(user, 'training');
    if (!cooldown.ok) {
      return interaction.reply({
        embeds: [errorEmbed('Antrenman hazir degil', `Tekrar antrenman icin bekleme suresi: **${timeLeft(cooldown.remainingMs)}**`)],
        ephemeral: true
      });
    }

    const tip = interaction.options.getString('tip') || 'normal';
    if (tip === 'ozel' && user.stats.money < 2500) {
      return interaction.reply({
        embeds: [errorEmbed('Yetersiz bakiye', 'Ozel antrenman icin en az 2500 ₺ gerekiyor.')],
        ephemeral: true
      });
    }

    const result = runTraining(user, tip);
    setCooldown(user, 'training');
    pushHistory(user, `Antrenman tamamlandi (${tip}). +${result.formGain} form, +${result.moraleGain} moral.`);

    const unlocked = checkAutomaticAchievements(user);
    writeData(data);

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('Antrenman Tamamlandi')
      .setDescription(tip === 'ozel' ? 'Ozel antrenman ile ekstra gelisim saglandi.' : 'Yogun bir idman seansi bitti.')
      .addFields(
        { name: 'Overall', value: `+${result.overallGain}`, inline: true },
        { name: 'Form', value: `+${result.formGain}`, inline: true },
        { name: 'Moral', value: `+${result.moraleGain}`, inline: true },
        { name: 'XP', value: `+${result.xpGain}`, inline: true },
        { name: 'Seviye Atlama', value: result.leveledUp > 0 ? `+${result.leveledUp}` : 'Yok', inline: true },
        { name: 'Cooldown', value: `${Math.floor(COOLDOWNS.training / 1000 / 60)} dakika`, inline: true }
      )
      .setFooter({ text: 'Disiplin kazanir' })
      .setTimestamp();

    if (unlocked.length > 0) {
      embed.addFields({
        name: 'Yeni Basarimlar',
        value: unlocked.map((a) => `🏆 ${a.title}: ${a.description}`).join('\n')
      });
    }

    return interaction.reply({ embeds: [embed] });
  }
};
