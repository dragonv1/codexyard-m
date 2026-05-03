require('dotenv').config();
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { ensureDataFile } = require('./utils/dataStore');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.on('error', (err) => {
  console.error('Discord client error:', err);
});

client.on('warn', (msg) => {
  console.warn('Discord warning:', msg);
});

client.on('shardError', (err) => {
  console.error('Discord shard error:', err);
});

client.on('invalidated', () => {
  console.error('Discord session invalidated. Token/connection kontrol et.');
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`[UYARI] ${file} dosyasi data/execute icermiyor.`);
  }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));
for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

ensureDataFile();

if (!process.env.DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN bulunamadi. .env dosyasini kontrol et.');
  process.exit(1);
}

// Render gibi web servis ortamlari bir PORT uzerinden canli endpoint bekleyebilir.
if (process.env.PORT) {
  const port = Number(process.env.PORT);
  const healthServer = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, service: 'discord-futbol-rp-bot' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Discord bot aktif.');
  });

  healthServer.listen(port, () => {
    console.log(`Health endpoint acik: http://0.0.0.0:${port}/health`);
  });
}

client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error('Discord login failed:', err);
  process.exit(1);
});
