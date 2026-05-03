function ensureGuildSettings(data, guildId) {
  if (!data.guildSettings) data.guildSettings = {};
  if (!data.guildSettings[guildId]) {
    data.guildSettings[guildId] = {
      prefix: '!'
    };
  }
  return data.guildSettings[guildId];
}

function getGuildPrefix(data, guildId) {
  return ensureGuildSettings(data, guildId).prefix || '!';
}

function setGuildPrefix(data, guildId, prefix) {
  const settings = ensureGuildSettings(data, guildId);
  settings.prefix = prefix;
  return settings.prefix;
}

module.exports = {
  ensureGuildSettings,
  getGuildPrefix,
  setGuildPrefix
};
