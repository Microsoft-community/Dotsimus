const Discord = require('discord.js')

const helpCommand = (client, interaction) => {
    const embedResponse = new Discord.MessageEmbed()
        .setTitle('Dotsimus and its functionality')
        .setDescription('Dotsimus is a machine learning powered chat moderation bot, its primary goal is to help monitor, protect the server while it\'s secondary task is to enhance user experience.')
        .setColor('#ffbd2e')
        .addFields(
            { name: '!toxic', value: 'Shows toxicity certainty for requested message. \n Usage: `!toxic <phrase>`' },
            { name: '!watch', value: 'Sends a direct message to you whenever keyword that you track gets mentioned. \n Usage: `!watch <keyword>`' },
            { name: '!rule', value: 'Shows defined rule. \n Usage: `!rule <rule number or phrase>`' },
            { name: '!rules', value: 'Shows all defined rules. \n Usage: `!rules`' },
            { name: '!uptime', value: 'Shows uptime of the bot. \n Usage: `!uptime`' },
            { name: '!flags', value: 'Shows recent messages that were flagged with their values. \n Usage: `!flags <@User, user ID or none>`' },
            { name: '!debug', value: 'Shows raw toxicity values for requested message. \n Usage: `!debug <phrase>`' },
            { name: '!serveractivity', value: 'Shows recent server engagement. \n Usage: `!serveractivity`' }
        );
    client.api.interactions(interaction.id, interaction.token).callback.post({
        data: {
            type: 4,
            data: {
                embeds: [embedResponse]
            },
        },
    });
}

module.exports = { helpCommand };
