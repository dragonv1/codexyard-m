const path = require('node:path');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

const HELP_GIF_FILE_NAME = 'yardim.gif';
const HELP_GIF_PATH = path.join(__dirname, '..', '..', 'assets', 'gifs', HELP_GIF_FILE_NAME);

function buildHelpPayload(prefix) {
  const file = new AttachmentBuilder(HELP_GIF_PATH, { name: HELP_GIF_FILE_NAME });

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('Yardim Menusu | Futbol RP')
    .setDescription(
      `Aktif prefix: **${prefix}**\n` +
      `Slash komutlar: \`/yardım\` ve diger \`/\` komutlari\n` +
      `Prefix yardim: \`${prefix}yardim\` veya \`${prefix}yardım\``
    )
    .addFields(
      { name: 'Baslangic', value: '`/başla` ` /karakter-oluştur` ` /profil`' },
      { name: 'Rekabet', value: '`/arena` ` /friendly` ` /lig` ` /sıralama`' },
      { name: 'Gelisim', value: '`/antrenman` ` /maç` ` /claim` ` /reroll` ` /golden-claim` ` /günlük`' },
      { name: 'Etkinlik', value: '`/çekiliş` ` /booster-çekiliş` ` /ticket-sistemi`' },
      { name: 'Ayarlar', value: '`/prefix` ` /cd` ` /yardım` ` /kariyer-sil`' },
      { name: 'Bot Sunucusu', value: 'https://discord.gg/TjKNHMhMXb' }
    )
    .setImage(`attachment://${HELP_GIF_FILE_NAME}`)
    .setFooter({ text: 'Futbol RP Botu' })
    .setTimestamp();

  return {
    embeds: [embed],
    files: [file]
  };
}

module.exports = {
  buildHelpPayload
};
