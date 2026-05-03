const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { activateGiveaway, isOwnerUser } = require('../utils/giveawaySystem');
const { errorEmbed } = require('../utils/guards');

module.exports = {
  data: new SlashCommandBuilder().setName('çekiliş').setDescription('Bu kanalda otomatik 1 saatlik cekilis baslatir'),

  async execute(interaction) {
    if (!isOwnerUser(interaction.user.id)) {
      return interaction.reply({
        embeds: [errorEmbed('Yetki yok', 'Bu komutu sadece bot sahibi kullanabilir.')],
        ephemeral: true
      });
    }

    if (!interaction.guildId || !interaction.channelId) {
      return interaction.reply({
        embeds: [errorEmbed('Sunucu gerekli', 'Bu komut sadece sunucuda kullanilabilir.')],
        ephemeral: true
      });
    }

    const config = await activateGiveaway(interaction.client, {
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      type: 'normal',
      createdBy: interaction.user.id
    });

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('Cekilis Aktif')
      .setDescription(
        `Bu kanalda saatlik otomatik cekilis aktif edildi.\n` +
        `Kazanan: **${config.winnerCount} kisi**\n` +
        `Sure: **60 dakika**`
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
