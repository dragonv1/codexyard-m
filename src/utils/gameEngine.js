const { EmbedBuilder } = require('discord.js');
const {
  CLUBS,
  POSITIONS,
  COUNTRIES,
  TACTICS,
  LEAGUE_TIERS,
  OWNER_EVENTS,
  PRESS_QUOTES,
  RANDOM_EVENTS,
  NPC_ARCHETYPES,
  CLAIM_TALENTS,
  ACHIEVEMENTS
} = require('./constants');
const { randomInt, pickRandom, clamp, dayKey } = require('./helpers');

const COOLDOWNS = {
  training: 1000 * 60 * 60,
  penalty: 1000 * 60 * 60,
  match: 1000 * 60 * 20,
  daily: 1000 * 60 * 60 * 24,
  claim: 1000 * 60 * 30,
  friendly: 1000 * 60 * 20,
  arena: 1000 * 60 * 10,
  vote: 1000 * 60 * 12
};

const MAX_ARENA_ATTACKS = 6;
const SEASON_DAYS = 7;

function now() {
  return Date.now();
}

function xpToLevel(level) {
  return 100 + level * 75;
}

function seasonDurationMs(days = SEASON_DAYS) {
  return days * 24 * 60 * 60 * 1000;
}

function createEmptyUser(id) {
  return {
    id,
    role: null,
    createdAt: now(),
    character: null,
    stats: {
      overall: 60,
      form: 50,
      morale: 50,
      teamChemistry: 55,
      money: 5000,
      xp: 0,
      level: 1,
      goals: 0,
      assists: 0,
      matches: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      trainings: 0,
      injuries: 0,
      socialMedia: 0,
      pressure: 50,
      clubBudget: 1000000,
      transferBudget: 350000
    },
    economy: {
      salaryBase: 2200,
      sponsorshipTier: 1,
      managerBonus: 0
    },
    squad: {
      tactic: pickRandom(TACTICS),
      firstEleven: []
    },
    status: {
      injuredUntil: 0
    },
    cooldowns: {
      training: 0,
      penalty: 0,
      match: 0,
      daily: 0,
      claim: 0,
      friendly: 0,
      arena: 0,
      vote: 0
    },
    transfer: {
      activeOffer: null
    },
    inventory: {
      rerollTokens: 0,
      goldenContracts: 0
    },
    claimState: {
      lastClaim: null
    },
    skillTree: {
      paths: {
        finishing: 0,
        vision: 0,
        speed: 0
      },
      talents: []
    },
    season: {
      leagueTier: 3,
      leaguePoints: 0,
      arenaPoints: 0,
      arenaWins: 0,
      arenaLosses: 0,
      friendlyWins: 0,
      friendlyLosses: 0,
      remainingAttacks: MAX_ARENA_ATTACKS,
      lastAttackResetDay: dayKey()
    },
    achievements: [],
    careerHistory: []
  };
}

function normalizeUser(user) {
  const normalized = { ...createEmptyUser(user.id || 'tmp'), ...user };
  normalized.stats = { ...createEmptyUser('tmp').stats, ...(user.stats || {}) };
  normalized.economy = { ...createEmptyUser('tmp').economy, ...(user.economy || {}) };
  normalized.squad = { ...createEmptyUser('tmp').squad, ...(user.squad || {}) };
  normalized.status = { ...createEmptyUser('tmp').status, ...(user.status || {}) };
  normalized.cooldowns = { ...createEmptyUser('tmp').cooldowns, ...(user.cooldowns || {}) };
  normalized.transfer = { ...createEmptyUser('tmp').transfer, ...(user.transfer || {}) };
  normalized.inventory = { ...createEmptyUser('tmp').inventory, ...(user.inventory || {}) };
  normalized.claimState = { ...createEmptyUser('tmp').claimState, ...(user.claimState || {}) };
  normalized.skillTree = {
    ...createEmptyUser('tmp').skillTree,
    ...(user.skillTree || {}),
    paths: {
      ...createEmptyUser('tmp').skillTree.paths,
      ...(user.skillTree?.paths || {})
    },
    talents: Array.isArray(user.skillTree?.talents) ? user.skillTree.talents : []
  };
  normalized.season = { ...createEmptyUser('tmp').season, ...(user.season || {}) };

  if (!Array.isArray(normalized.achievements)) normalized.achievements = [];
  if (!Array.isArray(normalized.careerHistory)) normalized.careerHistory = [];

  return normalized;
}

function ensureUser(data, userId) {
  if (!data.users[userId]) {
    data.users[userId] = createEmptyUser(userId);
    return data.users[userId];
  }

  data.users[userId] = normalizeUser(data.users[userId]);
  resetDailyCaps(data.users[userId]);
  return data.users[userId];
}

function ensureLeague(data) {
  if (!data.league) {
    data.league = { season: 1, clubs: {} };
  }

  for (const club of CLUBS) {
    if (!data.league.clubs[club]) {
      data.league.clubs[club] = {
        club,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: randomInt(10, 22),
        goalsAgainst: randomInt(8, 20),
        points: randomInt(12, 30)
      };
    }
  }
}

function ensureSeasonSystem(data) {
  const startedAt = now();

  if (!data.seasonSystem) {
    data.seasonSystem = {
      currentSeason: 1,
      durationDays: SEASON_DAYS,
      startedAt,
      endsAt: startedAt + seasonDurationMs(SEASON_DAYS),
      history: []
    };
  }

  if (!data.seasonSystem.startedAt || !data.seasonSystem.endsAt) {
    data.seasonSystem.startedAt = startedAt;
    data.seasonSystem.endsAt = startedAt + seasonDurationMs(data.seasonSystem.durationDays || SEASON_DAYS);
  }

  if (!Array.isArray(data.seasonSystem.history)) data.seasonSystem.history = [];
  if (!Array.isArray(data.worldNews)) data.worldNews = [];
}

