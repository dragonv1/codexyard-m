const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const {
  CLUBS,
  ensureUser,
  ensureLeague,
  ensureSeasonSystem,
  checkAndAdvanceSeason,
  canUseCooldown,
  setCooldown,
  simulateFootballerMatch,
  simulateCoachMatch,
  simulateOwnerCycle,
  applyMatchOutcome,
  checkAutomaticAchievements,
  applyChoiceEffect,
  pushHistory
} = require('../utils/gameEngine');
const { errorEmbed } = require('../utils/guards');
const { timeLeft, pickRandom } = require('../utils/helpers');

function updateLeague(league, teamA, teamB, goalsA, goalsB) {
  const a = league.clubs[teamA];
  const b = league.clubs[teamB];
  if (!a || !b) return;

  a.played += 1;
  b.played += 1;
  a.goalsFor += goalsA;
  a.goalsAgainst += goalsB;
  b.goalsFor += goalsB;
  b.goalsAgainst += goalsA;

  if (goalsA > goalsB) {
    a.wins += 1;
    b.losses += 1;
    a.points += 3;
  } else if (goalsA < goalsB) {
    b.wins += 1;
    a.losses += 1;
    b.points += 3;
  } else {
    a.draws += 1;
    b.draws += 1;
    a.points += 1;
    b.points += 1;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('maç')
    .setDescription('Mac oyna ve kariyerini ilerlet')
    .addStringOption((opt) =>
      opt
        .setName('aksiyon')
        .setDescription('Mac icinde odaklanacagin hamle')
        .setRequired(true)
        .addChoices(
          { name: 'Sut', value: 'sut' },
          { name: 'Pas', value: 'pas' },
          { name: 'Dripling', value: 'dripling' }
        )
    )
    .addStringOption((opt) =>
      opt
        .setName('karar')
        .setDescription('Hikaye secimi (hayati etkiler)')
        .setRequired(false)
        .addChoices(
          { name: 'Basina ters konus', value: 'basina-ters' },
          { name: 'Takimla odakli kal', value: 'takim-odakli' },
          { name: 'Pas vermemeyi sec', value: 'pas-vermeme' },
          { name: 'Gece hayati', value: 'gece-hayati' }
        )
    ),

  async execute(interaction) {
    const data = readData();
    ensureSeasonSystem(data);
    const seasonReport = checkAndAdvanceSeason(data);
    ensureLeague(data);

    const user = ensureUser(data, interaction.user.id);

    if (!user.role || !user.character) {
      return interaction.reply({
        embeds: [errorEmbed('Karakter gerekli', 'Mac oynamak icin once kariyerini kurmalisin.')],
        ephemeral: true
      });
    }

    const cooldown = canUseCooldown(user, 'match');
    if (!cooldown.ok) {
      return interaction.reply({
        embeds: [errorEmbed('Mac hazir degil', `Yeni mac icin kalan sure: **${timeLeft(cooldown.remainingMs)}**`)],
        ephemeral: true
      });
    }

    if (Date.now() < user.status.injuredUntil) {
      return interaction.reply({
        embeds: [errorEmbed('Sakatlik suruyor', 'Sakatligin devam ediyor. Bir sure dinlenmen gerekiyor.')],
        ephemeral: true
      });
    }

    const action = interaction.options.getString('aksiyon', true);
    const choice = interaction.options.getString('karar') || 'takim-odakli';
    const choiceEffect = applyChoiceEffect(user, choice);

    let outcome;
    if (user.role === 'futbolcu') {
      outcome = simulateFootballerMatch(user, action);
    } else if (user.role === 'teknik-direktor') {
      outcome = simulateCoachMatch(user);
    } else {
      outcome = simulateOwnerCycle(user);
    }

    const rewards = applyMatchOutcome(user, outcome);
    setCooldown(user, 'match');

    const opponentClub = pickRandom(CLUBS.filter((c) => c !== user.character.team));

    if (outcome.scoreline) {
      const [myGoals, oppGoals] = outcome.scoreline.split(' - ').map(Number);
      updateLeague(data.league, user.character.team, opponentClub, myGoals, oppGoals);
    }

    if (outcome.mode === 'futbolcu') {
      pushHistory(user, `Mac: ${user.character.team} ${outcome.scoreline} ${opponentClub} | ${outcome.resultText}`);
    } else if (outcome.mode === 'teknik-direktor') {
      pushHistory(user, `Teknik direktor maci: ${user.character.team} ${outcome.scoreline} ${opponentClub}`);
    } else {
      pushHistory(user, `Kulup yonetimi dongusu: Net ${outcome.net.toLocaleString('tr-TR')} ₺`);
    }

    const unlocked = checkAutomaticAchievements(user);
    writeData(data);

    const embed = new EmbedBuilder().setColor(0xf1c40f).setTitle('Mac Sonucu').setTimestamp();

    if (outcome.mode === 'futbolcu') {
      embed
        .setDescription(`${user.character.team} vs ${opponentClub}\nSkor: **${outcome.scoreline}** (${outcome.resultText})`)
        .addFields(
          { name: 'Mac Olaylari', value: outcome.minuteEvents.slice(0, 8).join('\n') || 'Olay yok' },
          { name: 'Kisisel Performans', value: `Gol: ${outcome.goalsScored}\nAsist: ${outcome.assists}` },
          { name: 'Basin', value: `"${outcome.pressQuote}"` },
          { name: 'Sosyal Medya', value: outcome.socialEvent },
          { name: 'Sakatlik', value: outcome.gotInjury ? 'Var, performansin etkilendi.' : 'Yok', inline: true },
          {
            name: 'Odul',
            value:
              `+${outcome.rewardMoney.toLocaleString('tr-TR')} ₺\n` +
              `+${outcome.rewardXp} XP\n` +
              `Maas: +${rewards.salaryGain.toLocaleString('tr-TR')} ₺\n` +
              `Bonus: +${rewards.performanceBonus.toLocaleString('tr-TR')} ₺`,
            inline: true
          },
          { name: 'Seviye', value: rewards.leveledUp > 0 ? `+${rewards.leveledUp}` : 'Degismedi', inline: true },
          {
            name: 'Hikaye Karari',
            value: `${choiceEffect.label}\n${choiceEffect.note}`
          }
        );
    }

    if (outcome.mode === 'teknik-direktor') {
      embed
        .setDescription(`${user.character.team} vs ${opponentClub}\nSkor: **${outcome.scoreline}**`)
        .addFields(
          { name: 'Taktik', value: outcome.tactic, inline: true },
          { name: 'Yonetim Baskisi', value: String(user.stats.pressure), inline: true },
          { name: 'Yonetim Notu', value: outcome.managementNote },
          { name: 'Odul', value: `+${outcome.rewardMoney.toLocaleString('tr-TR')} ₺ | +${outcome.rewardXp} XP` }
        );
    }

    if (outcome.mode === 'kulup-sahibi') {
      embed
        .setDescription('Kulup sahibi olarak yonetim dongusu tamamlandi.')
        .addFields(
          { name: 'Olay', value: outcome.event },
          { name: 'Sponsorluk Geliri', value: `+${outcome.sponsorGain.toLocaleString('tr-TR')} ₺`, inline: true },
          { name: 'Gider', value: `-${outcome.cost.toLocaleString('tr-TR')} ₺`, inline: true },
          { name: 'Net', value: `${outcome.net >= 0 ? '+' : ''}${outcome.net.toLocaleString('tr-TR')} ₺`, inline: true },
          { name: 'Transfer Butcesi Etkisi', value: `${outcome.transferBudgetShift >= 0 ? '+' : ''}${outcome.transferBudgetShift.toLocaleString('tr-TR')} ₺` },
          { name: 'XP', value: `+${outcome.rewardXp}` }
        );
    }

    if (seasonReport) {
      embed.addFields({
        name: 'Sezon Sonu Duyurusu',
        value: `Yeni sezon basladi. Sampiyon: **${seasonReport.champion}**`
      });
    }

    if (unlocked.length > 0) {
      embed.addFields({
        name: 'Yeni Basarimlar',
        value: unlocked.map((a) => `🏆 ${a.title}`).join('\n')
      });
    }

    return interaction.reply({ embeds: [embed] });
  }
};
