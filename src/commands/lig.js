const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const { ensureSeasonSystem, checkAndAdvanceSeason, ensureUser, LEAGUE_TIERS } = require('../utils/gameEngine');
const { timeLeft } = require('../utils/helpers');

function tierTable(data, tier) {
  const users = Object.entries(data.users)
    .map(([id]) => ensureUser(data, id))
    .filter((u) => u.character && u.season.leagueTier === tier)
    .sort((a, b) => b.season.leaguePoints - a.season.leaguePoints || b.season.arenaPoints - a.season.arenaPoints)
    .slice(0, 8);

  if (users.length === 0) return 'Henuz oyuncu yok.';

  return users
    .map((u, idx) => `${idx + 1}. ${u.character.name} | LP:${u.season.leaguePoints} | AP:${u.season.arenaPoints}`)
    .join('\n');
}

module.exports = {
  data: new SlashCommandBuilder().setName('lig').setDescription('Gercek zamanli lig tablosunu gosterir'),

  async execute(interaction) {
    const data = readData();
    ensureSeasonSystem(data);
    const seasonReport = checkAndAdvanceSeason(data);

    const superLig = tierTable(data, 1);
    const lig1 = tierTable(data, 2);
    const lig2 = tierTable(data, 3);

    const remainingMs = Math.max(0, data.seasonSystem.endsAt - Date.now());

    writeData(data);

    const embed = new EmbedBuilder()
      .setColor(0x1abc9c)
      .setTitle(`Lig Tablosu | Sezon ${data.seasonSystem.currentSeason}`)
      .setDescription(`Sezon bitimine: **${timeLeft(remainingMs)}**`)
      .addFields(
        { name: `🏆 ${LEAGUE_TIERS[1]}`, value: superLig },
        { name: `🥈 ${LEAGUE_TIERS[2]}`, value: lig1 },
        { name: `🥉 ${LEAGUE_TIERS[3]}`, value: lig2 }
      )
      .setFooter({ text: 'Haftalik sezon aktif (7 gun)' })
      .setTimestamp();

    if (seasonReport) {
      embed.addFields({
        name: 'Sezon Sonu',
        value: `Yeni sezon basladi. Gecen sezon sampiyonu: **${seasonReport.champion}**`
      });
    }

    return interaction.reply({ embeds: [embed] });
  }
};
