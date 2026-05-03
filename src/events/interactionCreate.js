const { EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const { ensureUser, ensureSeasonSystem, checkAndAdvanceSeason, canUseCooldown, setCooldown, resolveClaim, pushHistory } = require('../utils/gameEngine');
const { timeLeft } = require('../utils/helpers');
const { handleGiveawayJoinInteraction } = require('../utils/giveawaySystem');
const { handleTicketCategorySelection, handleTicketCloseButton } = require('../utils/ticketSystem');

async function handleClaimButton(interaction) {
  const data = readData();
  ensureSeasonSystem(data);
  checkAndAdvanceSeason(data);

  const user = ensureUser(data, interaction.user.id);
  if (!user.role || !user.character) {
    return interaction.reply({
      ephemeral: true,
      embeds: [
        new EmbedBuilder()
          .setColor(0xff3b30)
          .setTitle('Karakter gerekli')
          .setDescription('Claim icin once kariyer olusturmalisin.')
          .setTimestamp()
      ]
    });
  }

  const claimCd = canUseCooldown(user, 'claim');
  if (!claimCd.ok) {
    return interaction.reply({
      ephemeral: true,
      embeds: [
        new EmbedBuilder()
          .setColor(0xff3b30)
          .setTitle('Claim hazir degil')
          .setDescription(`Kalan sure: ${timeLeft(claimCd.remainingMs)}`)
          .setTimestamp()
      ]
    });
  }

  const result = resolveClaim(user);
  setCooldown(user, 'claim');
  pushHistory(user, `Claim odulu alindi: ${result.talent.label}`);
  writeData(data);

  return interaction.reply({
    ephemeral: true,
    embeds: [
      new EmbedBuilder()
        .setColor(result.talent.rarity === 'Efsanevi' ? 0xf1c40f : 0x9b59b6)
        .setTitle('Claim Basarili')
        .setDescription(result.text)
        .addFields(
          { name: 'Odul', value: result.talent.label, inline: true },
          { name: 'Nadirlik', value: result.talent.rarity, inline: true }
        )
        .setTimestamp()
    ]
  });
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isButton()) {
      if (interaction.customId === 'cd_claim') {
        return handleClaimButton(interaction);
      }

      if (interaction.customId.startsWith('gw_join|')) {
        return handleGiveawayJoinInteraction(interaction);
      }

      if (interaction.customId === 'ticket_close') {
        return handleTicketCloseButton(interaction);
      }

      return;
    }

    if (interaction.isStringSelectMenu && interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket_category_select') {
        return handleTicketCategorySelection(interaction);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      return interaction.reply({
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setColor(0xff3b30)
            .setTitle('Komut bulunamadi')
            .setDescription('Bu komut artik aktif degil veya yuklenemedi.')
            .setTimestamp()
        ]
      });
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      const payload = {
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setColor(0xff3b30)
            .setTitle('Hata olustu')
            .setDescription('Komut calisirken bir hata olustu. Lutfen daha sonra tekrar dene.')
            .setTimestamp()
        ]
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    }
  }
};