function ensureNpcPlayers(data) {
  if (Array.isArray(data.npcPlayers) && data.npcPlayers.length > 0) {
    data.npcPlayers = data.npcPlayers.map((npc, i) => {
      const archetype = pickRandom(NPC_ARCHETYPES);
      return {
        id: npc.id || `npc_${i + 1}`,
        name: npc.name || `NPC Oyuncu ${i + 1}`,
        archetype: npc.archetype || archetype.key,
        archetypeTitle: npc.archetypeTitle || archetype.title,
        archetypeFlavor: npc.archetypeFlavor || archetype.flavor,
        overall: clamp(Number(npc.overall || randomInt(60, 90)), 45, 99),
        goals: Number(npc.goals || randomInt(0, 18)),
        assists: Number(npc.assists || randomInt(0, 12)),
        level: Number(npc.level || randomInt(1, 12)),
        club: npc.club || pickRandom(CLUBS),
        attack: clamp(Number(npc.attack || randomInt(55, 95)), 40, 120),
        defense: clamp(Number(npc.defense || randomInt(50, 90)), 35, 120)
      };
    });
    return;
  }

  data.npcPlayers = Array.from({ length: 24 }, (_, i) => {
    const archetype = pickRandom(NPC_ARCHETYPES);
    return {
      id: `npc_${i + 1}`,
      name: `NPC Oyuncu ${i + 1}`,
      archetype: archetype.key,
      archetypeTitle: archetype.title,
      archetypeFlavor: archetype.flavor,
      overall: randomInt(60, 90),
      goals: randomInt(0, 18),
      assists: randomInt(0, 12),
      level: randomInt(1, 12),
      club: pickRandom(CLUBS),
      attack: randomInt(55, 95) + archetype.bonus.attack,
      defense: randomInt(50, 90) + archetype.bonus.defense
    };
  });
}

function createCharacterProfile({ name, age, country, position, tipImageUrl = null }) {
  return {
    name,
    age,
    country,
    position,
    tipImageUrl,
    team: pickRandom(CLUBS),
    joinedAt: now()
  };
}

function getLeagueName(tier) {
  return LEAGUE_TIERS[tier] || '2. Lig';
}

function canUseCooldown(user, key) {
  const startedAt = user.cooldowns[key] || 0;
  const cd = COOLDOWNS[key] || 0;
  const readyAt = startedAt + cd;
  if (now() >= readyAt) {
    return { ok: true, remainingMs: 0, readyAt };
  }

  return { ok: false, remainingMs: readyAt - now(), readyAt };
}

function setCooldown(user, key) {
  user.cooldowns[key] = now();
}

function resetDailyCaps(user) {
  const today = dayKey();
  if (user.season.lastAttackResetDay !== today) {
    user.season.lastAttackResetDay = today;
    user.season.remainingAttacks = MAX_ARENA_ATTACKS;
  }
}

function addXp(user, amount) {
  user.stats.xp += amount;
  let leveledUp = 0;

  while (user.stats.xp >= xpToLevel(user.stats.level)) {
    user.stats.xp -= xpToLevel(user.stats.level);
    user.stats.level += 1;
    user.stats.overall = clamp(user.stats.overall + 1, 40, 99);
    leveledUp += 1;
  }

  return leveledUp;
}

function pushHistory(user, text) {
  user.careerHistory.unshift({
    time: now(),
    text
  });

  if (user.careerHistory.length > 35) {
    user.careerHistory = user.careerHistory.slice(0, 35);
  }
}

function unlockAchievement(user, achievementKey) {
  const achievement = ACHIEVEMENTS[achievementKey];
  if (!achievement) return null;
  if (user.achievements.includes(achievementKey)) return null;

  user.achievements.push(achievementKey);
  return achievement;
}

function checkAutomaticAchievements(user) {
  const unlocked = [];

  if (user.stats.matches >= 1) {
    const found = unlockAchievement(user, 'first_match');
    if (found) unlocked.push(found);
  }

  if (user.stats.goals >= 1) {
    const found = unlockAchievement(user, 'first_goal');
    if (found) unlocked.push(found);
  }

  if (user.stats.money >= 25000) {
    const found = unlockAchievement(user, 'rich_player');
    if (found) unlocked.push(found);
  }

  if (user.stats.matches >= 20) {
    const found = unlockAchievement(user, 'veteran');
    if (found) unlocked.push(found);
  }

  if (user.stats.trainings >= 10) {
    const found = unlockAchievement(user, 'trainer');
    if (found) unlocked.push(found);
  }

  if (user.stats.wins >= 10) {
    const found = unlockAchievement(user, 'ten_wins');
    if (found) unlocked.push(found);
  }

  return unlocked;
}

