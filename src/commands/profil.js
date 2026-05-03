const { SlashCommandBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const { ensureUser, ensureSeasonSystem, checkAndAdvanceSeason, seasonSnapshotForUser, asProfileEmbed } = require('../utils/gameEngine');
const { errorEmbed } = require('../utils/guards');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profil')
    .setDescription('Kariyer profilini goruntule')
    .addUserOption((opt) => opt.setName('oyuncu').setDescription('Baska bir oyuncunun profili')),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('oyuncu') || interaction.user;

    const data = readData();
    ensureSeasonSystem(data);
    checkAndAdvanceSeason(data);

    const user = ensureUser(data, targetUser.id);
    writeData(data);

    if (!user.role || !user.character) {
      return interaction.reply({
        embeds: [errorEmbed('Profil yok', 'Bu kullanicinin aktif bir kariyeri bulunmuyor.')],
        ephemeral: true
      });
    }

    const embed = asProfileEmbed(user, targetUser, seasonSnapshotForUser(user));
    return interaction.reply({ embeds: [embed] });
  }
};
