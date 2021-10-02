const fetch = require('request-promise-native');

// ~15mins caching would be great, wouldn't it?
// it'd also be kinda neat if this could be done with discord.js rest and routes
const fetchRules = async (guildID) => {
    const response = await fetch(`https://discord.com/api/v9/guilds/${guildID}/member-verification`, {
        "headers": {
            "accept": "*/*",
            "accept-language": "en-US",
            "authorization": `Bot ${process.env.DEVELOPMENT !== 'true' ? process.env.BOT_TOKEN : process.env.BOT_TOKEN_DEV}`
        },
        "method": "GET",
        "credentials": "include"
    }).catch(error => {
        if (JSON.parse(error.error).message !== 'Unknown Guild') console.error(error.error);
        return 0;
    });
    if (response) {
        return JSON.parse(response)
    } else {
        return 0;
    }
}

module.exports = { fetchRules }