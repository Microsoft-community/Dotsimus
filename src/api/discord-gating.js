const { Routes } = require('discord-api-types/v9');
const { REST } = require('@discordjs/rest');

// ~15mins caching would be great, wouldn't it?
// it'd also be kinda neat if this could be done with discord.js rest and routes
async function fetchRules(guildID) {
    const rest = new REST({ version: '9' }).setToken(process.env.DEVELOPMENT !== 'true' ? process.env.BOT_TOKEN : process.env.BOT_TOKEN_DEV);

    try {
        const response = await rest.get(Routes.guildMemberVerification(guildID))
        return response ?? 0;
    } catch(error) {
        if (err.message !== 'Unknown Guild') console.error(err);
        return 0;
    }
}

module.exports = { fetchRules }