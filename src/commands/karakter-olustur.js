const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const {
  COUNTRIES,
  POSITIONS,
  ensureUser,
  ensureSeasonSystem,
  checkAndAdvanceSeason,
  createCharacterProfile,
  getLeagueName,
  pushHistory
} = require('../utils/gameEngine');
const { errorEmbed } = require('../utils/guards');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('karakter-oluştur')
    .setDescription('Kariyer karakterini olustur')
    .addStringOption((opt) => opt.setName('isim').setDescription('Karakter ismi').setRequired(true).setMaxLength(24))
    .addIntegerOption((opt) => opt.setName('yas').setDescription('Yas').setRequired(true).setMinValue(15).setMaxValue(45))
    .addStringOption((opt) =>
      opt
        .setName('ulke')
        .setDescription('Ulke')
        .setRequired(true)
        .addChoices(...COUNTRIES.map((c) => ({ name: c, value: c })))
    )
    .addStringOption((opt) =>
      opt
        .setName('pozisyon')
        .setDescription('Pozisyon')
        .setRequired(true)
        .addChoices(...POSITIONS.map((p) => ({ name: p, value: p })))
    )
    .addAttachmentOption((opt) =>
      opt.setName('tip-foto').setDescription('Karakter tipi icin bir gorsel yukle (opsiyonel)')
    ),

  async execute(interaction) {
    const data = readData();
    ensureSeasonSystem(data);
    checkAndAdvanceSeason(data);
    const user = ensureUser(data, interaction.user.id);

    if (!user.role) {
      return interaction.reply({
        embeds: [errorEmbed('Kariyer bulunamadi', 'Once `/başla` komutuyla bir rol secmelisin.')],
        ephemeral: true
      });
    }

    if (user.character) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            'Karakter zaten var',
            'Karakterini sadece 1 kere olusturabilirsin. Sifirlamak istersen `/kariyer-sil` kullanmalisin.'
          )
        ],
        ephemeral: true
      });
    }

    const name = interaction.options.getString('isim', true);
    const age = interaction.options.getInteger('yas', true);
    const country = interaction.options.getString('ulke', true);
    const position = interaction.options.getString('pozisyon', true);
    const tipFoto = interaction.options.getAttachment('tip-foto');

    if (tipFoto && tipFoto.contentType && !tipFoto.contentType.startsWith('image/')) {
      return interaction.reply({
        embeds: [errorEmbed('Gecersiz dosya', 'Tip foto icin lutfen bir gorsel dosyasi yukle (png/jpg/webp vb.).')],
        ephemeral: true
      });
    }

    user.character = createCharacterProfile({
      name,
      age,
      country,
      position,
      tipImageUrl: tipFoto?.url || null
    });
    pushHistory(user, `Karakter olusturuldu: ${name} (${position}) - ${user.character.team}.`);

    writeData(data);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('Karakter Olusturuldu')
      .setDescription('Yeni kariyer karakterin hazir.')
      .addFields(
        { name: 'Isim', value: name, inline: true },
        { name: 'Yas', value: String(age), inline: true },
        { name: 'Ulke', value: country, inline: true },
        { name: 'Pozisyon', value: position, inline: true },
        { name: 'Takim', value: user.character.team, inline: true },
        { name: 'Rol', value: user.role, inline: true },
        { name: 'Lig', value: getLeagueName(user.season.leagueTier), inline: true },
        { name: 'Tip Foto', value: user.character.tipImageUrl ? 'Yuklendi' : 'Yok', inline: true }
      )
      .setFooter({ text: 'Futbol RP | Kariyerin basliyor' })
      .setTimestamp();

    if (user.character.tipImageUrl) {
      embed.setThumbnail(user.character.tipImageUrl);
    }

    return interaction.reply({ embeds: [embed] });
  }
};
