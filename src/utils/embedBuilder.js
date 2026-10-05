const { EmbedBuilder } = require("discord.js");

const PLAYERS_PER_CARD = 50;

/**
 * Format satu baris player dengan ping icon, ID, nama yang aman dari Markdown, dan ms ping
 * @param {object} player
 * @returns {string}
 */
function formatPlayerLine(player) {
  let pingIcon = "🟢";
  if (player.ping >= 90) pingIcon = "🔴";
  else if (player.ping >= 50) pingIcon = "🟡";

  // Sanitize karakter markdown agar tidak merusak tampilan Discord
  const cleanName = (player.name || "Unknown")
    .replace(/[`*_~|]/g, "")
    .trim();

  const shortName =
    cleanName.length > 22 ? cleanName.substring(0, 20) + ".." : cleanName;

  return `\`${pingIcon}#${player.id}\` ${shortName} \`${player.ping}ms\``;
}

/**
 * Membuat kumpulan card embed untuk daftar player (dibagi 2 kolom per embed)
 * @param {Array} playersList - Array data player
 * @param {string} serverName - Nama server
 * @param {string} [embedColor="#00ffcc"] - Warna border embed
 * @returns {{ embeds: EmbedBuilder[], totalPages: number }}
 */
function generatePlayerEmbeds(
  playersList,
  serverName,
  embedColor = "#00ffcc",
) {
  const embeds = [];
  const totalPlayers = playersList.length;
  const totalPages = Math.ceil(totalPlayers / PLAYERS_PER_CARD) || 1;

  for (let p = 0; p < totalPages; p++) {
    const startIndex = p * PLAYERS_PER_CARD;
    const pagePlayers = playersList.slice(
      startIndex,
      startIndex + PLAYERS_PER_CARD,
    );

    // Bagi rata isi card menjadi 2 kolom (kiri & kanan)
    const half = Math.ceil(pagePlayers.length / 2);
    const leftColPlayers = pagePlayers.slice(0, half);
    const rightColPlayers = pagePlayers.slice(half);

    const leftText =
      leftColPlayers.map((p) => formatPlayerLine(p)).join("\n") || "—";
    const rightText =
      rightColPlayers.map((p) => formatPlayerLine(p)).join("\n") || "—";

    const startNumber = startIndex + 1;
    const endNumber = Math.min(startIndex + PLAYERS_PER_CARD, totalPlayers);

    const listEmbed = new EmbedBuilder()
      .setTitle(
        `👥 Player List: ${startNumber}-${endNumber} (Total: ${totalPlayers})`,
      )
      .setColor(embedColor)
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

/**
 * Membuat embed info utama / header server
 * @param {object} params
 * @returns {EmbedBuilder}
 */
function createServerHeaderEmbed({
  title,
  description,
  serverName,
  totalOnline,
  maxClients,
  totalPages,
  bannerUrl,
  iconUrl,
  color = "#00ffcc",
}) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .setTimestamp();

  if (description) {
    embed.setDescription(description);
  }

  const fields = [
    {
      name: "📊 Total Player Online",
      value: `\`${totalOnline}${maxClients ? ` / ${maxClients}` : ""} Players\``,
      inline: true,
    },
    {
      name: "📂 Total Halaman List",
      value: `\`${totalPages} Card\``,
      inline: true,
    },
  ];

  embed.addFields(fields);

  if (iconUrl && typeof iconUrl === "string" && iconUrl.startsWith("http")) {
    embed.setThumbnail(iconUrl);
  }

  if (bannerUrl && typeof bannerUrl === "string" && bannerUrl.startsWith("http")) {
    embed.setImage(bannerUrl);
  }

  return embed;
}

module.exports = {
  formatPlayerLine,
  generatePlayerEmbeds,
  createServerHeaderEmbed,
};
