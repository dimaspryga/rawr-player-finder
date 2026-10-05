const { getServer } = require("../config/servers");
const { getServerData } = require("../services/fivemService");
const {
  generatePlayerEmbeds,
  createServerHeaderEmbed,
} = require("../utils/embedBuilder");

module.exports = {
  name: "player",
  description: "Mencari pemain tertentu di server berdasarkan nama atau kata kunci",
  async execute(message, args, { prefix }) {
    const serverKey = args[0]?.toLowerCase();
    const keyword = args.slice(1).join(" ").trim();

    if (!serverKey || !keyword) {
      return message.reply(`⚠️ **Penggunaan:** \`${prefix}player <kode_server> <nama/kata_kunci>\`\nContoh: \`${prefix}player smrp dimas\``);
    }

    const server = getServer(serverKey);
    if (!server) {
      return message.reply(`❌ Server dengan kode \`${serverKey}\` tidak ditemukan. Ketik \`${prefix}server\` untuk melihat daftar server.`);
    }

    const loadingMsg = await message.reply(`🔍 Mencari player dengan kata kunci **"${keyword}"** di **${server.name}**...`);

    try {
      const serverData = await getServerData(server, serverKey);

      if (!serverData || !serverData.success) {
        return loadingMsg.edit(
          `❌ **${serverData?.error || "Gagal mengambil data dari server FiveM."}**`,
        );
      }

      const { players, totalOnline, maxClients, bannerUrl, iconUrl, isAnonymized } = serverData;

      // Jika server mengaktifkan mode anonimitas
      if (isAnonymized) {
        return loadingMsg.edit(
          `🔒 **Pencarian Tidak Dapat Dilakukan**\n` +
          `Server **${server.name}** mengaktifkan proteksi anonimitas (*Streamer/Privacy Mode*), ` +
          `sehingga nama pemain disamarkan oleh server menjadi \`Anon\` pada API publik.\n` +
          `Total pemain online saat ini: \`${totalOnline}\` pemain.`,
        );
      }

      // Filter player berdasarkan keyword (case-insensitive)
      const keywordLower = keyword.toLowerCase();
      const filtered = players.filter((p) =>
        p.name.toLowerCase().includes(keywordLower),
      );

      if (!filtered.length) {
        return loadingMsg.edit(
          `❌ Pemain dengan nama/kata kunci **"${keyword}"** tidak ditemukan di **${server.name}** (Total online saat ini: \`${totalOnline}\`).`,
        );
      }

      filtered.sort((a, b) => a.id - b.id);

      // Generate card embeds hasil pencarian
      const { embeds, totalPages } = generatePlayerEmbeds(
        filtered,
        server.name,
        "#ffcc00",
      );

      await loadingMsg.delete().catch(() => {});

      // 1. Kirim Header hasil pencarian
      const searchHeaderEmbed = createServerHeaderEmbed({
        title: `🔍 HASIL PENCARIAN: "${keyword.toUpperCase()}"`,
        description: `Ditemukan **${filtered.length}** pemain cocok di **${server.name}**`,
        serverName: server.name,
        totalOnline: totalOnline || players.length,
        maxClients,
        totalPages,
        bannerUrl,
        iconUrl,
        color: "#ffcc00",
      });

      await message.channel.send({ embeds: [searchHeaderEmbed] });

      // 2. Kirim embed cards hasil pencarian
      for (const embed of embeds) {
        await message.channel.send({ embeds: [embed] });
      }
    } catch (err) {
      console.error(`Error in !player (${serverKey}):`, err);
      return loadingMsg.edit("❌ Terjadi kesalahan sistem saat mencari data pemain.").catch(() => {});
    }
  },
};
