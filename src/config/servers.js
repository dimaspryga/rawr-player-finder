/**
 * Daftar konfigurasi server FiveM.
 * 
 * Tips:
 * - Gunakan 'cfxId' (kode join dari cfx.re/join/XXXXXX) karena ini adalah metode paling
 *   stabil dan cepat melalui CDN Cfx.re resmi (melewati proteksi DDoS/firewall server).
 * - Gunakan 'endpoint' (IP:PORT atau DOMAIN:PORT) sebagai alternatif jika server membuka port 30120.
 */

const SERVERS = {
  ime: {
    name: "IME Roleplay",
    cfxId: "zrvmg4",
    endpoint: "210.247.249.178:30120",
  },
  smrp: {
    name: "SatuMimpi Roleplay",
    cfxId: "6gk4e4",
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
    endpoint: "49.128.187.50:30120",
  },
  pz: {
    name: "Project Zero",
    endpoint: "210.247.249.98:30120",
  },
  idp: {
    name: "INDOPRIDE Roleplay",
    cfxId: "bak4pl",
    endpoint: "kota.indopride.id:30120",
  },
  // Alias backward compatibility untuk idp2
  idp2: {
    name: "INDOPRIDE Roleplay (Cfx)",
    cfxId: "bak4pl",
    endpoint: "kota.indopride.id:30120",
  },
  gp: {
    name: "Garuda Prime Roleplay",
    endpoint: "49.128.187.58:30120",
  },
  knrp: {
    name: "Kisah Nusantara Roleplay",
    endpoint: "49.128.187.82:30120",
  },
  lp: {
    name: "Last Paradise Roleplay",
    endpoint: "104.234.180.112:30120",
  },
};

/**
 * Mencari server berdasarkan key (case-insensitive)
 * @param {string} key
 * @returns {object|null}
 */
function getServer(key) {
  if (!key) return null;
  const normalized = key.toLowerCase().trim();
  return SERVERS[normalized] || null;
}

module.exports = {
  SERVERS,
  getServer,
};
