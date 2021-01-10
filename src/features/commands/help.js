const Discord = require('discord.js')

module.exports = {
    name: 'help',
    description: 'help!',
    execute(client, interaction) {
        const embedResponse = new Discord.MessageEmbed()
            .setTitle('Dotsimus and its functionality')
            .setDescription(`Dotsimus is a machine learning powered chat moderation bot, its primary goal is to help monitor, protect the server while its secondary goal is to enhance user experience. \n
Support server: https://discord.gg/XAFXecKFRG
Add Dotsimus to your server: http://add-bot.dotsimus.com`)
            .setColor('#ffbd2e')
            .addFields(
                { name: 'Slash commands', value: 'You can see available slash commands and their use by typing `/` in the chat.', inline: false},
                { name: '!toxic', value: 'Shows toxicity certainty for requested message. \n Usage: `!toxic <phrase>`' },
                { name: '!watch', value: 'Sends a direct message to you whenever keyword that you track gets mentioned. \n Usage: `!watch <keyword>`' },
                { name: '!uptime', value: 'Shows uptime of the bot. \n Usage: `!uptime`' },
                { name: '!flags', value: 'Shows recent messages that were flagged with their values. \n Usage: `!flags <@User, user ID or none>`' },
                { name: '!test', value: 'Shows raw toxicity values for requested message. \n Usage: `!test <phrase>`' },
                { name: '!repeat', value: 'Admin only command which repeats what you say. \n Usage: `!repeat <phrase>`' }
            );
        client.api.interactions(interaction.id, interaction.token).callback.post({
            data: {
                type: 4,
                data: {
                    embeds: [embedResponse]
                },
            },
        });
    },
};
