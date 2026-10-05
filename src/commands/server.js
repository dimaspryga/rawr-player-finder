const { EmbedBuilder } = require("discord.js");
const { SERVERS } = require("../config/servers");

module.exports = {
  name: "server",
  description: "Menampilkan daftar server FiveM yang terdaftar di bot",
  async execute(message, args, { prefix }) {
    // Kumpulkan server unik (menghindari duplikasi alias seperti idp2)
    const uniqueServers = new Map();
    for (const [key, server] of Object.entries(SERVERS)) {
      if (!uniqueServers.has(server.name)) {
        uniqueServers.set(server.name, { key, ...server });
      }
    }

    const serverListText = Array.from(uniqueServers.values())
      .map((s) => {
        const typeBadge = s.cfxId ? "`CFX CDN`" : "`DIRECT`";
        return `• **${s.key}** → ${s.name} ${typeBadge}`;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("📡 Daftar Server FiveM Tersedia")
      .setColor("#00ffcc")
      .setDescription(
        `Gunakan perintah berikut untuk melihat pemain:\n` +
          `• \`${prefix}allplayer <kode>\` - Lihat semua pemain\n` +
          `• \`${prefix}player <kode> <nama>\` - Cari pemain\n\n` +
          `**Daftar Server:**\n${serverListText}`,
      )
      .setFooter({ text: `Total: ${uniqueServers.size} Server` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
