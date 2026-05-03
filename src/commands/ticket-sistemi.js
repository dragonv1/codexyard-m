const { SlashCommandBuilder, ChannelType, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const { buildTicketPanel, setTicketSettings, DEFAULT_TICKET_PANEL_CHANNEL_ID } = require('../utils/ticketSystem');
const { isOwnerUser } = require('../utils/giveawaySystem');
const { errorEmbed } = require('../utils/guards');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-sistemi')
    .setDescription('Ticket panelini secilen kanala gonderir')
    .addChannelOption((opt) =>
      opt
        .setName('kanal')
        .setDescription('Panelin gonderilecegi kanal (bos birakilirsa varsayilan kanal kullanilir)')
        .addChannelTypes(ChannelType.GuildText)
    )
    .addStringOption((opt) =>
      opt
        .setName('kategori-id')
        .setDescription('Ticket kanallarinin acilacagi kategori ID (opsiyonel)')
        .setRequired(false)
    )
    .addRoleOption((opt) =>
      opt
        .setName('destek-rol')
        .setDescription('Ticketleri gorecek destek rolü (opsiyonel)')
        .setRequired(false)
    )
    .setDMPermission(false),

  async execute(interaction) {
    if (!isOwnerUser(interaction.user.id)) {
      return interaction.reply({
        embeds: [errorEmbed('Yetki yok', 'Bu komutu sadece bot sahibi kullanabilir.')],
        ephemeral: true
      });
    }

    if (!interaction.guild) {
      return interaction.reply({
        embeds: [errorEmbed('Sunucu gerekli', 'Bu komut sadece sunucuda kullanilabilir.')],
        ephemeral: true
      });
    }

    const selectedChannel = interaction.options.getChannel('kanal');
    const manualCategoryId = interaction.options.getString('kategori-id');
    const supportRole = interaction.options.getRole('destek-rol');

    let panelChannel = selectedChannel;
    if (!panelChannel) {
      panelChannel = interaction.guild.channels.cache.get(DEFAULT_TICKET_PANEL_CHANNEL_ID) || interaction.channel;
    }

    if (!panelChannel || panelChannel.type !== ChannelType.GuildText) {
      return interaction.reply({
        embeds: [errorEmbed('Kanal bulunamadi', 'Ticket paneli icin gecerli bir yazi kanali secmelisin.')],
        ephemeral: true
      });
    }

    const data = readData();
    setTicketSettings(data, interaction.guild.id, {
      panelChannelId: panelChannel.id,
      parentCategoryId: manualCategoryId || null,
      supportRoleId: supportRole?.id || null
    });
    writeData(data);

    const panel = buildTicketPanel();
    await panelChannel.send(panel);

    const info = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('Ticket Sistemi Aktif')
      .setDescription(`Panel gonderildi: <#${panelChannel.id}>`)
      .addFields(
        { name: 'Kategori ID', value: manualCategoryId || 'Yok (varsayilan)', inline: true },
        { name: 'Destek Rolu', value: supportRole ? `<@&${supportRole.id}>` : 'Yok', inline: true }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [info], ephemeral: true });
  }
};