function applyChoiceEffect(user, choice) {
  const effect = {
    label: 'Dengeli secim',
    form: 0,
    morale: 0,
    chemistry: 0,
    pressure: 0,
    socialMedia: 0,
    note: 'Nötr etki'
  };

  if (choice === 'basina-ters') {
    effect.label = 'Basina ters aciklama';
    effect.morale = -5;
    effect.pressure = 7;
    effect.socialMedia = 6;
    effect.note = 'Yonetim memnun degil, sosyal medya hareketlendi.';
  } else if (choice === 'pas-vermeme') {
    effect.label = 'Topu paylasmama';
    effect.chemistry = -8;
    effect.form = -2;
    effect.note = 'Takim ici uyum bozuldu.';
  } else if (choice === 'gece-hayati') {
    effect.label = 'Gece hayati';
    effect.form = -7;
    effect.morale = -2;
    effect.socialMedia = 3;
    effect.note = 'Performans dususu yasandi.';
  } else if (choice === 'takim-odakli') {
    effect.label = 'Takim odakli aciklama';
    effect.morale = 3;
    effect.chemistry = 4;
    effect.note = 'Takim ruhu guclendi.';
  }

  user.stats.form = clamp(user.stats.form + effect.form, 10, 100);
  user.stats.morale = clamp(user.stats.morale + effect.morale, 10, 100);
  user.stats.teamChemistry = clamp(user.stats.teamChemistry + effect.chemistry, 0, 100);
  user.stats.pressure = clamp(user.stats.pressure + effect.pressure, 0, 100);
  user.stats.socialMedia = clamp(user.stats.socialMedia + effect.socialMedia, 0, 100);

  return effect;
}

function simulateFootballerMatch(user, actionChoice) {
  const stats = user.stats;
  const skillBoost = user.skillTree.paths.finishing * 2 + user.skillTree.paths.vision + user.skillTree.paths.speed;
  const attackPower = stats.overall * 0.58 + stats.form * 0.22 + stats.morale * 0.2 + skillBoost;
  const actionBoost = actionChoice === 'sut' ? 9 : actionChoice === 'pas' ? 5 : 7;

  const userScoreChance = clamp(Math.floor((attackPower + actionBoost) / 18), 0, 6);
  const oppScoreChance = clamp(Math.floor((72 - stats.form + randomInt(5, 28)) / 19), 0, 5);

  const userGoals = randomInt(0, userScoreChance);
  const oppGoals = randomInt(0, oppScoreChance);
  const minuteEvents = [];

  const eventCount = randomInt(4, 8);
  for (let i = 0; i < eventCount; i += 1) {
    const minute = randomInt(3, 90);
    const roll = randomInt(1, 100);

    if (roll <= 28) {
      minuteEvents.push(`⚽ ${minute}' GOOOL! Takimin icin kritik an!`);
    } else if (roll <= 42) {
      minuteEvents.push(`🟨 ${minute}' Sari kart! Oyun sertlesti.`);
    } else if (roll <= 55) {
      minuteEvents.push(`🧤 ${minute}' Muthis kurtaris!`);
    } else if (roll <= 64) {
      minuteEvents.push(`🔥 ${minute}' Tribunler costu, tempo yukseldi.`);
    } else if (roll <= 74) {
      minuteEvents.push(`🎯 ${minute}' Tehlikeli sut, diregin dibinden auta.`);
    } else {
      minuteEvents.push(`🧠 ${minute}' Taktik hamle oyunu degistirdi.`);
    }
  }

  minuteEvents.sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

  const goalsScored = clamp(userGoals > 0 ? randomInt(0, 3) : 0, 0, userGoals);
  const assists = clamp(userGoals > 1 ? randomInt(0, 2) : 0, 0, userGoals);

  let resultText = 'Berabere';
  if (userGoals > oppGoals) resultText = 'Galibiyet';
  if (userGoals < oppGoals) resultText = 'Maglubiyet';

  const injuryChance = randomInt(1, 100);
  const gotInjury = injuryChance <= 12;

  return {
    mode: 'futbolcu',
    scoreline: `${userGoals} - ${oppGoals}`,
    resultText,
    minuteEvents,
    goalsScored,
    assists,
    gotInjury,
    pressQuote: pickRandom(PRESS_QUOTES),
    socialEvent: pickRandom(RANDOM_EVENTS),
    rewardMoney: randomInt(900, 2300),
    rewardXp: randomInt(35, 80)
  };
}

function simulateCoachMatch(user) {
  const teamStrength = user.stats.overall + Math.floor(user.stats.form / 2) + Math.floor(user.stats.teamChemistry / 7);
  const tacticBonus = randomInt(0, 10);
  const chance = clamp(Math.floor((teamStrength + tacticBonus) / 20), 0, 5);

  const goalsFor = randomInt(0, chance);
  const goalsAgainst = randomInt(0, clamp(4 - Math.floor(user.stats.morale / 25), 0, 4));

  const pressureShift = goalsFor > goalsAgainst ? -8 : goalsFor < goalsAgainst ? 10 : 2;

  return {
    mode: 'teknik-direktor',
    tactic: user.squad.tactic,
    scoreline: `${goalsFor} - ${goalsAgainst}`,
    rewardMoney: randomInt(1200, 2600),
    rewardXp: randomInt(30, 65),
    pressureShift,
    managementNote:
      goalsFor > goalsAgainst
        ? 'Yonetim senden memnun, kontrat guven tazeledi.'
        : goalsFor < goalsAgainst
          ? 'Yonetim baskisi artti, bir sonraki mac kritik.'
          : 'Yonetim dengeli bir performans bekliyor.'
  };
}

function simulateOwnerCycle(user) {
  const sponsorGain = randomInt(4000, 18000);
  const cost = randomInt(2000, 9000);
  const net = sponsorGain - cost;

  const event = pickRandom(OWNER_EVENTS);
  const transferBudgetShift = randomInt(-15000, 25000);

  return {
    mode: 'kulup-sahibi',
    sponsorGain,
    cost,
    net,
    transferBudgetShift,
    event,
    rewardXp: randomInt(25, 55)
  };
}

