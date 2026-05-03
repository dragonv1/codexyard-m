const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const { ensureUser, ensureSeasonSystem, checkAndAdvanceSeason, getLeagueName, pushHistory } = require('../utils/gameEngine');
const { errorEmbed } = require('../utils/guards');

const ROLE_TEXT = {
  futbolcu: 'Futbolcu',
  'teknik-direktor': 'Teknik Direktor',
  'kulup-sahibi': 'Kulup Sahibi'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('başla')
    .setDescription('Futbol RP kariyerine basla ve rolunu sec')
    .addStringOption((opt) =>
      opt
        .setName('rol')
        .setDescription('Kariyer rolun')
        .setRequired(true)
        .addChoices(
          { name: 'Futbolcu', value: 'futbolcu' },
          { name: 'Teknik Direktör', value: 'teknik-direktor' },
          { name: 'Kulüp Sahibi', value: 'kulup-sahibi' }
        )
    ),

  async execute(interaction) {
    const data = readData();
    ensureSeasonSystem(data);
    checkAndAdvanceSeason(data);

    const user = ensureUser(data, interaction.user.id);

    if (user.role) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            'Kariyer zaten baslatilmis',
            'Kullanici basina tek kariyer aktif. Profil icin `/profil`, sifirlama icin `/kariyer-sil` kullan.'
          )
        ],
        ephemeral: true
      });
    }

    const role = interaction.options.getString('rol', true);
    user.role = role;

    if (role === 'kulup-sahibi') {
      user.stats.clubBudget = 4000000;
      user.stats.transferBudget = 1200000;
      user.stats.money = 20000;
    }

    pushHistory(user, `${ROLE_TEXT[role]} olarak kariyer basladi.`);
    writeData(data);

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('Kariyer Basladi')
      .setDescription(`Rol secimin tamamlandi: **${ROLE_TEXT[role]}**`)
      .addFields(
        {
          name: 'Baslangic Ligi',
          value: getLeagueName(user.season.leagueTier),
          inline: true
        },
        {
          name: 'Sonraki Adim',
          value: 'Karakterini olusturmak icin `/karakter-oluştur` komutunu kullan.'
        }
      )
      .setFooter({ text: 'Futbol RP' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
