const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const { ensureUser, pushHistory } = require('../utils/gameEngine');
const { errorEmbed } = require('../utils/guards');
const { randomInt, clamp } = require('../utils/helpers');

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
          { name: 'Teknik direktor kov', value: 'hoca-kov' },
          { name: 'Altyapi yatirimi', value: 'altyapi-yatirimi' },
          { name: 'Tesis gelistir', value: 'tesis-gelistir' },
          { name: 'Mac primi dagit', value: 'prim-dagit' }
        )
    )
    .addIntegerOption((opt) =>
      opt
        .setName('miktar')
        .setDescription('Transfer butcesi / prim miktari')
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
      user.stats.morale = clamp(user.stats.morale + 2, 10, 100);
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
      user.stats.pressure = clamp(user.stats.pressure - 6, 0, 100);
      user.stats.teamChemistry = clamp(user.stats.teamChemistry + 3, 0, 100);
      pushHistory(user, `Yeni teknik direktor ise alindi. Maas: ${salary.toLocaleString('tr-TR')} ₺`);
      embed
        .setDescription('Yeni teknik direktor goreve basladi.')
        .addFields({ name: 'Ilk Maas Maliyeti', value: `-${salary.toLocaleString('tr-TR')} ₺` });
    }

    if (op === 'hoca-kov') {
      const penalty = randomInt(10000, 40000);
      user.stats.clubBudget -= penalty;
      user.stats.pressure = clamp(user.stats.pressure + 10, 0, 100);
      user.stats.teamChemistry = clamp(user.stats.teamChemistry - 4, 0, 100);
      pushHistory(user, `Teknik direktor kovuldu. Tazminat: ${penalty.toLocaleString('tr-TR')} ₺`);
      embed
        .setDescription('Teknik direktorun gorevine son verildi.')
        .addFields({ name: 'Tazminat', value: `-${penalty.toLocaleString('tr-TR')} ₺` });
    }

    if (op === 'altyapi-yatirimi') {
      const cost = randomInt(30000, 90000);
      const moraleBoost = randomInt(2, 6);
      const overallBoost = randomInt(0, 1);
      user.stats.clubBudget -= cost;
      user.stats.morale = clamp(user.stats.morale + moraleBoost, 10, 100);
      user.stats.overall = clamp(user.stats.overall + overallBoost, 40, 99);
      pushHistory(user, `Altyapi yatirimi yapildi. Maliyet: ${cost.toLocaleString('tr-TR')} ₺`);
      embed
        .setDescription('Altyapi yatirimi tamamlandi, gelecek nesil guclendi.')
        .addFields(
          { name: 'Maliyet', value: `-${cost.toLocaleString('tr-TR')} ₺`, inline: true },
          { name: 'Moral Etkisi', value: `+${moraleBoost}`, inline: true },
          { name: 'Overall Etkisi', value: `+${overallBoost}`, inline: true }
        );
    }

    if (op === 'tesis-gelistir') {
      const cost = randomInt(45000, 120000);
      const formBoost = randomInt(3, 7);
      const chemistryBoost = randomInt(2, 5);
      user.stats.clubBudget -= cost;
      user.stats.form = clamp(user.stats.form + formBoost, 10, 100);
      user.stats.teamChemistry = clamp(user.stats.teamChemistry + chemistryBoost, 0, 100);
      pushHistory(user, `Tesis gelistirildi. Maliyet: ${cost.toLocaleString('tr-TR')} ₺`);
      embed
        .setDescription('Antrenman tesisleri gelistirildi.')
        .addFields(
          { name: 'Maliyet', value: `-${cost.toLocaleString('tr-TR')} ₺`, inline: true },
          { name: 'Form Etkisi', value: `+${formBoost}`, inline: true },
          { name: 'Takim Uyum Etkisi', value: `+${chemistryBoost}`, inline: true }
        );
    }

    if (op === 'prim-dagit') {
      const bonus = amount || randomInt(60000, 180000);
      const moraleBoost = randomInt(4, 9);
      user.stats.clubBudget -= bonus;
      user.stats.morale = clamp(user.stats.morale + moraleBoost, 10, 100);
      user.stats.form = clamp(user.stats.form + 2, 10, 100);
      pushHistory(user, `Mac primi dagitildi: ${bonus.toLocaleString('tr-TR')} ₺`);
      embed
        .setDescription('Takima mac primi dagitildi, motivasyon artti.')
        .addFields(
          { name: 'Prim Butcesi', value: `-${bonus.toLocaleString('tr-TR')} ₺`, inline: true },
          { name: 'Moral', value: `+${moraleBoost}`, inline: true }
        );
    }

    user.stats.clubBudget = Math.max(0, user.stats.clubBudget);

    embed.addFields(
      { name: 'Kulup Butcesi', value: `${user.stats.clubBudget.toLocaleString('tr-TR')} ₺`, inline: true },
      { name: 'Transfer Butcesi', value: `${user.stats.transferBudget.toLocaleString('tr-TR')} ₺`, inline: true },
      { name: 'Takim Uyum', value: String(user.stats.teamChemistry), inline: true }
    );

    writeData(data);
    return interaction.reply({ embeds: [embed] });
  }
};
