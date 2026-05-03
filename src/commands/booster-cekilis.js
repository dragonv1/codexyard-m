const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { activateGiveaway, isOwnerUser } = require('../utils/giveawaySystem');
const { errorEmbed } = require('../utils/guards');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('booster-çekiliş')
    .setDescription('Bu kanalda saatlik booster cekilisi baslatir (daha fazla odul)'),

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
      type: 'booster',
      createdBy: interaction.user.id
    });

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('Booster Cekilisi Aktif')
      .setDescription(
        `Bu kanalda saatlik booster cekilisi aktif edildi.\n` +
        `Kazanan: **${config.winnerCount} kisi**\n` +
        `Sure: **60 dakika**\n` +
        `Odul: Daha guclu yetenek + bonus para`
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
