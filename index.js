require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const axios = require("axios");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = process.env.PREFIX || "!";

const SERVERS = {
  ime: { name: "IME Roleplay", endpoint: "210.247.249.178:30120" },
  smrp: { name: "SatuMimpi Roleplay", endpoint: "49.128.187.46:30120" },
  ckrp: { name: "Cerita Kita Roleplay", endpoint: "49.128.187.42:30120" },
  cerita: { name: "Cerita Roleplay", endpoint: "49.128.187.106:30120" },
  exe: { name: "EXECUTIVE Roleplay", endpoint: "49.128.187.50:30120" },
  pz: { name: "Project Zero", endpoint: "210.247.249.98:30120" },
  idp: { name: "INDOPRIDE Roleplay", endpoint: "31.58.143.48:30120" },
  idp2: { name: "INDOPRIDE Cfx Roleplay", cfxId: "bak4pl", useCfx: true },
  gp: { name: "Garuda Prime Roleplay", endpoint: "49.128.187.58:30120" },
  knrp: { name: "Kisah Nusantara Roleplay", endpoint: "49.128.187.82:30120" },
  lp: { name: "Last Paradise Roleplay", endpoint: "104.234.180.112:30120" },
};

const cache = {};
let lastWorkingProxy = null;

async function fetchWithParallelProxies(url) {
  let proxies = [];
  try {
    const res = await axios.get(
      "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=id&ssl=all&anonymity=all",
      { timeout: 3000 },
    );
    proxies = res.data
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.includes(":"));
  } catch (err) {
    try {
      const res = await axios.get(
        "https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&proxy_format=protocolipport&format=text&country=id&proxy_type=http",
        { timeout: 3000 },
      );
      proxies = res.data
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.includes(":"));
    } catch (err2) {}
  }

  proxies = [...new Set(proxies)].slice(0, 15);
  if (proxies.length === 0) return null;

  const requestWithProxy = async (proxyStr) => {
    const [host, port] = proxyStr.split(":");
    try {
      const response = await axios.get(url, {
        timeout: 4500,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json, text/plain, */*",
        },
        proxy: { protocol: "http", host, port: parseInt(port) },
      });
      if (response.data) {
        lastWorkingProxy = { host, port: parseInt(port) };
        return response.data;
      }
      throw new Error("Data kosong");
    } catch (err) {
      throw err;
    }
  };

  try {
    return await Promise.any(proxies.map((p) => requestWithProxy(p)));
  } catch (err) {
    return null;
  }
}

async function fetchJSON(url) {
  try {
    const response = await axios.get(url, {
      timeout: 2500,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json, text/plain, */*",
      },
    });
    if (response.data) return response.data;
  } catch (err) {}

  if (lastWorkingProxy) {
    try {
      const response = await axios.get(url, {
        timeout: 2500,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        proxy: {
          protocol: "http",
          host: lastWorkingProxy.host,
          port: lastWorkingProxy.port,
        },
      });
      if (response.data) return response.data;
    } catch (err) {
      lastWorkingProxy = null;
    }
  }

  const proxyBypassData = await fetchWithParallelProxies(url);
  if (proxyBypassData) return proxyBypassData;

  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const response = await axios.get(proxyUrl, { timeout: 3000 });
    if (response.data) {
      let parsed = response.data;
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      return parsed;
    }
  } catch (err) {}

  return null;
}

