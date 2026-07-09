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
    useCfx: true,
    cfxId: "3e3gdb",
    endpoint: "49.128.187.46:30120", // Ditambahkan IP asli sebagai jalur penyelamat otomatis
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
// FETCH JSON (Ditingkatkan dengan Proxy Bypasser)
// =====================================
async function fetchJSON(url) {
  // ALUR 1: Mencoba koneksi langsung ke server tujuan
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
      },
    });

    if (response.data) {
      return response.data;
    }
  } catch (err) {
    // Abaikan error langsung, lanjut menggunakan Proxy penyelamat
  }

  // ALUR 2: Jika terblokir, tembak melalui Proxy AllOrigins (Melalui Server Global non-hosting)
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const response = await axios.get(proxyUrl, {
      timeout: 6000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      },
    });

    if (response.data) {
      let parsed = response.data;
      // AllOrigins terkadang mengembalikan data mentah string, kita parse ke JSON
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }
      return parsed;
    }
  } catch (err) {
    // Lanjut ke proxy cadangan berikutnya jika AllOrigins sibuk
  }

  // ALUR 3: Cadangan Terakhir menggunakan CorsProxy.io
  try {
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
    const response = await axios.get(proxyUrl, {
      timeout: 6000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      },
    });

    if (response.data) {
      let parsed = response.data;
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }
      return parsed;
    }
  } catch (err) {
    // Semua alur buntu
  }

  return null;
}

// =====================================
// GET PLAYERS
// =====================================
async function getPlayers(serverKey) {
  const server = SERVERS[serverKey];
  if (!server) return { error: "Server tidak terdaftar di konfigurasi bot." };

  // CACHE 15 DETIK
  if (cache[serverKey] && Date.now() - cache[serverKey].timestamp < 15000) {
    return cache[serverKey].data;
  }

  let players = null;
  let diagnosticLog = "";

  // JALUR 1: Jika server menggunakan Cfx ID, telusuri API Cfx & Proxy Cfx
  if (server.useCfx && server.cfxId) {
    diagnosticLog += `👉 Mode: CfxId (${server.cfxId})\n`;

    // Alur 1: Coba New Cfx API resmi
    diagnosticLog += ` ├─ Mencoba New Cfx API... `;
    const cfxData = await fetchJSON(
      `https://frontend.cfx-services.net/api/servers/single/${server.cfxId}`,
    );

    const cfxPlayers = cfxData?.Data?.players || cfxData?.data?.players;
    if (cfxPlayers && Array.isArray(cfxPlayers)) {
      players = cfxPlayers;
      diagnosticLog += `SUKSES (${players.length} Players)\n`;
    } else {
      diagnosticLog += `GAGAL / DI-BLOKIR\n`;
    }

    // Alur 2: Coba Proxy Cadangan 1 (fivem-bot.de)
    if (!players) {
      diagnosticLog += ` ├─ Mencoba Proxy 1... `;
      const proxyUrl = `https://api.fivem-bot.de/v1/server/${server.cfxId}/players`;
      const proxyData = await fetchJSON(proxyUrl);

      if (proxyData && Array.isArray(proxyData)) {
        players = proxyData;
        diagnosticLog += `SUKSES (${players.length} Players)\n`;
      } else if (
        proxyData &&
        proxyData.players &&
        Array.isArray(proxyData.players)
      ) {
        players = proxyData.players;
        diagnosticLog += `SUKSES (${players.length} Players)\n`;
      } else {
        diagnosticLog += `GAGAL\n`;
      }
    }

    // Alur 3: Coba Proxy Alternatif (fivem.c99.nl)
    if (!players) {
      diagnosticLog += ` ├─ Mencoba Proxy Alternatif... `;
      const fallbackUrl = `https://fivem.c99.nl/api/players/?id=${server.cfxId}`;
      const fallbackData = await fetchJSON(fallbackUrl);

      if (
        fallbackData &&
        fallbackData.players &&
        Array.isArray(fallbackData.players)
      ) {
        players = fallbackData.players;
        diagnosticLog += `SUKSES (${players.length} Players)\n`;
      } else {
        diagnosticLog += `GAGAL\n`;
      }
    }
  }

  // JALUR 2: Jika JALUR 1 gagal / terblokir, ATAU server memang menggunakan IP mentah
  if (!players && server.endpoint) {
    diagnosticLog += `👉 Mode: IP Mentah (${server.endpoint})\n`;
    const endpoint = server.endpoint;

    diagnosticLog += ` ├─ Mencoba HTTP... `;
    players = await fetchJSON(`http://${endpoint}/players.json`);
    if (players && Array.isArray(players)) {
      diagnosticLog += `SUKSES (${players.length} Players)\n`;
    } else {
      diagnosticLog += `GAGAL\n`;
      diagnosticLog += ` └─ Mencoba HTTPS Fallback... `;
      players = await fetchJSON(`https://${endpoint}/players.json`);
      if (players && Array.isArray(players)) {
        diagnosticLog += `SUKSES (${players.length} Players)\n`;
      } else {
        diagnosticLog += `GAGAL\n`;
      }
    }
  }

  // Validasi akhir hasil array
  if (players && Array.isArray(players)) {
    cache[serverKey] = {
      timestamp: Date.now(),
      data: players,
    };
    return players;
  }

  // Jika seluruh rute dan proxy buntu
  return {
    error: "Gagal mengakses data. Server mungkin offline atau memblokir bot.",
    diagnostics: diagnosticLog,
  };
}

