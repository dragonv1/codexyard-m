const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const { TACTICS, ensureUser, pushHistory } = require('../utils/gameEngine');
const { errorEmbed } = require('../utils/guards');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('taktik')
    .setDescription('Teknik direktor icin taktik ayarla')
    .addStringOption((opt) =>
      opt
        .setName('dizilim')
        .setDescription('Takim taktigi')
        .setRequired(true)
        .addChoices(...TACTICS.map((t) => ({ name: t, value: t })))
    )
    .addStringOption((opt) =>
      opt.setName('ilk11').setDescription('Ilk 11 oyuncularini virgulle yaz (ornek: Ali,Veli,Can,...)').setRequired(false)
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

    if (user.role !== 'teknik-direktor') {
      return interaction.reply({
        embeds: [errorEmbed('Yetki yok', 'Bu komut sadece Teknik Direktör rolunde kullanilir.')],
        ephemeral: true
      });
    }

    const tactic = interaction.options.getString('dizilim', true);
    const firstElevenRaw = interaction.options.getString('ilk11');
    let firstEleven = user.squad.firstEleven;

    if (firstElevenRaw) {
      firstEleven = firstElevenRaw
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 11);
      user.squad.firstEleven = firstEleven;
    }

    user.squad.tactic = tactic;
    pushHistory(user, `Taktik guncellendi: ${tactic}`);
    writeData(data);

    const embed = new EmbedBuilder()
      .setColor(0x7289da)
      .setTitle('Taktik Guncellendi')
      .addFields(
        { name: 'Dizilim', value: tactic, inline: true },
        {
          name: 'Ilk 11',
          value: firstEleven.length > 0 ? firstEleven.join(', ') : 'Belirlenmedi'
        }
      )
      .setFooter({ text: 'Yonetim baskisini dusurmek icin galibiyet gerekiyor' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
