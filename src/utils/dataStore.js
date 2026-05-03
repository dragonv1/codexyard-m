const fs = require('node:fs');
const path = require('node:path');

const dataDir = path.join(__dirname, '..', '..', 'data');
const dataFile = path.join(dataDir, 'gameData.json');

const defaultData = {
  users: {},
  guildSettings: {},
  giveaways: {
    configs: {}
  },
  ticketSettings: {},
  league: {
    season: 1,
    clubs: {}
  },
  seasonSystem: {
    currentSeason: 1,
    durationDays: 7,
    startedAt: 0,
    endsAt: 0,
    history: []
  },
  worldNews: [],
  npcPlayers: []
};

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(defaultData, null, 2), 'utf8');
  }
}

function readData() {
  ensureDataFile();
  const raw = fs.readFileSync(dataFile, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    fs.writeFileSync(dataFile, JSON.stringify(defaultData, null, 2), 'utf8');
    return structuredClone(defaultData);
  }
}

function writeData(data) {
  ensureDataFile();
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  readData,
  writeData,
  ensureDataFile,
  dataFile
};
