const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const { ensureSeasonSystem, checkAndAdvanceSeason } = require('../utils/gameEngine');
const { getGuildPrefix, setGuildPrefix } = require('../utils/guildSettings');
const { errorEmbed } = require('../utils/guards');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('Sunucu prefix ayarini goruntule veya degistir')
    .addStringOption((opt) =>
      opt
        .setName('deger')
        .setDescription('Yeni prefix (1-5 karakter)')
        .setRequired(false)
        .setMinLength(1)
        .setMaxLength(5)
    )
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.guildId) {
      return interaction.reply({
        embeds: [errorEmbed('Sunucu gerekli', 'Bu komut sadece sunucuda kullanilabilir.')],
        ephemeral: true
      });
    }

    const data = readData();
    ensureSeasonSystem(data);
    checkAndAdvanceSeason(data);

    const current = getGuildPrefix(data, interaction.guildId);
    const newValueRaw = interaction.options.getString('deger');

    if (!newValueRaw) {
      writeData(data);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('Prefix Ayari')
            .setDescription(`Bu sunucunun aktif prefix degeri: **${current}**`)
            .setTimestamp()
        ],
        ephemeral: true
      });
    }

    const hasPerm = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
      interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

    if (!hasPerm) {
      return interaction.reply({
        embeds: [errorEmbed('Yetki yok', 'Prefix degistirmek icin `Sunucuyu Yonet` yetkisi gerekiyor.')],
        ephemeral: true
      });
    }

    const newValue = newValueRaw.trim();
    if (newValue.includes(' ')) {
      return interaction.reply({
        embeds: [errorEmbed('Gecersiz prefix', 'Prefix bosluk iceremez.')],
        ephemeral: true
      });
    }

    setGuildPrefix(data, interaction.guildId, newValue);
    writeData(data);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('Prefix Guncellendi')
          .setDescription(`Yeni prefix: **${newValue}**\nYardim icin: \`${newValue}yardim\``)
          .setTimestamp()
      ]
    });
  }
};
