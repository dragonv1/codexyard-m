const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const { ensureUser, pushHistory } = require('../utils/gameEngine');
const { errorEmbed } = require('../utils/guards');
const { randomInt } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('yönetim')
    .setDescription('Kulup sahibi yonetim islemleri')
    .addStringOption((opt) =>
      opt
        .setName('islem')
        .setDescription('Yonetim adimi')
        .setRequired(true)
        .addChoices(
          { name: 'Sponsor gorusmesi', value: 'sponsor' },
          { name: 'Transfer butcesi ayarla', value: 'transfer-butce' },
          { name: 'Teknik direktor ise al', value: 'hoca-al' },
          { name: 'Teknik direktor kov', value: 'hoca-kov' }
        )
    )
    .addIntegerOption((opt) =>
      opt
        .setName('miktar')
        .setDescription('Transfer butcesi icin yeni miktar (sadece transfer butce islemi)')
        .setRequired(false)
        .setMinValue(50000)
        .setMaxValue(5000000)
    ),

  async execute(interaction) {
    const data = readData();
    const user = ensureUser(data, interaction.user.id);

    if (!user.role || !user.character) {
      return interaction.reply({
        embeds: [errorEmbed('Karakter gerekli', 'Once kariyer olusturmalisin.')],
        ephemeral: true
      });
    }

    if (user.role !== 'kulup-sahibi') {
      return interaction.reply({
        embeds: [errorEmbed('Yetki yok', 'Bu komut sadece Kulup Sahibi rolunde kullanilir.')],
        ephemeral: true
      });
    }

    const op = interaction.options.getString('islem', true);
    const amount = interaction.options.getInteger('miktar');

    const embed = new EmbedBuilder().setColor(0xe91e63).setTitle('Yonetim Islem Sonucu').setTimestamp();

    if (op === 'sponsor') {
      const sponsor = randomInt(12000, 70000);
      user.stats.clubBudget += sponsor;
      user.stats.money += Math.floor(sponsor * 0.05);
      pushHistory(user, `Sponsor anlasmasi: +${sponsor.toLocaleString('tr-TR')} ₺`);
      embed.setDescription('Yeni sponsorluk imzalandi.').addFields({
        name: 'Kulup Kasasi',
        value: `+${sponsor.toLocaleString('tr-TR')} ₺`
      });
    }

    if (op === 'transfer-butce') {
      if (!amount) {
        return interaction.reply({
          embeds: [errorEmbed('Miktar eksik', 'Bu islem icin `miktar` girmen gerekiyor.')],
          ephemeral: true
        });
      }

      user.stats.transferBudget = amount;
      pushHistory(user, `Transfer butcesi ayarlandi: ${amount.toLocaleString('tr-TR')} ₺`);
      embed
        .setDescription('Transfer butcesi guncellendi.')
        .addFields({ name: 'Yeni Butce', value: `${amount.toLocaleString('tr-TR')} ₺` });
    }

    if (op === 'hoca-al') {
      const salary = randomInt(8000, 25000);
      user.stats.clubBudget -= salary;
      pushHistory(user, `Yeni teknik direktor ise alindi. Maas: ${salary.toLocaleString('tr-TR')} ₺`);
      embed
        .setDescription('Yeni teknik direktor goreve basladi.')
        .addFields({ name: 'Ilk Maas Maliyeti', value: `-${salary.toLocaleString('tr-TR')} ₺` });
    }

    if (op === 'hoca-kov') {
      const penalty = randomInt(10000, 40000);
      user.stats.clubBudget -= penalty;
      pushHistory(user, `Teknik direktor kovuldu. Tazminat: ${penalty.toLocaleString('tr-TR')} ₺`);
      embed
        .setDescription('Teknik direktorun gorevine son verildi.')
        .addFields({ name: 'Tazminat', value: `-${penalty.toLocaleString('tr-TR')} ₺` });
    }

    embed.addFields(
      { name: 'Kulup Butcesi', value: `${user.stats.clubBudget.toLocaleString('tr-TR')} ₺`, inline: true },
      { name: 'Transfer Butcesi', value: `${user.stats.transferBudget.toLocaleString('tr-TR')} ₺`, inline: true }
    );

    writeData(data);
    return interaction.reply({ embeds: [embed] });
  }
};
