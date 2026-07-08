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
// FETCH JSON
// =====================================

async function fetchJSON(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,

      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    return response.data;
  } catch (err) {
    return null;
  }
}

// =====================================
// GET PLAYERS
// =====================================

async function getPlayers(serverKey) {
  const server = SERVERS[serverKey];

  if (!server) {
    return null;
  }

  // CACHE 15 DETIK
  if (cache[serverKey] && Date.now() - cache[serverKey].timestamp < 15000) {
    return cache[serverKey].data;
  }

  const endpoint = server.endpoint;

  let players = null;

  // HTTPS
  players = await fetchJSON(`https://${endpoint}/players.json`);

  // HTTP FALLBACK
  if (!players) {
    players = await fetchJSON(`http://${endpoint}/players.json`);
  }

  cache[serverKey] = {
    timestamp: Date.now(),
    data: players,
  };

  return players;
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

  const id = String(player.id).padStart(4, " ");

  return `${pingIcon} ${id} ${player.name} ${player.ping}ms`;
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
  // !allplayer ime
  // =====================================

  if (command === "allplayer") {
    const serverKey = args[0]?.toLowerCase();

    if (!serverKey) {
      return message.reply("Contoh:\n!allplayer ime");
    }

    if (!SERVERS[serverKey]) {
      return message.reply("❌ Server tidak ditemukan");
    }

    const loading = await message.reply("🔍 Mengambil player list...");

    const players = await getPlayers(serverKey);

    if (!players) {
      return loading.edit("❌ players.json tidak bisa diakses");
    }

    // SORT PLAYER ID
    players.sort((a, b) => a.id - b.id);

    const GROUP_SIZE = 20;

    const pages = [];

    let currentPage = "";

    let groupNumber = 1;

    for (let i = 0; i < players.length; i++) {
      const player = players[i];

      // HEADER GROUP
      if (i % GROUP_SIZE === 0) {
        const start = i + 1;

        const end = Math.min(i + GROUP_SIZE, players.length);

        currentPage += `👥 Pemain ${start}-${end}\n`;

        currentPage += `📋 Grup ${groupNumber}\n`;

        groupNumber++;
      }

      currentPage += formatPlayerLine(player) + "\n";

      // LIMIT DISCORD
      if (currentPage.length > 1700) {
        pages.push(currentPage);

        currentPage = "";
      }
    }

    // PUSH SISA PAGE
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    await loading.delete();

    // SEND PAGE
    for (let i = 0; i < pages.length; i++) {
      await message.channel.send({
        content:
          "```" + `${pages[i]}\nHalaman ${i + 1}/${pages.length}` + "```",
      });
    }
  }

  // =====================================
  // !player ime wt
  // =====================================

  if (command === "player") {
    const serverKey = args[0]?.toLowerCase();

    const keyword = args.slice(1).join(" ");

    if (!serverKey || !keyword) {
      return message.reply("Contoh:\n!player ime wt");
    }

    if (!SERVERS[serverKey]) {
      return message.reply("❌ Server tidak ditemukan");
    }

    const loading = await message.reply("🔍 Searching player...");

    const players = await getPlayers(serverKey);

    if (!players) {
      return loading.edit("❌ players.json tidak bisa diakses");
    }

    const filtered = players.filter((p) =>
      p.name.toLowerCase().includes(keyword.toLowerCase()),
    );

    if (!filtered.length) {
      return loading.edit(`❌ Player "${keyword}" tidak ditemukan`);
    }

    let result = "";

    filtered.forEach((player) => {
      result += formatPlayerLine(player) + "\n";
    });

    // SPLIT RESULT
    const chunks = [];

    while (result.length > 1800) {
      chunks.push(result.substring(0, 1800));

      result = result.substring(1800);
    }

    chunks.push(result);

    await loading.delete();

    for (let i = 0; i < chunks.length; i++) {
      await message.channel.send({
        content:
          "```" +
          `🔍 Hasil pencarian "${keyword}"\n\n` +
          chunks[i] +
          `\nHalaman ${i + 1}/${chunks.length}` +
          "```",
      });
    }
  }
});

// =====================================
// LOGIN
// =====================================

client.login(process.env.DISCORD_TOKEN);