async function getPlayers(serverKey) {
  const server = SERVERS[serverKey];
  if (!server) return { error: "Server tidak terdaftar di konfigurasi bot." };

  if (cache[serverKey] && Date.now() - cache[serverKey].timestamp < 15000) {
    return cache[serverKey].data;
  }

  let players = null;
  let totalOnline = 0;
  let maxClients = 0;
  let bannerUrl = null;
  let diagnosticLog = "";

  if (server.useCfx && server.cfxId) {
    diagnosticLog += `👉 Mode: CfxId (${server.cfxId})\n`;
    try {
      const cfxData = await fetchJSON(
        `https://servers-frontend.fivem.net/api/servers/single/${server.cfxId}`,
      );
      const dataObj = cfxData?.Data || cfxData?.data;
      const cfxPlayers = dataObj?.players;

      if (dataObj) {
        totalOnline = dataObj.clients || 0;
        maxClients = dataObj.sv_maxclients || 0;
        bannerUrl = dataObj.vars?.banner_detail || null;
      }

      if (cfxPlayers && Array.isArray(cfxPlayers)) {
        players = cfxPlayers;
      }
    } catch (e) {
      diagnosticLog += `ERROR (${e.message})\n`;
    }
  }

  if (!players) {
    let targetEndpoint = server.endpoint;
    if (serverKey === "idp2") targetEndpoint = "kota.indopride.id:30120";

    if (targetEndpoint) {
      let directData = await fetchJSON(`http://${targetEndpoint}/players.json`);
      let infoData = await fetchJSON(`http://${targetEndpoint}/info.json`);

      if (!directData) {
        directData = await fetchJSON(`https://${targetEndpoint}/players.json`);
        infoData = await fetchJSON(`https://${targetEndpoint}/info.json`);
      }

      if (directData && Array.isArray(directData)) {
        players = directData;
        totalOnline = directData.length;
        maxClients =
          infoData?.vars?.sv_maxclients || infoData?.sv_maxclients || 0;
        bannerUrl = infoData?.vars?.banner_detail || null;
      }
    }
  }

  if (players && Array.isArray(players)) {
    const resultData = {
      playersList: players,
      totalOnline: totalOnline || players.length,
      maxClients: maxClients || 0,
      bannerUrl: bannerUrl,
    };
    cache[serverKey] = { timestamp: Date.now(), data: resultData };
    return resultData;
  }

  return {
    error: "Gagal mengakses data player.",
    diagnostics: diagnosticLog,
  };
}

