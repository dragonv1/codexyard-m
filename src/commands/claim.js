const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const {
  ensureUser,
  ensureSeasonSystem,
  checkAndAdvanceSeason,
  canUseCooldown,
  setCooldown,
  resolveClaim,
  pushHistory
} = require('../utils/gameEngine');
const { errorEmbed } = require('../utils/guards');
const { timeLeft } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder().setName('claim').setDescription('Claim at ve rastgele yetenek/odul al'),

  async execute(interaction) {
    const data = readData();
    ensureSeasonSystem(data);
    checkAndAdvanceSeason(data);

    const user = ensureUser(data, interaction.user.id);
    if (!user.role || !user.character) {
      return interaction.reply({
        embeds: [errorEmbed('Karakter gerekli', 'Claim icin once kariyer olusturmalisin.')],
        ephemeral: true
      });
    }

    const claimCd = canUseCooldown(user, 'claim');
    if (!claimCd.ok) {
      return interaction.reply({
        embeds: [errorEmbed('Claim hazir degil', `Kalan sure: **${timeLeft(claimCd.remainingMs)}**`)],
        ephemeral: true
      });
    }

    const result = resolveClaim(user);
    setCooldown(user, 'claim');
    pushHistory(user, `Claim odulu alindi: ${result.talent.label}`);
    writeData(data);

    const embed = new EmbedBuilder()
      .setColor(result.talent.rarity === 'Efsanevi' ? 0xf1c40f : 0x9b59b6)
      .setTitle('Claim Odulu')
      .setDescription(result.text)
      .addFields(
        { name: 'Odul', value: result.talent.label, inline: true },
        { name: 'Nadirlik', value: result.talent.rarity, inline: true },
        { name: 'Reroll Token', value: String(user.inventory.rerollTokens), inline: true },
        { name: 'Golden Contract', value: String(user.inventory.goldenContracts), inline: true }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
