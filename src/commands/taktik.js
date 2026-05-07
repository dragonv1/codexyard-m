const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const { TACTICS, ensureUser, pushHistory } = require('../utils/gameEngine');
const { errorEmbed } = require('../utils/guards');
const { clamp } = require('../utils/helpers');

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
    )
    .addStringOption((opt) =>
      opt
        .setName('toplanti')
        .setDescription('Mac oncesi takim toplantisi sec')
        .setRequired(false)
        .addChoices(
          { name: 'Motivasyon konusmasi', value: 'motivasyon' },
          { name: 'Disiplin toplantisi', value: 'disiplin' },
          { name: 'Hucum odak', value: 'hucum' },
          { name: 'Savunma odak', value: 'savunma' }
        )
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
    const meeting = interaction.options.getString('toplanti') || 'motivasyon';
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

    let meetingNote = 'Takim motivasyonu yuksek tutuldu.';
    if (meeting === 'motivasyon') {
      user.stats.morale = clamp(user.stats.morale + 5, 10, 100);
      user.stats.teamChemistry = clamp(user.stats.teamChemistry + 3, 0, 100);
      meetingNote = 'Motivasyon zirveye cekildi.';
    } else if (meeting === 'disiplin') {
      user.stats.teamChemistry = clamp(user.stats.teamChemistry + 5, 0, 100);
      user.stats.form = clamp(user.stats.form - 1, 10, 100);
      meetingNote = 'Disiplin artti, oyuncular daha kontrollu.';
    } else if (meeting === 'hucum') {
      user.stats.form = clamp(user.stats.form + 4, 10, 100);
      user.stats.pressure = clamp(user.stats.pressure + 2, 0, 100);
      meetingNote = 'Hucum gucu artirildi, risk de buyudu.';
    } else if (meeting === 'savunma') {
      user.stats.teamChemistry = clamp(user.stats.teamChemistry + 4, 0, 100);
      user.stats.pressure = clamp(user.stats.pressure - 3, 0, 100);
      meetingNote = 'Savunma bloklari sikilastirildi.';
    }

    pushHistory(user, `Taktik guncellendi: ${tactic} | Toplanti: ${meeting}`);
    writeData(data);

    const embed = new EmbedBuilder()
      .setColor(0x7289da)
      .setTitle('Taktik Guncellendi')
      .addFields(
        { name: 'Dizilim', value: tactic, inline: true },
        { name: 'Toplanti', value: meeting, inline: true },
        {
          name: 'Ilk 11',
          value: firstEleven.length > 0 ? firstEleven.join(', ') : 'Belirlenmedi'
        },
        { name: 'Toplanti Etkisi', value: meetingNote },
        { name: 'Moral', value: String(user.stats.morale), inline: true },
        { name: 'Takim Uyum', value: String(user.stats.teamChemistry), inline: true },
        { name: 'Baski', value: String(user.stats.pressure), inline: true }
      )
      .setFooter({ text: 'Yonetim baskisini dusurmek icin galibiyet gerekiyor' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
