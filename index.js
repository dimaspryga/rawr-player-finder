require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { handleCommand } = require("./src/commands");
const { SERVERS } = require("./src/config/servers");

const PREFIX = process.env.PREFIX || "!";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Event: Bot Siap & Terhubung
client.once("ready", () => {
  const serverCount = Object.keys(SERVERS).length;
  console.log(`===========================================`);
  console.log(`✅ FiveM Player Finder Bot Online!`);
  console.log(`👤 Tag: ${client.user.tag}`);
  console.log(`⚙️  Prefix: ${PREFIX}`);
  console.log(`📡 Server Terdaftar: ${serverCount} server`);
  console.log(`===========================================`);
});

// Event: Menerima Pesan / Command
client.on("messageCreate", async (message) => {
  await handleCommand(message, PREFIX);
});

// Error handling terpusat agar bot tidak crash tiba-tiba
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

client.on("error", (error) => {
  console.error("Discord Client Error:", error);
});

// Jalankan Bot
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("❌ DISCORD_TOKEN tidak ditemukan di file .env!");
  process.exit(1);
}

client.login(token);
