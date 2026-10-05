const { EmbedBuilder } = require("discord.js");
const { getCfxStatus } = require("../services/fivemService");

module.exports = {
  name: "cfxstatus",
  description: "Mengecek status operasional resmi server & infrastruktur Cfx.re / FiveM",
  async execute(message, args, { prefix }) {
    const loadingMsg = await message.reply("🔍 Memeriksa status sistem Cfx.re...");

    try {
      const statusData = await getCfxStatus();

      if (!statusData || !statusData.success) {
        return loadingMsg.edit(
          `❌ **${statusData?.error || "Gagal mengambil status resmi Cfx.re."}**`
        );
      }

      const { everythingOk, description, level, components, unresolved } = statusData;

      const isAllOk = everythingOk || level === "operational";
      const statusColor = isAllOk ? "#00ffcc" : "#ffaa00";
      const statusIcon = isAllOk ? "🟢" : "⚠️";

      // Pilih komponen-komponen FiveM yang paling sering berdampak ke pemain
      const priorityNames = [
        "FiveM",
        "Server List Frontend",
        "Game Services",
        "Keymaster",
        "CnL",
        "Portal",
        "Web Services",
      ];

      const filteredComponents = components.filter((c) =>
        priorityNames.some((p) => c.name.toLowerCase().includes(p.toLowerCase()))
      );

      const componentLines = filteredComponents.map((c) => {
        const isCompOk = c.status === "operational";
        const icon = isCompOk ? "🟢" : "🔴";
        return `• ${icon} **${c.name}**: \`${c.status.toUpperCase()}\``;
      });

      const embed = new EmbedBuilder()
        .setTitle(`${statusIcon} Status Infrastruktur Cfx.re / FiveM`)
        .setColor(statusColor)
        .setDescription(
          `**Kondisi Umum:** ${isAllOk ? "Semua sistem berjalan normal" : description}\n` +
          `**Status Level:** \`${(level || "OK").toUpperCase()}\`\n\n` +
          `**Komponen Utama:**\n${componentLines.join("\n") || "Tidak ada detail komponen."}`
        )
        .setFooter({ text: "Sumber: status.cfx.re via cfx-api" })
        .setTimestamp();

      if (unresolved && unresolved.length > 0) {
        const incidentTexts = unresolved.slice(0, 3).map((inc) => {
          return `⚠️ **${inc.name}**\n${inc.incident_updates?.[0]?.body || "Sedang diselidiki..."}`;
        });

        embed.addFields({
          name: "🚨 Insiden Sedang Berlangsung",
          value: incidentTexts.join("\n\n"),
        });
      }

      await loadingMsg.delete().catch(() => {});
      return message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error("Error in !cfxstatus:", err);
      return loadingMsg.edit("❌ Terjadi kesalahan saat memeriksa status Cfx.re.").catch(() => {});
    }
  },
};