function applyMatchOutcome(user, outcome) {
  user.stats.matches += 1;
  user.stats.money += outcome.rewardMoney;
  const leveledUp = addXp(user, outcome.rewardXp);

  if (outcome.mode === 'futbolcu') {
    user.stats.goals += outcome.goalsScored;
    user.stats.assists += outcome.assists;
    user.stats.form = clamp(user.stats.form + (outcome.resultText === 'Galibiyet' ? 6 : -2), 20, 100);
    user.stats.morale = clamp(user.stats.morale + (outcome.resultText === 'Galibiyet' ? 5 : -4), 15, 100);
    user.stats.socialMedia = clamp(user.stats.socialMedia + randomInt(1, 7), 0, 100);

    if (outcome.resultText === 'Galibiyet') user.stats.wins += 1;
    if (outcome.resultText === 'Berabere') user.stats.draws += 1;
    if (outcome.resultText === 'Maglubiyet') user.stats.losses += 1;

    if (outcome.gotInjury) {
      user.stats.injuries += 1;
      user.stats.form = clamp(user.stats.form - randomInt(8, 16), 10, 100);
      user.status.injuredUntil = now() + 1000 * 60 * 60 * 2;
      user.stats.overall = clamp(user.stats.overall - 1, 40, 99);
    } else {
      user.stats.overall = clamp(user.stats.overall + (outcome.resultText === 'Galibiyet' ? 1 : 0), 40, 99);
    }

    if (outcome.goalsScored >= 3) {
      unlockAchievement(user, 'hat_trick');
    }
  }

  if (outcome.mode === 'teknik-direktor') {
    const [gf, ga] = outcome.scoreline.split(' - ').map(Number);
    if (gf > ga) user.stats.wins += 1;
    if (gf === ga) user.stats.draws += 1;
    if (gf < ga) user.stats.losses += 1;

    user.stats.pressure = clamp(user.stats.pressure + outcome.pressureShift, 0, 100);
    user.stats.form = clamp(user.stats.form + (gf > ga ? 4 : -3), 20, 100);
    user.stats.morale = clamp(user.stats.morale + (gf > ga ? 3 : -4), 10, 100);
  }

  if (outcome.mode === 'kulup-sahibi') {
    user.stats.clubBudget += outcome.net;
    user.stats.transferBudget = clamp(user.stats.transferBudget + outcome.transferBudgetShift, 50000, 5000000);
    user.stats.morale = clamp(user.stats.morale + randomInt(-2, 4), 10, 100);
  }

  const salaryGain = user.economy.salaryBase + Math.floor(user.stats.level * 80);
  const performanceBonus = outcome.mode === 'futbolcu' ? outcome.goalsScored * 450 + outcome.assists * 250 : 0;
  user.stats.money += salaryGain + performanceBonus;

  return {
    leveledUp,
    salaryGain,
    performanceBonus
  };
}

function runTraining(user, trainingType = 'normal') {
  user.stats.trainings += 1;

  const multiplier = trainingType === 'ozel' ? 1.65 : 1;
  const overallGain = clamp(Math.round(randomInt(0, 2) * multiplier), 0, 3);
  const formGain = Math.round(randomInt(4, 10) * multiplier);
  const moraleGain = Math.round(randomInt(2, 8) * multiplier);
  const xpGain = Math.round(randomInt(20, 45) * multiplier);

  if (trainingType === 'ozel') {
    user.stats.money = clamp(user.stats.money - 2500, 0, Number.MAX_SAFE_INTEGER);
  }

  user.stats.overall = clamp(user.stats.overall + overallGain, 40, 99);
  user.stats.form = clamp(user.stats.form + formGain, 20, 100);
  user.stats.morale = clamp(user.stats.morale + moraleGain, 15, 100);

  const leveledUp = addXp(user, xpGain);
  return {
    overallGain,
    formGain,
    moraleGain,
    xpGain,
    leveledUp,
    trainingType
  };
}

function createTransferOffer(user) {
  const current = user.character?.team || pickRandom(CLUBS);
  const candidates = CLUBS.filter((c) => c !== current);
  const offeredClub = pickRandom(candidates);

  const baseFee = user.stats.overall * 500 + user.stats.level * 200 + randomInt(1500, 7000);

  const offer = {
    offeredClub,
    amount: baseFee,
    createdAt: now()
  };

  user.transfer.activeOffer = offer;
  return offer;
}

function applyTransferAccept(user) {
  const offer = user.transfer.activeOffer;
  if (!offer) return null;

  const oldClub = user.character.team;
  user.character.team = offer.offeredClub;
  user.stats.money += offer.amount;
  user.transfer.activeOffer = null;
  user.stats.morale = clamp(user.stats.morale + 5, 10, 100);

  return {
    oldClub,
    newClub: user.character.team,
    amount: offer.amount
  };
}

function rejectTransfer(user) {
  const offer = user.transfer.activeOffer;
  user.transfer.activeOffer = null;
  user.stats.morale = clamp(user.stats.morale - 1, 10, 100);
  return offer;
}

