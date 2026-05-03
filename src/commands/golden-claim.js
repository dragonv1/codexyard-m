const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const { ensureUser, ensureSeasonSystem, checkAndAdvanceSeason, resolveClaim, pushHistory } = require('../utils/gameEngine');
const { errorEmbed } = require('../utils/guards');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('golden-claim')
    .setDescription('1 Golden Contract harca ve garantili efsanevi yetenek kazan'),

  async execute(interaction) {
    const data = readData();
    ensureSeasonSystem(data);
    checkAndAdvanceSeason(data);

    const user = ensureUser(data, interaction.user.id);
    if (!user.role || !user.character) {
      return interaction.reply({
        embeds: [errorEmbed('Karakter gerekli', 'Golden claim icin once kariyer olusturmalisin.')],
        ephemeral: true
      });
    }

    if (user.inventory.goldenContracts <= 0) {
      return interaction.reply({
        embeds: [errorEmbed('Golden Contract yok', 'Bu komut icin en az 1 Golden Contract gerekli.')],
        ephemeral: true
      });
    }

    user.inventory.goldenContracts -= 1;
    const result = resolveClaim(user, { source: 'golden_claim', guaranteedLegendary: true, allowReroll: false });
    pushHistory(user, `Golden Claim kullanildi: ${result.talent.label}`);
    writeData(data);

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('Golden Claim Basarili')
      .setDescription('Garantili efsanevi yetenek kazandin.')
      .addFields(
        { name: 'Yetenek', value: result.talent.label, inline: true },
        { name: 'Nadirlik', value: result.talent.rarity, inline: true },
        { name: 'Kalan Golden Contract', value: String(user.inventory.goldenContracts), inline: true }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};