client.once("ready", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

function formatPlayerLine(player) {
  let pingIcon = "🟢";
  if (player.ping >= 90) pingIcon = "🔴";
  else if (player.ping >= 50) pingIcon = "🟡";

  const shortName =
    player.name.length > 25 ? player.name.substring(0, 23) + ".." : player.name;
  return `\`${pingIcon}#${player.id}\` ${shortName} \`${player.ping}ms\``;
}

// Fungsi pembantu global untuk membagi data player menjadi beberapa embed berkapasitas 100 player per card
function generatePlayerEmbeds(
  playersList,
  serverName,
  embedTitleColor = "#00ffcc",
) {
  const embeds = [];
  const PLAYERS_PER_PAGE = 50; // Kapasitas 1 Card dinaikkan jadi 100 Player
  const totalPlayers = playersList.length;
  const totalPages = Math.ceil(totalPlayers / PLAYERS_PER_PAGE);

  for (let p = 0; p < totalPages; p++) {
    const startIndex = p * PLAYERS_PER_PAGE;
    const pagePlayers = playersList.slice(
      startIndex,
      startIndex + PLAYERS_PER_PAGE,
    );

    // Bagi rata isi array halaman menjadi 2 kolom (50 kiri, 50 kanan)
    const half = Math.ceil(pagePlayers.length / 2);
    const leftColPlayers = pagePlayers.slice(0, half);
    const rightColPlayers = pagePlayers.slice(half);

    const leftText =
      leftColPlayers.map((p) => formatPlayerLine(p)).join("\n") || "—";
    const rightText =
      rightColPlayers.map((p) => formatPlayerLine(p)).join("\n") || "—";

    const startNumber = startIndex + 1;
    const endNumber = Math.min(startIndex + PLAYERS_PER_PAGE, totalPlayers);

    const listEmbed = new EmbedBuilder()
      .setTitle(
        `👥 Player List: ${startNumber}-${endNumber} (Total: ${totalPlayers})`,
      )
      .setColor(embedTitleColor)
      .addFields(
        { name: "Kolom Kiri", value: leftText, inline: true },
        { name: "Kolom Kanan", value: rightText, inline: true },
      )
      .setFooter({
        text: `Halaman ${p + 1} dari ${totalPages} • ${serverName}`,
      });

    embeds.push(listEmbed);
  }
  return { embeds, totalPages };
}

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  if (command === "server") {
    let text = "📡 Available Servers\n\n";
    Object.keys(SERVERS).forEach((key) => {
      text += `• ${key} → ${SERVERS[key].name}\n`;
    });
    return message.reply(text);
  }

  if (command === "allplayer") {
    const serverKey = args[0]?.toLowerCase();
    if (!serverKey) return message.reply(`Contoh:\n${PREFIX}allplayer ime`);
    if (!SERVERS[serverKey]) return message.reply("❌ Server tidak ditemukan");

    const loading = await message.reply("🔍 Mengambil player list...");
    const serverData = await getPlayers(serverKey);

    if (!serverData || serverData.error) {
      return loading.edit(
        `❌ **${serverData?.error || "Gagal mengakses data."}**`,
      );
    }

    const { playersList, totalOnline, maxClients, bannerUrl } = serverData;

    if (playersList.length === 0) {
      return loading.edit(
        `ℹ️ Server ${SERVERS[serverKey].name} sedang kosong (0/${maxClients} Player).`,
      );
    }

    playersList.sort((a, b) => a.id - b.id);

    // Generate embeds dengan kapasitas 100 player per card
    const { embeds, totalPages } = generatePlayerEmbeds(
      playersList,
      SERVERS[serverKey].name,
      "#00ffcc",
    );

    await loading.delete().catch(() => {});

    // 1. Kirim Header / Info Status Utama Server beserta Banner
    const statusEmbed = new EmbedBuilder()
      .setTitle(`📡 STATUS SERVER: ${SERVERS[serverKey].name.toUpperCase()}`)
      .setColor("#00ffcc")
      .addFields(
        {
          name: "📊 Total Player Online",
          value: `\`${totalOnline} Players\``,
          inline: true,
        },
        {
          name: "📂 Total Halaman List",
          value: `\`${totalPages} Card\``,
          inline: true,
        },
      )
      .setTimestamp();

    if (bannerUrl) statusEmbed.setImage(bannerUrl);
    await message.channel.send({ embeds: [statusEmbed] });

    // 2. Kirim Semua Card Embed Player List secara berurutan
    for (const embed of embeds) {
      await message.channel.send({ embeds: [embed] });
    }
  }

  if (command === "player") {
    const serverKey = args[0]?.toLowerCase();
    const keyword = args.slice(1).join(" ");

    if (!serverKey || !keyword)
      return message.reply(`Contoh:\n${PREFIX}player ime wt`);
    if (!SERVERS[serverKey]) return message.reply("❌ Server tidak ditemukan");

    const loading = await message.reply("🔍 Searching player...");
    const serverData = await getPlayers(serverKey);

    if (!serverData || serverData.error) {
      return loading.edit(`❌ **${serverData?.error}**`);
    }

    const { playersList, totalOnline, maxClients, bannerUrl } = serverData;
    const filtered = playersList.filter((p) =>
      p.name.toLowerCase().includes(keyword.toLowerCase()),
    );

    if (!filtered.length)
      return loading.edit(`❌ Player dengan nama "${keyword}" tidak ditemukan`);

    filtered.sort((a, b) => a.id - b.id);

    // Menyamakan layout pencarian: Generate embed dengan kapasitas 100 player per card
    const { embeds, totalPages } = generatePlayerEmbeds(
      filtered,
      SERVERS[serverKey].name,
      "#ffcc00",
    );

    await loading.delete().catch(() => {});

    // 1. Kirim Header Pencarian Server beserta Banner (Sama persis dengan layout !allplayer)
    const searchStatusEmbed = new EmbedBuilder()
      .setTitle(`🔍 HASIL PENCARIAN: "${keyword.toUpperCase()}"`)
      .setDescription(
        `Ditemukan **${filtered.length}** player cocok di **${SERVERS[serverKey].name}**`,
      )
      .setColor("#ffcc00")
      .addFields(
        {
          name: "📊 Info Server",
          value: `Online: \`${totalOnline} Players\``,
          inline: true,
        },
        {
          name: "📂 Total Card Hasil",
          value: `\`${totalPages} Card\``,
          inline: true,
        },
      )
      .setTimestamp();

    if (bannerUrl) searchStatusEmbed.setImage(bannerUrl);
    await message.channel.send({ embeds: [searchStatusEmbed] });

    // 2. Kirim Semua Card Embed Hasil Pencarian Player secara berurutan
    for (const embed of embeds) {
      await message.channel.send({ embeds: [embed] });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
