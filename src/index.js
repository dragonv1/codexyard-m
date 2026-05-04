require('dotenv').config();
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { ensureDataFile } = require('./utils/dataStore');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

let discordReady = false;
const wsStateName = {
  0: 'IDLE',
  1: 'CONNECTING',
  2: 'RESUMING',
  3: 'READY',
  4: 'NEARLY',
  5: 'DISCONNECTED',
  6: 'WAITING_FOR_GUILDS',
  7: 'IDENTIFYING',
  8: 'RECONNECTING'
};

function isDiscordReady() {
  return discordReady || client.ws.status === 3;
}

process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
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

client.on('shardReady', (id) => {
  console.log(`Shard hazir: #${id}`);
});

client.on('shardDisconnect', (event, id) => {
  console.error(`Shard baglanti koptu: #${id}, code=${event?.code ?? 'bilinmiyor'}`);
  discordReady = false;
});

client.on('shardReconnecting', (id) => {
  console.warn(`Shard yeniden baglaniyor: #${id}`);
  discordReady = false;
});

client.on('shardResume', (id, replayed) => {
  console.log(`Shard resume: #${id}, replayed=${replayed}`);
  discordReady = true;
});

client.on('invalidated', () => {
  console.error('Discord session invalidated. Token/connection kontrol et.');
  discordReady = false;
});

client.once('clientReady', () => {
  discordReady = true;
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

const token = process.env.DISCORD_TOKEN?.trim();
if (!token) {
  console.error('DISCORD_TOKEN bulunamadi. .env dosyasini kontrol et.');
  process.exit(1);
}

if (process.env.DISCORD_TOKEN !== token) {
  console.warn('DISCORD_TOKEN bas/son bosluk iceriyor olabilir, trim uygulanarak login denenecek.');
}

console.log(`Discord token algilandi. Uzunluk: ${token.length}`);

setTimeout(() => {
  if (!isDiscordReady()) {
    const wsStatus = client.ws.status;
    console.error(
      `Uyari: Bot 45 saniyede READY olmadi. WS durum=${wsStatus} (${wsStateName[wsStatus] ?? 'BILINMIYOR'}).`
    );
  }
}, 45_000);

const startupProbe = setInterval(() => {
  if (isDiscordReady()) {
    clearInterval(startupProbe);
    return;
  }

  const wsStatus = client.ws.status;
  console.log(`Startup probe: WS durum=${wsStatus} (${wsStateName[wsStatus] ?? 'BILINMIYOR'})`);
}, 20_000);

// Render gibi web servis ortamlari bir PORT uzerinden canli endpoint bekleyebilir.
if (process.env.PORT) {
  const port = Number(process.env.PORT);
  const healthServer = http.createServer((req, res) => {
    const wsStatus = client.ws.status;
    const wsName = wsStateName[wsStatus] ?? 'BILINMIYOR';

    if (req.url === '/health') {
      const ok = isDiscordReady();
      res.writeHead(ok ? 200 : 503, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          ok,
          service: 'discord-futbol-rp-bot',
          discordReady,
          wsStatus,
          wsState: wsName,
          timestamp: Date.now()
        })
      );
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(isDiscordReady() ? 'Discord bot aktif.' : `Discord bot bagli degil. WS=${wsName}`);
  });

  healthServer.listen(port, () => {
    console.log(`Health endpoint acik: http://0.0.0.0:${port}/health`);
  });
}

client.login(token).catch((err) => {
  console.error('Discord login failed:', err);
  process.exit(1);
});
