const cfx = require("cfx-api");

// Konfigurasi Timeout HTTP
const DIRECT_TIMEOUT_MS = 2500; // Timeout untuk koneksi langsung IP:Port
const CFX_TIMEOUT_MS = 4000;    // Timeout untuk CDN Cfx.re
const CACHE_TTL_MS = 15000;     // Cache 15 detik

// Penyimpanan cache & request in-flight
const cache = new Map();
const inFlightRequests = new Map();

/**
 * Cek apakah daftar pemain disamarkan/dianonimkan oleh server (Streamer/Privacy Mode)
 * @param {Array} players
 * @returns {boolean}
 */
function checkIfAnonymized(players) {
  if (!players || players.length === 0) return false;
  let anonCount = 0;
  for (const p of players) {
    const name = (p.name || "").trim().toLowerCase();
    if (/^anon\d*$/i.test(name) || name === "player" || name === "unknown") {
      anonCount++;
    }
  }
  // Jika lebih dari 50% pemain adalah Anon/Player, berarti server memproteksi nama
  return anonCount / players.length > 0.5;
}

/**
 * Timeout helper promise
 * @param {number} ms
 * @returns {Promise<never>}
 */
function timeoutPromise(ms) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  );
}

/**
 * Mengambil data langsung dari FXServer menggunakan cfx.servers.players & info
 * @param {string} endpoint - Host:Port server (contoh: 127.0.0.1:30120)
 * @returns {Promise<object|null>}
 */
async function fetchDirectServer(endpoint) {
  if (!endpoint) return null;

  try {
    const [playersRes, infoRes] = await Promise.allSettled([
      Promise.race([cfx.servers.players(endpoint), timeoutPromise(DIRECT_TIMEOUT_MS)]),
      Promise.race([cfx.servers.info(endpoint), timeoutPromise(DIRECT_TIMEOUT_MS)]),
    ]);

    if (
      playersRes.status === "fulfilled" &&
      Array.isArray(playersRes.value)
    ) {
      const rawPlayers = playersRes.value;
      const infoData =
        infoRes.status === "fulfilled" && infoRes.value ? infoRes.value : {};

      const normalizedPlayers = rawPlayers.map((p) => ({
        id: Number(p.id) ?? 0,
        name: String(p.name || "Unknown"),
        ping: Number(p.ping) ?? 0,
        identifiers: p.identifiers || [],
      }));

      const maxClients =
        Number(infoData?.vars?.sv_maxclients || infoData?.sv_maxclients) || 0;
      const bannerUrl = infoData?.vars?.banner_detail || null;
      const isAnonymized = checkIfAnonymized(normalizedPlayers);

      return {
        success: true,
        source: "direct-server",
        players: normalizedPlayers,
        totalOnline: normalizedPlayers.length,
        maxClients,
        bannerUrl,
        iconUrl: null,
        hostname: infoData?.vars?.sv_projectName || null,
        isAnonymized,
      };
    }
  } catch {
    // Abaikan jika direct endpoint gagal/tertutup firewall
  }

  return null;
}

/**
 * Mengambil data dari CDN Cfx.re resmi menggunakan cfx.servers.single()
 * @param {string} cfxId - Join code server (misal: 6gk4e4 atau zrvmg4)
 * @returns {Promise<object|null>}
 */
