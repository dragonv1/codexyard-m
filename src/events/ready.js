const { startGiveawayScheduler } = require('../utils/giveawaySystem');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`Bot aktif: ${client.user.tag}`);
    startGiveawayScheduler(client);
  }
};
