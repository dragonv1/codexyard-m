const { EmbedBuilder } = require('discord.js');

function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0xff3b30)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

function infoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

function hasRoleAndCharacter(user) {
  return Boolean(user?.role && user?.character);
}

module.exports = {
  errorEmbed,
  infoEmbed,
  hasRoleAndCharacter
};
