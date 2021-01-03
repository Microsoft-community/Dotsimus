const fetch = require('request-promise-native');

// ~15mins caching would be great, wouldn't it?
const fetchRules = async (guildID) => {
    const response = await fetch(`https://discordapp.com/api/v8/guilds/${guildID}/member-verification`, {
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
    return await JSON.parse(response)
}

module.exports = { fetchRules }