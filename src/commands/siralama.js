const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const { ensureSeasonSystem, checkAndAdvanceSeason, ensureNpcPlayers, ensureUser, getLeagueName } = require('../utils/gameEngine');

function ratingScore(entry) {
  return entry.overall * 5 + entry.level * 8 + entry.goals * 4 + entry.assists * 3 + entry.arenaPoints * 2;
}

module.exports = {
  data: new SlashCommandBuilder().setName('sıralama').setDescription('En iyi oyunculari ve arena liderlerini listele'),

  async execute(interaction) {
    const data = readData();
    ensureSeasonSystem(data);
    checkAndAdvanceSeason(data);
    ensureNpcPlayers(data);

    const realPlayers = Object.entries(data.users)
      .map(([id]) => ensureUser(data, id))
      .filter((u) => u?.character)
      .map((u) => ({
        name: u.character.name,
        overall: u.stats.overall,
        goals: u.stats.goals,
        assists: u.stats.assists,
        level: u.stats.level,
        club: u.character.team,
        league: getLeagueName(u.season.leagueTier),
        arenaPoints: u.season.arenaPoints,
        score: ratingScore({
          overall: u.stats.overall,
          goals: u.stats.goals,
          assists: u.stats.assists,
          level: u.stats.level,
          arenaPoints: u.season.arenaPoints
        })
      }));

    const npc = data.npcPlayers.map((n) => ({
      ...n,
      arenaPoints: 0,
      league: 'NPC',
      score: ratingScore({ ...n, arenaPoints: 0 })
    }));

    const top = [...realPlayers, ...npc]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(
        (p, i) =>
          `${i + 1}. ${p.name} (${p.club})\nOverall:${p.overall} | Sv:${p.level} | AP:${p.arenaPoints} | Lig:${p.league}`
      )
      .join('\n\n');

    const arenaLadder = realPlayers
      .sort((a, b) => b.arenaPoints - a.arenaPoints)
      .slice(0, 10)
      .map((p, i) => `${i + 1}. ${p.name} - ${p.arenaPoints} AP`)
      .join('\n');

    writeData(data);

    const embed = new EmbedBuilder()
      .setColor(0xffc300)
      .setTitle('Genel Siralama')
      .setDescription(top || 'Henuz oyuncu yok.')
      .addFields({ name: 'Arena Liderlik', value: arenaLadder || 'Henuz arena puani yok.' })
      .setFooter({ text: 'Rekabet sistemi aktif' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
