const fs = require("fs");
const path = require("path");

const commands = new Map();

// Baca semua command file di direktori ini secara dinamis
const commandFiles = fs
  .readdirSync(__dirname)
  .filter((file) => file.endsWith(".js") && file !== "index.js");

for (const file of commandFiles) {
  const command = require(path.join(__dirname, file));
  if (command.name && typeof command.execute === "function") {
    commands.set(command.name.toLowerCase(), command);
  }
}

/**
 * Handle incoming message command
 * @param {import("discord.js").Message} message
 * @param {string} prefix
 */
async function handleCommand(message, prefix) {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const rawArgs = message.content.slice(prefix.length).trim().split(/\s+/);
  const commandName = rawArgs.shift()?.toLowerCase();

  if (!commandName) return;

  const command = commands.get(commandName);
  if (!command) return;

  try {
    await command.execute(message, rawArgs, { prefix });
  } catch (error) {
    console.error(`Error executing command ${commandName}:`, error);
    await message.reply("⚠️ Terjadi error saat mengeksekusi perintah tersebut.").catch(() => {});
  }
}

module.exports = {
  commands,
  handleCommand,
};