function runFriendlyMatch(user, opponent) {
  const myOverall = user.stats.overall;
  const rivalOverall = opponent.stats.overall;

  if (myOverall >= 90 && rivalOverall < 90) {
    const myGoals = randomInt(2, 5);
    const opGoals = randomInt(0, 1);
    return {
      scoreline: `${myGoals} - ${opGoals}`,
      result: 'Galibiyet',
      xpGain: 45,
      moneyGain: 2100,
      arenaDelta: 28
    };
  }

  if (rivalOverall >= 90 && myOverall < 90) {
    const myGoals = randomInt(0, 1);
    const opGoals = randomInt(2, 5);
    return {
      scoreline: `${myGoals} - ${opGoals}`,
      result: 'Maglubiyet',
      xpGain: 15,
      moneyGain: 500,
      arenaDelta: -8
    };
  }

  if (myOverall >= 90 && rivalOverall >= 90) {
    const goals = randomInt(1, 3);
    return {
      scoreline: `${goals} - ${goals}`,
      result: 'Berabere',
      xpGain: 32,
      moneyGain: 1300,
      arenaDelta: 10
    };
  }

  const mePower = user.stats.overall + Math.floor(user.stats.form / 3) + user.skillTree.paths.vision;
  const opPower = opponent.stats.overall + Math.floor(opponent.stats.form / 3) + opponent.skillTree.paths.finishing;

  const myGoals = randomInt(0, clamp(Math.floor(mePower / 24), 1, 5));
  const opGoals = randomInt(0, clamp(Math.floor(opPower / 24), 1, 5));

  const myWin = myGoals > opGoals;
  const draw = myGoals === opGoals;

  const xpGain = myWin ? 40 : draw ? 25 : 15;
  const moneyGain = myWin ? 1700 : draw ? 1000 : 550;
  const arenaDelta = myWin ? 24 : draw ? 8 : -6;

  user.season.friendlyWins += myWin ? 1 : 0;
  user.season.friendlyLosses += myGoals < opGoals ? 1 : 0;

  return {
    scoreline: `${myGoals} - ${opGoals}`,
    result: myWin ? 'Galibiyet' : draw ? 'Berabere' : 'Maglubiyet',
    xpGain,
    moneyGain,
    arenaDelta
  };
}

function runArenaMatch(user, npc) {
  resetDailyCaps(user);

  if (user.stats.overall >= 95) {
    const myGoals = randomInt(2, 5);
    const npcGoals = randomInt(0, 1);
    const arenaDelta = randomInt(22, 34);
    const xpGain = randomInt(45, 72);
    const moneyGain = randomInt(2200, 3600);

    user.season.remainingAttacks = clamp(user.season.remainingAttacks - 1, 0, MAX_ARENA_ATTACKS);
    user.season.arenaWins += 1;

    return {
      scoreline: `${myGoals} - ${npcGoals}`,
      result: 'Galibiyet',
      arenaDelta,
      xpGain,
      moneyGain,
      npcTitle: npc.archetypeTitle,
      npcFlavor: npc.archetypeFlavor,
      npcName: npc.name
    };
  }

  const myAttack = user.stats.overall + Math.floor(user.stats.form / 2) + user.skillTree.paths.finishing * 2;
  const myDefense = user.stats.teamChemistry + user.skillTree.paths.vision;
  const npcAttack = clamp(npc.attack + randomInt(-6, 6), 40, 120);
  const npcDefense = clamp(npc.defense + randomInt(-6, 6), 35, 120);

  const myGoals = randomInt(0, clamp(Math.floor((myAttack - npcDefense + 75) / 25), 0, 5));
  const npcGoals = randomInt(0, clamp(Math.floor((npcAttack - myDefense + 75) / 25), 0, 5));

  const win = myGoals > npcGoals;
  const draw = myGoals === npcGoals;

  const arenaDelta = win ? randomInt(16, 28) : draw ? randomInt(4, 10) : -randomInt(4, 12);
  const xpGain = win ? randomInt(35, 60) : draw ? randomInt(20, 38) : randomInt(12, 24);
  const moneyGain = win ? randomInt(1400, 2600) : draw ? randomInt(850, 1500) : randomInt(450, 900);

  user.season.remainingAttacks = clamp(user.season.remainingAttacks - 1, 0, MAX_ARENA_ATTACKS);
  if (win) user.season.arenaWins += 1;
  if (!win && !draw) user.season.arenaLosses += 1;

  return {
    scoreline: `${myGoals} - ${npcGoals}`,
    result: win ? 'Galibiyet' : draw ? 'Berabere' : 'Maglubiyet',
    arenaDelta,
    xpGain,
    moneyGain,
    npcTitle: npc.archetypeTitle,
    npcFlavor: npc.archetypeFlavor,
    npcName: npc.name
  };
}

function runPenaltyChallenge(user) {
  const shots = [];
  const totalShots = 5;
  const finishing = user.skillTree.paths.finishing || 0;
  const formFactor = Math.floor((user.stats.form - 50) / 8);
  const moraleFactor = Math.floor((user.stats.morale - 50) / 10);
  const baseChance = clamp(50 + (user.stats.overall - 60) + finishing * 2 + formFactor + moraleFactor, 35, 94);

  let goals = 0;
  for (let i = 1; i <= totalShots; i += 1) {
    const chance = clamp(baseChance + randomInt(-8, 10), 25, 98);
    const roll = randomInt(1, 100);
    const scored = roll <= chance;
    if (scored) goals += 1;

    const comment = scored
      ? pickRandom(['Top aglarda!', 'Kaleci ters koseye yatti.', 'Buz gibi penaltı!'])
      : pickRandom(['Kaleci cikardi!', 'Direkten dondu!', 'Top auta gitti.']);
    shots.push(`${i}. vurus: ${scored ? '⚽ GOL' : '❌ KACTI'} - ${comment}`);
  }

  if (user.stats.overall >= 90 && goals < 4) {
    goals = 4;
  }

  const result = goals >= 4 ? 'Ust Duzey' : goals >= 3 ? 'Basarili' : goals >= 2 ? 'Orta' : 'Zayif';
  const xpGain = goals >= 4 ? randomInt(40, 60) : goals >= 3 ? randomInt(28, 45) : randomInt(18, 30);
  const moneyGain = goals >= 4 ? randomInt(1800, 2800) : goals >= 3 ? randomInt(1000, 1700) : randomInt(500, 1000);
  const formGain = goals >= 4 ? randomInt(2, 5) : goals >= 3 ? randomInt(1, 3) : randomInt(0, 2);
  const moraleGain = goals >= 4 ? randomInt(2, 4) : goals >= 3 ? randomInt(1, 2) : randomInt(-1, 1);

  user.stats.money += moneyGain;
  user.stats.form = clamp(user.stats.form + formGain, 10, 100);
  user.stats.morale = clamp(user.stats.morale + moraleGain, 10, 100);
  const leveledUp = addXp(user, xpGain);

  return {
    totalShots,
    goals,
    result,
    shots,
    xpGain,
    moneyGain,
    formGain,
    moraleGain,
    leveledUp
  };
}

