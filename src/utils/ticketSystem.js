const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { readData, writeData } = require('./dataStore');
const { isOwnerUser } = require('./giveawaySystem');

const DEFAULT_TICKET_PANEL_CHANNEL_ID = '1500539298653540505';

function ensureTicketSettings(data) {
  if (!data.ticketSettings) data.ticketSettings = {};
}

function getTicketSettings(data, guildId) {
  ensureTicketSettings(data);
  if (!data.ticketSettings[guildId]) {
    data.ticketSettings[guildId] = {
      panelChannelId: DEFAULT_TICKET_PANEL_CHANNEL_ID,
      parentCategoryId: null,
      supportRoleId: null
    };
  }
  return data.ticketSettings[guildId];
}

function setTicketSettings(data, guildId, next) {
  const settings = getTicketSettings(data, guildId);
  Object.assign(settings, next);
  return settings;
}

function buildTicketPanel() {
  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('🎫 Ticket Sistemi')
    .setDescription('Asagidan kategori secerek ticket olusturabilirsin.')
    .addFields(
      { name: 'Kategoriler', value: '• Sikayet\n• Destek\n• Oneri\n• Bug Bildirimi' },
      { name: 'Not', value: 'Her kullanici ayni anda 1 acik ticket acabilir.' }
    )
    .setFooter({ text: 'Ticket paneli' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('ticket_category_select')
      .setPlaceholder('Ticket kategorisi sec')
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel('Sikayet').setValue('sikayet').setEmoji('⚠️'),
        new StringSelectMenuOptionBuilder().setLabel('Destek').setValue('destek').setEmoji('🛠️'),
        new StringSelectMenuOptionBuilder().setLabel('Oneri').setValue('oneri').setEmoji('💡'),
        new StringSelectMenuOptionBuilder().setLabel('Bug Bildirimi').setValue('bug').setEmoji('🐞')
      )
  );

  return { embeds: [embed], components: [row] };
}

function categoryLabel(value) {
  if (value === 'sikayet') return 'Sikayet';
  if (value === 'destek') return 'Destek';
  if (value === 'oneri') return 'Oneri';
  return 'Bug Bildirimi';
}

async function createTicketChannel(interaction, category) {
  const guild = interaction.guild;
  if (!guild) return { ok: false, error: 'Sunucu bulunamadi.' };

  const data = readData();
  const settings = getTicketSettings(data, guild.id);

  const existing = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildText && c.topic && c.topic.includes(`ticketOwner:${interaction.user.id}`)
  );

  if (existing) {
    return { ok: false, error: `Zaten acik ticketin var: <#${existing.id}>` };
  }

  const cleanUser = interaction.user.username
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .slice(0, 14);

  const channelName = `ticket-${cleanUser || 'user'}`;

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: interaction.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    },
    {
      id: guild.members.me?.id || interaction.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages
      ]
    }
  ];

  if (settings.supportRoleId) {
    overwrites.push({
      id: settings.supportRoleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    });
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: settings.parentCategoryId || undefined,
    topic: `ticketOwner:${interaction.user.id}|category:${category}`,
    permissionOverwrites: overwrites
  });

  const infoEmbed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle(`Ticket Acildi | ${categoryLabel(category)}`)
    .setDescription(`${interaction.user} hos geldin. Sorununu detayli yazabilirsin.`)
    .setFooter({ text: 'Ticketi kapatmak icin alttaki butonu kullan.' })
    .setTimestamp();

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Ticket Kapat').setStyle(ButtonStyle.Danger)
  );

  await channel.send({ embeds: [infoEmbed], components: [closeRow] });
  writeData(data);

  return { ok: true, channelId: channel.id };
}

async function handleTicketCategorySelection(interaction) {
  const value = interaction.values?.[0];
  if (!value) {
    return interaction.reply({ content: 'Kategori secimi algilanamadi.', ephemeral: true });
  }

  const created = await createTicketChannel(interaction, value);
  if (!created.ok) {
    return interaction.reply({ content: created.error, ephemeral: true });
  }

  return interaction.reply({ content: `Ticket olusturuldu: <#${created.channelId}>`, ephemeral: true });
}

async function handleTicketCloseButton(interaction) {
  const channel = interaction.channel;
  if (!channel || channel.type !== ChannelType.GuildText) {
    return interaction.reply({ content: 'Bu buton burada kullanilamaz.', ephemeral: true });
  }

  const topic = channel.topic || '';
  if (!topic.includes('ticketOwner:')) {
    return interaction.reply({ content: 'Bu kanal bir ticket kanali degil.', ephemeral: true });
  }

  const ownerPart = topic.split('|').find((x) => x.startsWith('ticketOwner:'));
  const owner = ownerPart ? ownerPart.replace('ticketOwner:', '') : null;

  const isOwner = owner === interaction.user.id;
  const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) || isOwnerUser(interaction.user.id);

  if (!isOwner && !isAdmin) {
    return interaction.reply({ content: 'Ticketi kapatmak icin yetkin yok.', ephemeral: true });
  }

  await interaction.reply({ content: 'Ticket 3 saniye sonra kapatilacak.', ephemeral: true });
  setTimeout(() => {
    channel.delete('Ticket kapatildi').catch(() => null);
  }, 3000);
}

module.exports = {
  DEFAULT_TICKET_PANEL_CHANNEL_ID,
  getTicketSettings,
  setTicketSettings,
  buildTicketPanel,
  handleTicketCategorySelection,
  handleTicketCloseButton
};