// =====================================
// READY
// =====================================
client.once("ready", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

// =====================================
// FORMAT PLAYER
// =====================================
function formatPlayerLine(player) {
  let pingIcon = "🟢";
  if (player.ping >= 90) {
    pingIcon = "🔴";
  } else if (player.ping >= 50) {
    pingIcon = "🟡";
  }

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

    // Deteksi jika yang kembali adalah objek error diagnostik
    if (!players || !Array.isArray(players)) {
      const errorMsg = players?.error || "Gagal mengakses data.";
      const diagMsg = players?.diagnostics || "Tidak ada log diagnostik.";
      const serverInfo = SERVERS[serverKey].endpoint
        ? SERVERS[serverKey].endpoint
        : `Cfx ID: ${SERVERS[serverKey].cfxId}`;

      return loading
        .edit(
          `❌ **${errorMsg}**\n\n` +
            `**Detail Server:** ${SERVERS[serverKey].name} (${serverInfo})\n` +
            `\`\`\`text\nLOG DIAGNOSTIK BOT:\n${diagMsg}\`\`\``,
        )
        .catch(() => {});
    }

    if (players.length === 0) {
      return loading
        .edit(`ℹ️ Server ${SERVERS[serverKey].name} sedang kosong (0 Player).`)
        .catch(() => {});
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

    // Deteksi jika yang kembali adalah objek error diagnostik
    if (!players || !Array.isArray(players)) {
      const errorMsg = players?.error || "Gagal mengakses data.";
      const diagMsg = players?.diagnostics || "Tidak ada log diagnostik.";
      const serverInfo = SERVERS[serverKey].endpoint
        ? SERVERS[serverKey].endpoint
        : `Cfx ID: ${SERVERS[serverKey].cfxId}`;

      return loading
        .edit(
          `❌ **${errorMsg}**\n\n` +
            `**Detail Server:** ${SERVERS[serverKey].name} (${serverInfo})\n` +
            `\`\`\`text\nLOG DIAGNOSTIK BOT:\n${diagMsg}\`\`\``,
        )
        .catch(() => {});
    }

    const filtered = players.filter((p) =>
      p.name.toLowerCase().includes(keyword.toLowerCase()),
    );

    if (!filtered.length) {
      return loading
        .edit(`❌ Player dengan nama "${keyword}" tidak ditemukan`)
        .catch(() => {});
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