function applyArenaRewards(user, result) {
  user.season.arenaPoints = Math.max(0, user.season.arenaPoints + result.arenaDelta);
  user.season.leaguePoints = Math.max(0, user.season.leaguePoints + Math.max(0, result.arenaDelta));
  user.stats.money += result.moneyGain;
  const leveledUp = addXp(user, result.xpGain);

  if (result.result === 'Galibiyet') {
    user.stats.wins += 1;
    user.stats.morale = clamp(user.stats.morale + 3, 10, 100);
  } else if (result.result === 'Berabere') {
    user.stats.draws += 1;
    user.stats.morale = clamp(user.stats.morale + 1, 10, 100);
  } else {
    user.stats.losses += 1;
    user.stats.morale = clamp(user.stats.morale - 2, 10, 100);
  }

  return leveledUp;
}

function applyFriendlyRewards(user, result) {
  user.season.arenaPoints = Math.max(0, user.season.arenaPoints + result.arenaDelta);
  user.season.leaguePoints = Math.max(0, user.season.leaguePoints + Math.max(0, result.arenaDelta));
  user.stats.money += result.moneyGain;
  const leveledUp = addXp(user, result.xpGain);

  if (result.result === 'Galibiyet') user.stats.wins += 1;
  if (result.result === 'Berabere') user.stats.draws += 1;
  if (result.result === 'Maglubiyet') user.stats.losses += 1;

  return leveledUp;
}

function pickWeightedTalent(talents) {
  const totalWeight = talents.reduce((acc, t) => acc + (t.weight || 1), 0);
  let roll = Math.random() * totalWeight;

  for (const talent of talents) {
    roll -= talent.weight || 1;
    if (roll <= 0) return talent;
  }

  return talents[talents.length - 1];
}

function applyTalentToUser(user, talent, meta = {}) {
  const pathDelta = talent.path ? 1 : 0;
  const overallDelta = talent.overall || 0;
  const formDelta = talent.form || 0;
  const moraleDelta = talent.morale || 0;
  const claimId = `claim_${now()}_${randomInt(100, 999)}`;

  if (talent.path) {
    user.skillTree.paths[talent.path] = clamp(user.skillTree.paths[talent.path] + pathDelta, 0, 25);
  }

  user.stats.overall = clamp(user.stats.overall + overallDelta, 40, 99);
  user.stats.form = clamp(user.stats.form + formDelta, 10, 100);
  user.stats.morale = clamp(user.stats.morale + moraleDelta, 10, 100);

  user.skillTree.talents.push({
    claimId,
    key: talent.key,
    gainedAt: now(),
    source: meta.source || 'claim'
  });

  return {
    claimId,
    talentKey: talent.key,
    talentLabel: talent.label,
    talentRarity: talent.rarity,
    path: talent.path || null,
    pathDelta,
    overallDelta,
    formDelta,
    moraleDelta,
    source: meta.source || 'claim',
    rerolledFrom: meta.rerolledFrom || null
  };
}

function revertClaimEffect(user, claimRecord) {
  if (!claimRecord) return;

  if (claimRecord.path && claimRecord.pathDelta) {
    user.skillTree.paths[claimRecord.path] = clamp(user.skillTree.paths[claimRecord.path] - claimRecord.pathDelta, 0, 25);
  }

  user.stats.overall = clamp(user.stats.overall - (claimRecord.overallDelta || 0), 40, 99);
  user.stats.form = clamp(user.stats.form - (claimRecord.formDelta || 0), 10, 100);
  user.stats.morale = clamp(user.stats.morale - (claimRecord.moraleDelta || 0), 10, 100);

  if (claimRecord.claimId) {
    user.skillTree.talents = user.skillTree.talents.filter((t) => t.claimId !== claimRecord.claimId);
  }
}

function resolveClaim(user, options = {}) {
  const guaranteedLegendary = Boolean(options.guaranteedLegendary);
  const source = options.source || 'claim';
  const allowReroll = Boolean(options.allowReroll);
  const rerolledFrom = options.rerolledFrom || null;

  const pool = guaranteedLegendary ? CLAIM_TALENTS.filter((t) => t.rarity === 'Efsanevi') : CLAIM_TALENTS;
  const talent = pickWeightedTalent(pool.length > 0 ? pool : CLAIM_TALENTS);

  const applied = applyTalentToUser(user, talent, { source, rerolledFrom });

  if (allowReroll) {
    user.claimState.lastClaim = applied;
  }

  return {
    talent,
    text: `${talent.label} acildi. Skill tree gelisimi saglandi.`,
    applied
  };
}

