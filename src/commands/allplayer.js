const { getServer } = require("../config/servers");
const { getServerData } = require("../services/fivemService");
const {
  generatePlayerEmbeds,
  createServerHeaderEmbed,
} = require("../utils/embedBuilder");

module.exports = {
  name: "allplayer",
  description: "Melihat seluruh pemain yang sedang online di suatu server",
  async execute(message, args, { prefix }) {
    const serverKey = args[0]?.toLowerCase();

    if (!serverKey) {
      return message.reply(`⚠️ **Penggunaan:** \`${prefix}allplayer <kode_server>\`\nContoh: \`${prefix}allplayer ime\``);
    }

    const server = getServer(serverKey);
    if (!server) {
      return message.reply(`❌ Server dengan kode \`${serverKey}\` tidak ditemukan. Ketik \`${prefix}server\` untuk melihat daftar server.`);
    }

    const loadingMsg = await message.reply(`🔍 Mengambil data pemain **${server.name}**...`);

    try {
      const serverData = await getServerData(server, serverKey);

      if (!serverData || !serverData.success) {
        return loadingMsg.edit(
          `❌ **${serverData?.error || "Gagal mengambil data dari server FiveM."}**`,
        );
      }

      const { players, totalOnline, maxClients, bannerUrl, iconUrl, isAnonymized, source } = serverData;

      if (!players || players.length === 0) {
        return loadingMsg.edit(
          `ℹ️ Server **${server.name}** sedang kosong (\`0/${maxClients || 0}\` Pemain).`,
        );
      }

      await loadingMsg.delete().catch(() => {});

      // Jika server mengaktifkan proteksi anonimitas (Anon0 / Player)
      if (isAnonymized) {
        const anonEmbed = createServerHeaderEmbed({
          title: `📡 STATUS SERVER: ${server.name.toUpperCase()}`,
          description:
            `⚠️ **Player Privacy Protection Aktif**\n` +
            `Server ini menggunakan proteksi privasi pemain (*Streamer Mode / Anti-Stalking*). ` +
            `Daftar nama pemain sengaja disamarkan oleh server menjadi \`Anon\` pada daftar publik untuk melindungi privasi pemain.\n\n` +
            `• Sumber Data: \`${source.toUpperCase()}\`\n` +
            `• Status: **Online & Normal**`,
          serverName: server.name,
          totalOnline: totalOnline || players.length,
          maxClients,
          totalPages: 1,
          bannerUrl,
          iconUrl,
          color: "#ffaa00",
        });

        return message.channel.send({ embeds: [anonEmbed] });
      }

      // Jika server menampilkan nama asli (seperti SatuMimpi dsb.)
      players.sort((a, b) => a.id - b.id);

      const { embeds, totalPages } = generatePlayerEmbeds(
        players,
        server.name,
        "#00ffcc",
      );

      // 1. Kirim Header status utama server
      const headerEmbed = createServerHeaderEmbed({
        title: `📡 STATUS SERVER: ${server.name.toUpperCase()}`,
        serverName: server.name,
        totalOnline: totalOnline || players.length,
        maxClients,
        totalPages,
        bannerUrl,
        iconUrl,
        color: "#00ffcc",
      });

      await message.channel.send({ embeds: [headerEmbed] });

      // 2. Kirim embed list pemain secara berurutan
      for (const embed of embeds) {
        await message.channel.send({ embeds: [embed] });
      }
    } catch (err) {
      console.error(`Error in !allplayer (${serverKey}):`, err);
      return loadingMsg.edit("❌ Terjadi kesalahan sistem saat memproses data pemain.").catch(() => {});
    }
  },
};
