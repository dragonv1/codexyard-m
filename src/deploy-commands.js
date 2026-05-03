require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);
const cliScope = process.argv[2];
const deployScope = (cliScope || process.env.DEPLOY_SCOPE || 'guild').toLowerCase();

(async () => {
  try {
    console.log(`${commands.length} komut yenileniyor...`);

    if (!process.env.CLIENT_ID || !process.env.DISCORD_TOKEN) {
      throw new Error('CLIENT_ID veya DISCORD_TOKEN eksik. .env dosyasini kontrol et.');
    }

    if (deployScope === 'guild') {
      if (!process.env.GUILD_ID) {
        throw new Error('GUILD_ID eksik. Guild deploy icin .env dosyasina GUILD_ID ekle.');
      }

      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
        body: commands
      });
      console.log('Komutlar test sunucusuna yuklendi.');
      return;
    }

    if (deployScope === 'global') {
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
        body: commands
      });
      console.log('Komutlar global olarak yuklendi (public bot icin bu mod onerilir, yayilmasi zaman alabilir).');
      return;
    }

    throw new Error('Gecersiz deploy scope. `guild` veya `global` kullan.');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
})();