function rerollLastClaim(user) {
  const lastClaim = user.claimState?.lastClaim;
  if (!lastClaim) {
    return { ok: false, reason: 'no_last_claim' };
  }

  if (lastClaim.source !== 'claim' && lastClaim.source !== 'reroll') {
    return { ok: false, reason: 'claim_not_rerollable' };
  }

  if (user.inventory.rerollTokens <= 0) {
    return { ok: false, reason: 'no_reroll_token' };
  }

  revertClaimEffect(user, lastClaim);
  user.inventory.rerollTokens -= 1;

  const newResult = resolveClaim(user, {
    source: 'reroll',
    allowReroll: true,
    rerolledFrom: lastClaim.talentKey
  });

  return {
    ok: true,
    previous: lastClaim,
    result: newResult
  };
}

function seasonSnapshotForUser(user) {
  return `Lig: ${getLeagueName(user.season.leagueTier)}\nArena Puan: ${user.season.arenaPoints}\nLig Puan: ${user.season.leaguePoints}\nArena: ${user.season.arenaWins}G-${user.season.arenaLosses}M\nFriendly: ${user.season.friendlyWins}G-${user.season.friendlyLosses}M`;
}

function buildSeasonRanking(data, tier) {
  return Object.values(data.users)
    .filter((u) => u.character && u.season.leagueTier === tier)
    .sort((a, b) => b.season.leaguePoints - a.season.leaguePoints || b.season.arenaPoints - a.season.arenaPoints);
}

function promoteOrRelegate(data) {
  const byTier = {
    1: buildSeasonRanking(data, 1),
    2: buildSeasonRanking(data, 2),
    3: buildSeasonRanking(data, 3)
  };

  const promotions = [];
  const relegations = [];

  const t2upCount = byTier[2].length > 0 ? Math.max(1, Math.floor(byTier[2].length * 0.25)) : 0;
  const t3upCount = byTier[3].length > 0 ? Math.max(1, Math.floor(byTier[3].length * 0.25)) : 0;
  const t1downCount = byTier[1].length > 0 ? Math.max(1, Math.floor(byTier[1].length * 0.25)) : 0;
  const t2downCount = byTier[2].length > 0 ? Math.max(1, Math.floor(byTier[2].length * 0.25)) : 0;

  const t2Promoted = byTier[2].slice(0, t2upCount);
  const t3Promoted = byTier[3].slice(0, t3upCount);
  const t1Relegated = byTier[1].slice(-t1downCount);
  const t2Relegated = byTier[2].slice(-t2downCount);

  for (const u of t2Promoted) {
    if (u.season.leagueTier !== 1) {
      u.season.leagueTier = 1;
      promotions.push(`${u.character.name} -> Super Lig`);
    }
  }

  for (const u of t3Promoted) {
    if (u.season.leagueTier !== 2) {
      u.season.leagueTier = 2;
      promotions.push(`${u.character.name} -> 1. Lig`);
    }
  }

  for (const u of t1Relegated) {
    if (u.season.leagueTier !== 2) {
      u.season.leagueTier = 2;
      relegations.push(`${u.character.name} -> 1. Lig`);
    }
  }

  for (const u of t2Relegated) {
    if (u.season.leagueTier !== 3) {
      u.season.leagueTier = 3;
      relegations.push(`${u.character.name} -> 2. Lig`);
    }
  }

  return { promotions, relegations };
}

function buildNewsHeadline(text) {
  return {
    id: `news_${now()}_${randomInt(100, 999)}`,
    createdAt: now(),
    text
  };
}

function checkAndAdvanceSeason(data) {
  ensureSeasonSystem(data);

  const current = now();
  if (current < data.seasonSystem.endsAt) return null;

  const users = Object.values(data.users).filter((u) => u.character);

  const ranking = users
    .sort((a, b) => b.season.arenaPoints - a.season.arenaPoints || b.season.leaguePoints - a.season.leaguePoints)
    .map((u) => ({
      id: u.id,
      name: u.character.name,
      arenaPoints: u.season.arenaPoints,
      leaguePoints: u.season.leaguePoints,
      tier: u.season.leagueTier
    }));

  const rewards = [];
  const rewardPlan = [
    { money: 50000, xp: 200 },
    { money: 30000, xp: 120 },
    { money: 15000, xp: 80 }
  ];

  for (let i = 0; i < Math.min(3, ranking.length); i += 1) {
    const entry = ranking[i];
    const user = data.users[entry.id];
    const plan = rewardPlan[i];

    user.stats.money += plan.money;
    addXp(user, plan.xp);
    pushHistory(user, `Sezon ${data.seasonSystem.currentSeason} odulu alindi (#${i + 1}).`);
    rewards.push(`${entry.name}: +${plan.money.toLocaleString('tr-TR')} ₺, +${plan.xp} XP`);
  }

  const movement = promoteOrRelegate(data);

  for (const user of users) {
    user.season.leaguePoints = 0;
    user.season.arenaPoints = 0;
    user.season.arenaWins = 0;
    user.season.arenaLosses = 0;
    user.season.friendlyWins = 0;
    user.season.friendlyLosses = 0;
    user.season.remainingAttacks = MAX_ARENA_ATTACKS;
    user.season.lastAttackResetDay = dayKey();
  }

  const champion = ranking[0]?.name || 'Yok';
  const seasonResult = {
    season: data.seasonSystem.currentSeason,
    finishedAt: current,
    champion,
    rewards,
    promotions: movement.promotions,
    relegations: movement.relegations,
    top10: ranking.slice(0, 10)
  };

  data.seasonSystem.history.unshift(seasonResult);
  if (data.seasonSystem.history.length > 20) {
    data.seasonSystem.history = data.seasonSystem.history.slice(0, 20);
  }

  data.worldNews.unshift(buildNewsHeadline(`🏆 Sezon ${seasonResult.season} sampiyonu: ${champion}`));
  if (movement.promotions.length > 0) {
    data.worldNews.unshift(buildNewsHeadline(`📈 Yukselenler: ${movement.promotions.slice(0, 3).join(', ')}`));
  }
  if (movement.relegations.length > 0) {
    data.worldNews.unshift(buildNewsHeadline(`📉 Kume dusenler: ${movement.relegations.slice(0, 3).join(', ')}`));
  }

  data.worldNews.unshift(buildNewsHeadline(`😱 Teknik direktor kovuldu! Kulupte deprem etkisi.`));
  data.worldNews.unshift(buildNewsHeadline(`🔥 Buyuk transfer gerceklesti! Piyasa hareketli.`));
  data.worldNews.unshift(buildNewsHeadline(`📰 Bir yildiz oyuncu gece kulubunde goruldu.`));

  data.worldNews = data.worldNews.slice(0, 60);

  data.seasonSystem.currentSeason += 1;
  data.seasonSystem.startedAt = current;
  data.seasonSystem.endsAt = current + seasonDurationMs(data.seasonSystem.durationDays || SEASON_DAYS);

  return seasonResult;
}

