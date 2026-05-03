const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const { ensureSeasonSystem, checkAndAdvanceSeason } = require('../utils/gameEngine');
const { errorEmbed } = require('../utils/guards');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kariyer-sil')
    .setDescription('Kariyerini tamamen siler (geri alinamaz)')
    .addStringOption((opt) =>
      opt
        .setName('onay')
        .setDescription('Silme islemini onayla')
        .setRequired(true)
        .addChoices({ name: 'EVET, kariyerimi sil', value: 'EVET' })
    ),

  async execute(interaction) {
    const data = readData();
    ensureSeasonSystem(data);
    checkAndAdvanceSeason(data);

    const userId = interaction.user.id;
    if (!data.users[userId] || !data.users[userId].role || !data.users[userId].character) {
      return interaction.reply({
        embeds: [errorEmbed('Kariyer bulunamadi', 'Silinecek aktif bir kariyerin bulunmuyor.')],
        ephemeral: true
      });
    }

    const onay = interaction.options.getString('onay', true);
    if (onay !== 'EVET') {
      return interaction.reply({
        embeds: [errorEmbed('Onay hatasi', 'Kariyer silmek icin dogru onay degerini secmelisin.')],
        ephemeral: true
      });
    }

    const oldName = data.users[userId]?.character?.name || interaction.user.username;
    delete data.users[userId];
    writeData(data);

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('Kariyer Silindi')
      .setDescription(`**${oldName}** kariyeri tamamen silindi.`)
      .addFields({ name: 'Yeni Baslangic', value: 'Tekrar baslamak icin `/başla` kullanabilirsin.' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
