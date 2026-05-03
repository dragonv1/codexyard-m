const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const {
  ensureUser,
  createTransferOffer,
  applyTransferAccept,
  rejectTransfer,
  checkAutomaticAchievements,
  pushHistory
} = require('../utils/gameEngine');
const { errorEmbed } = require('../utils/guards');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transfer')
    .setDescription('Transfer tekliflerini yonet')
    .addStringOption((opt) =>
      opt
        .setName('islem')
        .setDescription('Yapilacak transfer islemi')
        .setRequired(true)
        .addChoices(
          { name: 'Teklif Olustur', value: 'teklif' },
          { name: 'Teklifi Kabul Et', value: 'kabul' },
          { name: 'Teklifi Reddet', value: 'ret' },
          { name: 'Teklif Durumu', value: 'durum' }
        )
    ),

  async execute(interaction) {
    const data = readData();
    const user = ensureUser(data, interaction.user.id);

    if (!user.role || !user.character) {
      return interaction.reply({
        embeds: [errorEmbed('Karakter gerekli', 'Transfer sistemi icin once kariyer kurmalisin.')],
        ephemeral: true
      });
    }

    if (user.role === 'kulup-sahibi') {
      return interaction.reply({
        embeds: [errorEmbed('Rol uyumsuz', 'Kulup sahibi olarak transferi `/yönetim` komutundan butce ayarlayarak yonetebilirsin.')],
        ephemeral: true
      });
    }

    const operation = interaction.options.getString('islem', true);
    const active = user.transfer.activeOffer;

    if (operation === 'teklif') {
      const offer = createTransferOffer(user);
      pushHistory(user, `Transfer teklifi geldi: ${offer.offeredClub} (${offer.amount.toLocaleString('tr-TR')} ₺)`);
      writeData(data);

      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('Yeni Transfer Teklifi')
        .setDescription(`${offer.offeredClub} seni kadrosuna katmak istiyor.`)
        .addFields(
          { name: 'Bonservis/Imza Ucreti', value: `${offer.amount.toLocaleString('tr-TR')} ₺`, inline: true },
          { name: 'Mevcut Takim', value: user.character.team, inline: true },
          { name: 'Karar', value: '`/transfer islem:kabul` veya `/transfer islem:ret`' }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (operation === 'durum') {
      if (!active) {
        return interaction.reply({
          embeds: [errorEmbed('Aktif teklif yok', 'Su anda bekleyen bir transfer teklifin bulunmuyor.')],
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Transfer Teklifi Durumu')
        .addFields(
          { name: 'Kulup', value: active.offeredClub, inline: true },
          { name: 'Tutar', value: `${active.amount.toLocaleString('tr-TR')} ₺`, inline: true }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (operation === 'kabul') {
      if (!active) {
        return interaction.reply({
          embeds: [errorEmbed('Teklif bulunamadi', 'Kabul etmek icin aktif bir teklif olmali.')],
          ephemeral: true
        });
      }

      const result = applyTransferAccept(user);
      const unlocked = checkAutomaticAchievements(user);
      pushHistory(user, `Transfer gerceklesti: ${result.oldClub} -> ${result.newClub}`);
      writeData(data);

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('Transfer Tamamlandi')
        .setDescription(`Yeni takimin: **${result.newClub}**`)
        .addFields(
          { name: 'Eski Takim', value: result.oldClub, inline: true },
          { name: 'Kazanc', value: `${result.amount.toLocaleString('tr-TR')} ₺`, inline: true }
        )
        .setTimestamp();

      if (unlocked.length > 0) {
        embed.addFields({ name: 'Yeni Basarim', value: unlocked.map((x) => `🏆 ${x.title}`).join('\n') });
      }

      return interaction.reply({ embeds: [embed] });
    }

    if (!active) {
      return interaction.reply({
        embeds: [errorEmbed('Teklif bulunamadi', 'Reddedilecek aktif bir teklif yok.')],
        ephemeral: true
      });
    }

    const rejected = rejectTransfer(user);
    pushHistory(user, `Transfer teklifi reddedildi: ${rejected.offeredClub}`);
    writeData(data);

    const embed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle('Teklif Reddedildi')
      .setDescription(`${rejected.offeredClub} teklifini geri cevirdin.`)
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