async function fetchFromCfxApi(cfxId) {
  if (!cfxId) return null;

  try {
    const server = await Promise.race([
      cfx.servers.single(cfxId),
      timeoutPromise(CFX_TIMEOUT_MS),
    ]);

    if (!server) return null;

    const rawPlayers = Array.isArray(server.players) ? server.players : [];
    const normalizedPlayers = rawPlayers.map((p) => ({
      id: Number(p.id) ?? 0,
      name: String(p.name || "Unknown"),
      ping: Number(p.ping) ?? 0,
      identifiers: p.identifiers || [],
    }));

    const isAnonymized = checkIfAnonymized(normalizedPlayers);

    return {
      success: true,
      source: "cfx-cdn",
      players: normalizedPlayers,
      totalOnline: Number(server.playersCount) || normalizedPlayers.length,
      maxClients: Number(server.maxPlayers) || 0,
      bannerUrl: server.bannerDetail || server.bannerConnecting || null,
      iconUrl: server.iconUrl || null,
      hostname: server.hostname || null,
      isAnonymized,
      citizenServer: server,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Mengambil data player dan status server FiveM.
 * Menggunakan request paralel cerdas:
 * - Direct IP (jika port terbuka, mengembalikan nama asli)
 * - CDN Cfx.re (fallback cepat jika direct diblokir firewall)
 * @param {object} server - Objek konfigurasi server dari servers.js
 * @param {string} serverKey - Key identifikasi server
 * @returns {Promise<object>}
 */
async function getServerData(server, serverKey) {
  if (!server) {
    return {
      success: false,
      error: "Server tidak ditemukan dalam konfigurasi bot.",
    };
  }

  // 1. Cek cache memori
  const cached = cache.get(serverKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // 2. Request deduplication (in-flight coalescing)
  if (inFlightRequests.has(serverKey)) {
    return inFlightRequests.get(serverKey);
  }

  const requestPromise = (async () => {
    // Jalankan pengecekan Direct dan CDN secara simultan
    const promises = [];

    if (server.endpoint) {
      promises.push(fetchDirectServer(server.endpoint));
    } else {
      promises.push(Promise.resolve(null));
    }

    if (server.cfxId) {
      promises.push(fetchFromCfxApi(server.cfxId));
    } else {
      promises.push(Promise.resolve(null));
    }

    const [directResult, cfxResult] = await Promise.allSettled(promises);

    const directData = directResult.status === "fulfilled" ? directResult.value : null;
    const cfxData = cfxResult.status === "fulfilled" ? cfxResult.value : null;

    // Prioritaskan Direct jika berhasil dan memiliki nama asli (bukan anonim)
    let result = null;
    if (directData && directData.success && !directData.isAnonymized) {
      result = directData;
    } else if (cfxData && cfxData.success && !cfxData.isAnonymized) {
      result = cfxData;
    } else if (directData && directData.success) {
      result = directData;
    } else if (cfxData && cfxData.success) {
      result = cfxData;
    }

    if (result && result.success) {
      result.serverName = server.name;
      cache.set(serverKey, {
        timestamp: Date.now(),
        data: result,
      });
      return result;
    }

    return {
      success: false,
      serverName: server.name,
      error: `Gagal mengakses data server **${server.name}**. Server sedang offline atau memblokir akses bot.`,
    };
  })();

  inFlightRequests.set(serverKey, requestPromise);

  try {
    return await requestPromise;
  } finally {
    inFlightRequests.delete(serverKey);
  }
}

/**
 * Mengambil status operasional resmi infrastruktur Cfx.re / FiveM
 * @returns {Promise<object>}
 */
async function getCfxStatus() {
  try {
    const status = await cfx.status.get();
    let components = [];
    try {
      components = await status.fetchComponents();
    } catch {
      components = [];
    }

    let unresolved = [];
    try {
      const incidentsData = await cfx.status.unresolvedIncidents();
      unresolved = incidentsData?.incidents || [];
    } catch {
      unresolved = [];
    }

    return {
      success: true,
      everythingOk: status.everythingOk,
      level: status.level,
      description: status.description,
      components,
      unresolved,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Gagal mengambil status Cfx.re.",
    };
  }
}

/**
 * Membersihkan cache server tertentu atau seluruhnya
 * @param {string} [serverKey]
 */
function clearCache(serverKey) {
  if (serverKey) {
    cache.delete(serverKey);
  } else {
    cache.clear();
  }
}

module.exports = {
  getServerData,
  getCfxStatus,
  clearCache,
};
