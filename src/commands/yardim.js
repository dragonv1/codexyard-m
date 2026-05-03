const { SlashCommandBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const { ensureSeasonSystem, checkAndAdvanceSeason } = require('../utils/gameEngine');
const { getGuildPrefix } = require('../utils/guildSettings');
const { buildHelpPayload } = require('../utils/helpPanel');

module.exports = {
  data: new SlashCommandBuilder().setName('yardım').setDescription('Bot komutlarini ve sistemi gosterir (GIFli)'),

  async execute(interaction) {
    const data = readData();
    ensureSeasonSystem(data);
    checkAndAdvanceSeason(data);

    const prefix = interaction.guildId ? getGuildPrefix(data, interaction.guildId) : '!';
    writeData(data);

    const payload = buildHelpPayload(prefix);
    return interaction.reply(payload);
  }
};
