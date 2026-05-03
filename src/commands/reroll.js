const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const { ensureUser, ensureSeasonSystem, checkAndAdvanceSeason, rerollLastClaim, pushHistory } = require('../utils/gameEngine');
const { errorEmbed } = require('../utils/guards');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reroll')
    .setDescription('Son claim yetenegini 1 Reroll Token harcayarak degistir'),

  async execute(interaction) {
    const data = readData();
    ensureSeasonSystem(data);
    checkAndAdvanceSeason(data);

    const user = ensureUser(data, interaction.user.id);
    if (!user.role || !user.character) {
      return interaction.reply({
        embeds: [errorEmbed('Karakter gerekli', 'Reroll icin once kariyer olusturmalisin.')],
        ephemeral: true
      });
    }

    const outcome = rerollLastClaim(user);
    if (!outcome.ok) {
      if (outcome.reason === 'no_reroll_token') {
        return interaction.reply({
          embeds: [errorEmbed('Reroll Token yok', 'Reroll icin en az 1 token gerekli.')],
          ephemeral: true
        });
      }

      if (outcome.reason === 'no_last_claim') {
        return interaction.reply({
          embeds: [errorEmbed('Reroll yapilamadi', 'Once /claim atip bir yetenek kazanmalisin.')],
          ephemeral: true
        });
      }

      return interaction.reply({
        embeds: [errorEmbed('Reroll yapilamadi', 'Bu odul reroll icin uygun degil.')],
        ephemeral: true
      });
    }

    pushHistory(
      user,
      `Reroll kullanildi: ${outcome.previous.talentLabel} -> ${outcome.result.talent.label} (Kalan: ${user.inventory.rerollTokens})`
    );
    writeData(data);

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('Reroll Basarili')
      .setDescription('Eski yetenek degistirildi ve yeni talent uygulandi.')
      .addFields(
        { name: 'Eski Yetenek', value: outcome.previous.talentLabel, inline: true },
        { name: 'Yeni Yetenek', value: outcome.result.talent.label, inline: true },
        { name: 'Nadirlik', value: outcome.result.talent.rarity, inline: true },
        { name: 'Kalan Reroll Token', value: String(user.inventory.rerollTokens), inline: true }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};

