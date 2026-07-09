require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// =====================================
// CONFIG
// =====================================
const PREFIX = process.env.PREFIX || "!";

const SERVERS = {
  ime: {
    name: "IME Roleplay",
    endpoint: "210.247.249.178:30120",
  },
  smrp: {
    name: "SatuMimpi Roleplay",
    endpoint: "49.128.187.46:30120",
  },
  ckrp: {
    name: "Cerita Kita Roleplay",
    endpoint: "49.128.187.42:30120",
  },
  cerita: {
    name: "Cerita Roleplay",
    endpoint: "49.128.187.106:30120",
  },
  exe: {
    name: "EXECUTIVE Roleplay",
    endpoint: "172.67.202.32:30120",
  },
};

// =====================================
// CACHE
// =====================================
const cache = {};

// =====================================
// FETCH JSON (Dioptimalkan untuk API FiveM)
// =====================================
async function fetchJSON(url) {
  try {
    const response = await axios.get(url, {
      timeout: 4000, // Timeout diturunkan ke 4 detik agar fallback HTTP berjalan cepat jika HTTPS gagal
      headers: {
        // User-Agent menyerupai browser asli + header wajib server Cfx.re
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    // Pastikan data yang kembali berupa Array (Format players.json)
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    return null;
  } catch (err) {
    return null;
  }
}

// =====================================
// GET PLAYERS
// =====================================
async function getPlayers(serverKey) {
  const server = SERVERS[serverKey];
  if (!server) return null;

  // CACHE 15 DETIK
  if (cache[serverKey] && Date.now() - cache[serverKey].timestamp < 15000) {
    return cache[serverKey].data;
  }

  const endpoint = server.endpoint;
  let players = null;

  // 1. Coba lewat HTTP biasa (Rekomendasi utama untuk port 30120 mentah)
  players = await fetchJSON(`http://${endpoint}/players.json`);

  // 2. Fallback ke HTTPS jika HTTP gagal
  if (!players) {
    players = await fetchJSON(`https://${endpoint}/players.json`);
  }

  if (players) {
    cache[serverKey] = {
      timestamp: Date.now(),
      data: players,
    };
  }

  return players;
}

// =====================================
// READY
// =====================================
client.once("ready", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

// =====================================
// FORMAT PLAYER (Merapikan Spasi & Kolom)
// =====================================
function formatPlayerLine(player) {
  let pingIcon = "🟢";
  if (player.ping >= 90) {
    pingIcon = "🔴";
  } else if (player.ping >= 50) {
    pingIcon = "🟡";
  }

  // Menggunakan padEnd/padStart agar kolom ID, Nama, dan Ping sejajar sempurna di dalam format codeblock (```)
  const idStr = `[ID: ${player.id}]`.padEnd(10, " ");
  const nameStr = player.name.substring(0, 20).padEnd(22, " ");
  const pingStr = `${player.ping}ms`.padStart(6, " ");

  return `${pingIcon} ${idStr} ${nameStr} | ${pingStr}`;
}

// =====================================
// COMMAND HANDLER
// =====================================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  // =====================================
  // !server
  // =====================================
  if (command === "server") {
    let text = "📡 Available Servers\n\n";
    Object.keys(SERVERS).forEach((key) => {
      text += `• ${key} → ${SERVERS[key].name}\n`;
    });
    return message.reply(text);
  }

  // =====================================
  // !allplayer
  // =====================================
  if (command === "allplayer") {
    const serverKey = args[0]?.toLowerCase();

    if (!serverKey) {
      return message.reply(`Contoh:\n${PREFIX}allplayer ime`);
    }

    if (!SERVERS[serverKey]) {
      return message.reply("❌ Server tidak ditemukan");
    }

    const loading = await message.reply("🔍 Mengambil player list...");
    const players = await getPlayers(serverKey);

    if (!players) {
      return loading.edit(
        `❌ Gagal mengakses data ${SERVERS[serverKey].name} (${SERVERS[serverKey].endpoint}). Server mungkin sedang offline atau memblokir bot.`,
      );
    }

    if (players.length === 0) {
      return loading.edit(
        `ℹ️ Server ${SERVERS[serverKey].name} sedang kosong (0 Player).`,
      );
    }

    // SORT PLAYER ID
    players.sort((a, b) => a.id - b.id);

    const GROUP_SIZE = 20;
    const pages = [];
    let currentPage = "";
    let groupNumber = 1;

    for (let i = 0; i < players.length; i++) {
      const player = players[i];

      if (i % GROUP_SIZE === 0) {
        const start = i + 1;
        const end = Math.min(i + GROUP_SIZE, players.length);
        currentPage += `👥 Pemain ${start}-${end} (Grup ${groupNumber})\n`;
        currentPage += `-----------------------------------------\n`;
        groupNumber++;
      }

      currentPage += formatPlayerLine(player) + "\n";

      if (currentPage.length > 1500) {
        pages.push(currentPage);
        currentPage = "";
      }
    }

    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    await loading.delete().catch(() => {});

    // SEND PAGE
    for (let i = 0; i < pages.length; i++) {
      await message.channel.send({
        content:
          "```text\n" +
          `${pages[i]}\nHalaman ${i + 1}/${pages.length}` +
          "\n```",
      });
    }
  }

  // =====================================
  // !player
  // =====================================
  if (command === "player") {
    const serverKey = args[0]?.toLowerCase();
    const keyword = args.slice(1).join(" ");

    if (!serverKey || !keyword) {
      return message.reply(`Contoh:\n${PREFIX}player ime wt`);
    }

    if (!SERVERS[serverKey]) {
      return message.reply("❌ Server tidak ditemukan");
    }

    const loading = await message.reply("🔍 Searching player...");
    const players = await getPlayers(serverKey);

    if (!players) {
      return loading.edit(
        `❌ Gagal mengakses data ${SERVERS[serverKey].name}. Server mungkin sedang offline.`,
      );
    }

    const filtered = players.filter((p) =>
      p.name.toLowerCase().includes(keyword.toLowerCase()),
    );

    if (!filtered.length) {
      return loading.edit(`❌ Player dengan nama "${keyword}" tidak ditemukan`);
    }

    let result = "";
    filtered.forEach((player) => {
      result += formatPlayerLine(player) + "\n";
    });

    const chunks = [];
    while (result.length > 1500) {
      chunks.push(result.substring(0, 1500));
      result = result.substring(1500);
    }
    chunks.push(result);

    await loading.delete().catch(() => {});

    for (let i = 0; i < chunks.length; i++) {
      await message.channel.send({
        content:
          "```text\n" +
          `🔍 Hasil pencarian "${keyword}" di ${SERVERS[serverKey].name}\n` +
          `-----------------------------------------\n` +
          chunks[i] +
          `\nHalaman ${i + 1}/${chunks.length}` +
          "\n```",
      });
    }
  }
});

// =====================================
// LOGIN
// =====================================
client.login(process.env.DISCORD_TOKEN);
