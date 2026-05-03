const { EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/dataStore');
const { ensureSeasonSystem, checkAndAdvanceSeason } = require('../utils/gameEngine');
const { getGuildPrefix } = require('../utils/guildSettings');

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function tokenize(input) {
  const tokens = [];
  const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(\S+)/g;
  let match;
  while ((match = regex.exec(input)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
}

function mapRole(raw) {
  const v = normalizeText(raw).replace(/\s+/g, '').replace(/_/g, '-');
  if (['futbolcu'].includes(v)) return 'futbolcu';
  if (['teknikdirektor', 'teknik-direktor', 'td', 'hoca'].includes(v)) return 'teknik-direktor';
  if (['kulupsahibi', 'kulup-sahibi', 'sahip'].includes(v)) return 'kulup-sahibi';
  return null;
}

function mapAction(raw) {
  const v = normalizeText(raw);
  if (['sut', 'sutcek', 'shot'].includes(v)) return 'sut';
  if (['pas', 'pass'].includes(v)) return 'pas';
  if (['dripling', 'dribbling', 'drip'].includes(v)) return 'dripling';
  return null;
}

function mapDecision(raw) {
  const v = normalizeText(raw);
  if (['basinaters', 'basina-ters', 'ters'].includes(v)) return 'basina-ters';
  if (['takimodakli', 'takim-odakli', 'odak'].includes(v)) return 'takim-odakli';
  if (['pasvermeme', 'pas-vermeme', 'egoist'].includes(v)) return 'pas-vermeme';
  if (['gecehayati', 'gece-hayati', 'gece'].includes(v)) return 'gece-hayati';
  return null;
}

function mapTrainingType(raw) {
  const v = normalizeText(raw);
  if (['normal'].includes(v)) return 'normal';
  if (['ozel', 'o'] .includes(v)) return 'ozel';
  return null;
}

function mapTransferOp(raw) {
  const v = normalizeText(raw);
  if (['teklif', 'olustur', 'offer'].includes(v)) return 'teklif';
  if (['kabul', 'accept'].includes(v)) return 'kabul';
  if (['ret', 'reddet', 'reject'].includes(v)) return 'ret';
  if (['durum', 'status'].includes(v)) return 'durum';
  return null;
}

function mapYonetimOp(raw) {
  const v = normalizeText(raw);
  if (['sponsor'].includes(v)) return 'sponsor';
  if (['transfer-butce', 'transferbutce', 'butce'].includes(v)) return 'transfer-butce';
  if (['hoca-al', 'hocaal', 'iseal'].includes(v)) return 'hoca-al';
  if (['hoca-kov', 'hocakov', 'kov'].includes(v)) return 'hoca-kov';
  return null;
}

async function resolveUserArg(message, raw) {
  if (message.mentions.users.size > 0) {
    return message.mentions.users.first();
  }

  if (!raw) return null;
  const id = raw.replace(/[<@!>]/g, '');
  if (!/^\d{16,20}$/.test(id)) return null;

  try {
    return await message.client.users.fetch(id);
  } catch {
    return null;
  }
}

function sanitizePayload(payload) {
  if (typeof payload === 'string') return { content: payload };
  if (!payload || typeof payload !== 'object') return { content: String(payload) };

  const out = { ...payload };
  delete out.ephemeral;
  return out;
}

function createMockInteraction(message, optionValues) {
  return {
    client: message.client,
    guildId: message.guildId,
    user: message.author,
    memberPermissions: message.member?.permissions,
    replied: false,
    deferred: false,
    options: {
      getString(name, required = false) {
        const value = optionValues[name];
        if ((value === undefined || value === null || value === '') && required) {
          throw new Error(`Gerekli string option eksik: ${name}`);
        }
        if (value === undefined || value === null) return null;
        return String(value);
      },
      getInteger(name, required = false) {
        const value = optionValues[name];
        if ((value === undefined || value === null || value === '') && required) {
          throw new Error(`Gerekli integer option eksik: ${name}`);
        }
        if (value === undefined || value === null || value === '') return null;
        const n = Number(value);
        return Number.isInteger(n) ? n : null;
      },
      getBoolean(name) {
        const value = optionValues[name];
        if (value === undefined || value === null) return null;
        return Boolean(value);
      },
      getUser(name) {
        const value = optionValues[name];
        return value || null;
      },
      getAttachment(name) {
        const value = optionValues[name];
        return value || null;
      }
    },
    async reply(payload) {
      this.replied = true;
      return message.reply(sanitizePayload(payload));
    },
    async followUp(payload) {
      return message.reply(sanitizePayload(payload));
    }
  };
}

async function runSlashExecuteFromMessage(message, slashName, optionValues = {}) {
  const command = message.client.commands.get(slashName);
  if (!command) {
    return message.reply(`Komut bulunamadi: ${slashName}`);
  }

  const interaction = createMockInteraction(message, optionValues);
  return command.execute(interaction);
}

const commandAliasMap = {
  yardim: 'yardım',
  yardım: 'yardım',
  help: 'yardım',
  basla: 'başla',
  profil: 'profil',
  mac: 'maç',
  antrenman: 'antrenman',
  transfer: 'transfer',
  lig: 'lig',
  siralama: 'sıralama',
  gunluk: 'günlük',
  claim: 'claim',
  reroll: 'reroll',
  'golden-claim': 'golden-claim',
  goldenclaim: 'golden-claim',
  cd: 'cd',
  friendly: 'friendly',
  arena: 'arena',
  taktik: 'taktik',
  yonetim: 'yönetim',
  prefix: 'prefix',
  cekilis: 'çekiliş',
  'çekiliş': 'çekiliş',
  'booster-cekilis': 'booster-çekiliş',
  'booster-çekiliş': 'booster-çekiliş',
  'ticket-sistemi': 'ticket-sistemi',
  ticket: 'ticket-sistemi',
  'kariyer-sil': 'kariyer-sil',
  kariyersil: 'kariyer-sil',
  sil: 'kariyer-sil',
  karakter: 'karakter-oluştur',
  'karakter-olustur': 'karakter-oluştur'
};

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (!message.guild || message.author.bot) return;

    const data = readData();
    ensureSeasonSystem(data);
    checkAndAdvanceSeason(data);

    const prefix = getGuildPrefix(data, message.guild.id);
    writeData(data);

    if (!message.content.toLowerCase().startsWith(prefix.toLowerCase())) return;

    const raw = message.content.slice(prefix.length).trim();
    if (!raw) return;

    const tokens = tokenize(raw);
    if (tokens.length === 0) return;

    const base = normalizeText(tokens[0]);
    const slashName = commandAliasMap[base];
    if (!slashName) return;

    const args = tokens.slice(1);

    try {
      if (slashName === 'yardım') {
        return runSlashExecuteFromMessage(message, 'yardım');
      }

      if (slashName === 'başla') {
        const role = mapRole(args[0]);
        if (!role) {
          return message.reply(`Kullanim: ${prefix}basla <futbolcu|teknik-direktor|kulup-sahibi>`);
        }
        return runSlashExecuteFromMessage(message, 'başla', { rol: role });
      }

      if (slashName === 'karakter-oluştur') {
        if (args.length < 4) {
          return message.reply(`Kullanim: ${prefix}karakter "Isim" <yas> <ulke> <pozisyon>`);
        }

        const name = args[0];
        const age = Number(args[1]);
        if (!Number.isInteger(age)) {
          return message.reply('Yas sayi olmali.');
        }

        return runSlashExecuteFromMessage(message, 'karakter-oluştur', {
          isim: name,
          yas: age,
          ulke: args[2],
          pozisyon: args[3]
        });
      }

      if (slashName === 'profil') {
        const target = await resolveUserArg(message, args[0]);
        return runSlashExecuteFromMessage(message, 'profil', {
          oyuncu: target || null
        });
      }

      if (slashName === 'maç') {
        const action = mapAction(args[0]);
        if (!action) {
          return message.reply(`Kullanim: ${prefix}mac <sut|pas|dripling> [karar]`);
        }

        const decision = args[1] ? mapDecision(args[1]) : null;
        return runSlashExecuteFromMessage(message, 'maç', {
          aksiyon: action,
          karar: decision
        });
      }

      if (slashName === 'antrenman') {
        const tip = args[0] ? mapTrainingType(args[0]) : null;
        return runSlashExecuteFromMessage(message, 'antrenman', {
          tip: tip || null
        });
      }

      if (slashName === 'transfer') {
        const islem = mapTransferOp(args[0]);
        if (!islem) {
          return message.reply(`Kullanim: ${prefix}transfer <teklif|kabul|ret|durum>`);
        }

        return runSlashExecuteFromMessage(message, 'transfer', { islem });
      }

      if (
        slashName === 'lig' ||
        slashName === 'sıralama' ||
        slashName === 'günlük' ||
        slashName === 'claim' ||
        slashName === 'reroll' ||
        slashName === 'golden-claim' ||
        slashName === 'cd' ||
        slashName === 'arena' ||
        slashName === 'çekiliş' ||
        slashName === 'booster-çekiliş'
      ) {
        return runSlashExecuteFromMessage(message, slashName);
      }

      if (slashName === 'friendly') {
        const target = await resolveUserArg(message, args[0]);
        if (!target) {
          return message.reply(`Kullanim: ${prefix}friendly @kullanici`);
        }

        return runSlashExecuteFromMessage(message, 'friendly', { kullanici: target });
      }

      if (slashName === 'taktik') {
        if (!args[0]) {
          return message.reply(`Kullanim: ${prefix}taktik "dizilim" [ilk11]`);
        }

        const dizilim = args[0];
        const ilk11 = args.slice(1).join(' ').trim();
        return runSlashExecuteFromMessage(message, 'taktik', {
          dizilim,
          ilk11: ilk11 || null
        });
      }

      if (slashName === 'yönetim') {
        const islem = mapYonetimOp(args[0]);
        if (!islem) {
          return message.reply(`Kullanim: ${prefix}yonetim <sponsor|transfer-butce|hoca-al|hoca-kov> [miktar]`);
        }

        const miktar = args[1] ? Number(args[1]) : null;
        return runSlashExecuteFromMessage(message, 'yönetim', {
          islem,
          miktar: Number.isInteger(miktar) ? miktar : null
        });
      }

      if (slashName === 'prefix') {
        return runSlashExecuteFromMessage(message, 'prefix', {
          deger: args[0] || null
        });
      }

      if (slashName === 'ticket-sistemi') {
        return runSlashExecuteFromMessage(message, 'ticket-sistemi', {});
      }

      if (slashName === 'kariyer-sil') {
        const onayRaw = args[0] || '';
        const onay = normalizeText(onayRaw) === 'evet' ? 'EVET' : onayRaw;
        return runSlashExecuteFromMessage(message, 'kariyer-sil', { onay });
      }
    } catch (error) {
      console.error(error);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff3b30)
            .setTitle('Hata olustu')
            .setDescription('Prefix komutu islenirken bir hata olustu. Kullanim bicimini kontrol et.')
            .setTimestamp()
        ]
      });
    }
  }
};