function asProfileEmbed(user, discordUser, seasonInfo = null) {
  const c = user.character;
  const s = user.stats;

  const achText =
    user.achievements.length > 0
      ? user.achievements.map((k) => `• ${ACHIEVEMENTS[k]?.title ?? k}`).join('\n')
      : 'Henuz acilan basarim yok.';

  const historyText =
    user.careerHistory.length > 0
      ? user.careerHistory
          .slice(0, 5)
          .map((h) => `• ${h.text}`)
          .join('\n')
      : 'Kariyer gecmisi bos.';

  const seasonText = seasonInfo || seasonSnapshotForUser(user);

  const embed = new EmbedBuilder()
    .setColor(0x00a8ff)
    .setTitle(`Kariyer Profili | ${discordUser.username}`)
    .setDescription('Futbol RP kariyer durumun asagidadir.')
    .addFields(
      {
        name: 'Karakter',
        value: `Isim: ${c?.name ?? '-'}\nYas: ${c?.age ?? '-'}\nUlke: ${c?.country ?? '-'}\nPozisyon: ${c?.position ?? '-'}\nTakim: ${c?.team ?? '-'}\nTip Foto: ${c?.tipImageUrl ? 'Yuklendi' : 'Yok'}`
      },
      {
        name: 'Genel Degerler',
        value: `Overall: ${s.overall}\nForm: ${s.form}\nMoral: ${s.morale}\nTakim Uyum: ${s.teamChemistry}\nSeviye: ${s.level}\nXP: ${s.xp}/${xpToLevel(s.level)}`
      },
      {
        name: 'Performans',
        value: `Mac: ${s.matches}\nG: ${s.wins} B: ${s.draws} M: ${s.losses}\nGol: ${s.goals} Asist: ${s.assists}\nAntrenman: ${s.trainings}`
      },
      {
        name: 'Sezon',
        value: seasonText
      },
      {
        name: 'Skill Tree',
        value: `Bitiricilik: ${user.skillTree.paths.finishing}\nOyun Zekasi: ${user.skillTree.paths.vision}\nHiz: ${user.skillTree.paths.speed}`
      },
      {
        name: 'Ekonomi',
        value:
          `Para: ${s.money.toLocaleString('tr-TR')} ₺\n` +
          `Kulup Butcesi: ${s.clubBudget.toLocaleString('tr-TR')} ₺\n` +
          `Transfer Butcesi: ${s.transferBudget.toLocaleString('tr-TR')} ₺\n` +
          `Reroll: ${user.inventory.rerollTokens} | Golden: ${user.inventory.goldenContracts}`
      },
      {
        name: 'Basarimlar',
        value: achText
      },
      {
        name: 'Kariyer Gecmisi',
        value: historyText
      }
    )
    .setFooter({ text: `Rol: ${user.role || 'Secilmedi'} | Lig: ${getLeagueName(user.season.leagueTier)}` })
    .setTimestamp();

  if (c?.tipImageUrl) {
    embed.setThumbnail(c.tipImageUrl);
  }

  return embed;
}

module.exports = {
  CLUBS,
  POSITIONS,
  COUNTRIES,
  TACTICS,
  LEAGUE_TIERS,
  COOLDOWNS,
  ACHIEVEMENTS,
  MAX_ARENA_ATTACKS,
  xpToLevel,
  ensureUser,
  ensureLeague,
  ensureSeasonSystem,
  ensureNpcPlayers,
  checkAndAdvanceSeason,
  createCharacterProfile,
  getLeagueName,
  canUseCooldown,
  setCooldown,
  resetDailyCaps,
  addXp,
  pushHistory,
  unlockAchievement,
  checkAutomaticAchievements,
  applyChoiceEffect,
  simulateFootballerMatch,
  simulateCoachMatch,
  simulateOwnerCycle,
  applyMatchOutcome,
  runTraining,
  createTransferOffer,
  applyTransferAccept,
  rejectTransfer,
  runArenaMatch,
  applyArenaRewards,
  runFriendlyMatch,
  applyFriendlyRewards,
  runPenaltyChallenge,
  resolveClaim,
  rerollLastClaim,
  seasonSnapshotForUser,
  asProfileEmbed,
  pickRandom
};
