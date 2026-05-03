const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const { ensureUser, ensureSeasonSystem, checkAndAdvanceSeason, canUseCooldown, setCooldown, addXp, checkAutomaticAchievements, pushHistory } = require('../utils/gameEngine');
const { errorEmbed } = require('../utils/guards');
const { randomInt, timeLeft } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder().setName('günlük').setDescription('Gunluk odulunu al'),

  async execute(interaction) {
    const data = readData();
    ensureSeasonSystem(data);
    checkAndAdvanceSeason(data);

    const user = ensureUser(data, interaction.user.id);

    if (!user.role || !user.character) {
      return interaction.reply({
        embeds: [errorEmbed('Kariyer gerekli', 'Gunluk odul icin once kariyerini olustur.')],
        ephemeral: true
      });
    }

    const cooldown = canUseCooldown(user, 'daily');
    if (!cooldown.ok) {
      return interaction.reply({
        embeds: [errorEmbed('Gunluk odul hazir degil', `Tekrar almak icin bekleme suresi: **${timeLeft(cooldown.remainingMs)}**`)],
        ephemeral: true
      });
    }

    const salary = user.economy.salaryBase + randomInt(400, 900);
    const sponsor = randomInt(500, 2500) * user.economy.sponsorshipTier;
    const xp = randomInt(20, 55);

    const money = salary + sponsor;

    user.stats.money += money;
    const levelUp = addXp(user, xp);
    setCooldown(user, 'daily');
    pushHistory(user, `Gunluk odul alindi (+${money.toLocaleString('tr-TR')} ₺, +${xp} XP).`);

    const unlocked = checkAutomaticAchievements(user);
    writeData(data);

    const embed = new EmbedBuilder()
      .setColor(0x95a5a6)
      .setTitle('Gunluk Odul Alindi')
      .addFields(
        { name: 'Maas', value: `+${salary.toLocaleString('tr-TR')} ₺`, inline: true },
        { name: 'Sponsorluk', value: `+${sponsor.toLocaleString('tr-TR')} ₺`, inline: true },
        { name: 'Toplam', value: `+${money.toLocaleString('tr-TR')} ₺`, inline: true },
        { name: 'XP', value: `+${xp}`, inline: true },
        { name: 'Seviye', value: levelUp > 0 ? `+${levelUp}` : 'Degismedi', inline: true }
      )
      .setFooter({ text: 'Yarin tekrar gelmeyi unutma' })
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
