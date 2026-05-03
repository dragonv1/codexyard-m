const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const { ensureUser, ensureSeasonSystem, checkAndAdvanceSeason, canUseCooldown, MAX_ARENA_ATTACKS } = require('../utils/gameEngine');
const { clockLeft } = require('../utils/helpers');

function statusLine(cooldown) {
  return cooldown.ok ? 'Ready' : clockLeft(cooldown.remainingMs);
}

module.exports = {
  data: new SlashCommandBuilder().setName('cd').setDescription('Cooldown panelini goster'),

  async execute(interaction) {
    const data = readData();
    ensureSeasonSystem(data);
    checkAndAdvanceSeason(data);

    const user = ensureUser(data, interaction.user.id);
    writeData(data);

    const claim = canUseCooldown(user, 'claim');
    const friendly = canUseCooldown(user, 'friendly');
    const arena = canUseCooldown(user, 'arena');
    const vote = canUseCooldown(user, 'vote');
    const daily = canUseCooldown(user, 'daily');

    const embed = new EmbedBuilder()
      .setColor(0x2f3136)
      .setTitle(`⏱ Cooldown | ${interaction.user.username}`)
      .setDescription('Live timer paneli')
      .addFields(
        {
          name: '📜 Claim',
          value:
            `${statusLine(claim)}\n` +
            `↳ Reroll Tokens: ${user.inventory.rerollTokens}\n` +
            `↳ Golden Contracts: ${user.inventory.goldenContracts}`
        },
        {
          name: '🏁 Friendly',
          value: statusLine(friendly)
        },
        {
          name: '⚔ Arena',
          value:
            `${statusLine(arena)}\n` +
            `↳ Arena Points: ${user.season.arenaPoints}\n` +
            `↳ Remaining Attacks: ${user.season.remainingAttacks}/${MAX_ARENA_ATTACKS}`
        },
        {
          name: '📈 Vote',
          value: vote.ok ? 'Yakinda (sistem acilacak)' : statusLine(vote)
        },
        {
          name: '🌤 Daily',
          value: statusLine(daily)
        }
      )
      .setFooter({ text: 'Claim butonu ile direkt odul alabilirsin.' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cd_claim').setLabel('Claim').setStyle(ButtonStyle.Success)
    );

    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }
};
