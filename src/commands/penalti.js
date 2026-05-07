const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const {
  ensureUser,
  ensureSeasonSystem,
  checkAndAdvanceSeason,
  canUseCooldown,
  setCooldown,
  runPenaltyChallenge,
  checkAutomaticAchievements,
  pushHistory
} = require('../utils/gameEngine');
const { errorEmbed } = require('../utils/guards');
const { timeLeft } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder().setName('penaltı').setDescription('5 vurusluk penalti antremani yap'),

  async execute(interaction) {
    const data = readData();
    ensureSeasonSystem(data);
    checkAndAdvanceSeason(data);

    const user = ensureUser(data, interaction.user.id);
    if (!user.role || !user.character) {
      return interaction.reply({
        embeds: [errorEmbed('Karakter gerekli', 'Penalti icin once kariyer olusturmalisin.')],
        ephemeral: true
      });
    }

    const penaltyCd = canUseCooldown(user, 'penalty');
    if (!penaltyCd.ok) {
      return interaction.reply({
        embeds: [errorEmbed('Penalti hazir degil', `Tekrar denemek icin: **${timeLeft(penaltyCd.remainingMs)}**`)],
        ephemeral: true
      });
    }

    const result = runPenaltyChallenge(user);
    setCooldown(user, 'penalty');
    pushHistory(user, `Penalti antremani: ${result.goals}/${result.totalShots} (${result.result})`);
    const unlocked = checkAutomaticAchievements(user);
    writeData(data);

    const embed = new EmbedBuilder()
      .setColor(result.goals >= 4 ? 0x2ecc71 : result.goals >= 3 ? 0xf1c40f : 0xe67e22)
      .setTitle('Penalti Sonucu')
      .setDescription(`Skor: **${result.goals}/${result.totalShots}** (${result.result})`)
      .addFields(
        { name: 'Vuruslar', value: result.shots.join('\n') },
        {
          name: 'Kazanc',
          value: `+${result.moneyGain.toLocaleString('tr-TR')} ₺\n+${result.xpGain} XP`,
          inline: true
        },
        {
          name: 'Gelisim',
          value: `Form: +${result.formGain}\nMoral: ${result.moraleGain >= 0 ? '+' : ''}${result.moraleGain}`,
          inline: true
        },
        {
          name: 'Seviye',
          value: result.leveledUp > 0 ? `+${result.leveledUp}` : 'Degismedi',
          inline: true
        }
      )
      .setFooter({ text: 'Overall 90+ oyuncular penalti antremaninda cok daha istikrarli olur.' })
      .setTimestamp();

    if (unlocked.length > 0) {
      embed.addFields({
        name: 'Yeni Basarimlar',
        value: unlocked.map((x) => `🏆 ${x.title}`).join('\n')
      });
    }

    return interaction.reply({ embeds: [embed] });
  }
};

