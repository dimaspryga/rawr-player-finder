const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "help",
  description: "Menampilkan panduan penggunaan bot FiveM Player Finder",
  async execute(message, args, { prefix }) {
    const embed = new EmbedBuilder()
      .setTitle("🤖 FiveM Player Finder - Panduan Bot")
      .setColor("#00ffcc")
      .setDescription(
        `Bot ini digunakan untuk mengecek status dan mencari pemain di server FiveM roleplay secara real-time melalui CDN Cfx.re resmi.\n\n` +
          `**Daftar Perintah:**\n` +
          `• \`${prefix}server\`\n` +
          `  Menampilkan semua daftar server FiveM yang didukung bot.\n\n` +
          `• \`${prefix}allplayer <kode_server>\`\n` +
          `  Menampilkan semua pemain yang sedang online (lengkap dengan Ping dan ID).\n` +
          `  *Contoh:* \`${prefix}allplayer ime\` atau \`${prefix}allplayer smrp\`\n\n` +
          `• \`${prefix}player <kode_server> <nama/keyword>\`\n` +
          `  Mencari pemain tertentu di server berdasarkan nama.\n` +
          `  *Contoh:* \`${prefix}player ime dimas\`\n\n` +
          `• \`${prefix}cfxstatus\`\n` +
          `  Mengecek status operasional resmi server dan infrastruktur FiveM/Cfx.re.\n\n` +
          `• \`${prefix}help\`\n` +
          `  Menampilkan panduan ini.`,
      )
      .setFooter({ text: "FiveM Player Finder Bot • Fast & Modern CDN" })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
