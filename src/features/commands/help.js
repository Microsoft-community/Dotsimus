const Discord = require('discord.js')

module.exports = {
    name: 'help',
    description: 'Shows general information about bot and its commands.',
    execute(client, interaction) {
        const embedResponse = new Discord.MessageEmbed()
            .setTitle('Dotsimus and its functionality')
            .setDescription(`Dotsimus is a machine learning powered chat moderation bot, its primary goal is to help monitor, protect the server while its secondary goal is to enhance user experience. \n
Support server: https://discord.gg/XAFXecKFRG
Add Dotsimus to your server: http://add-bot.dotsimus.com`)
            .setColor('#ffbd2e')
            .addFields(
                { name: 'Slash commands', value: 'You can see available slash commands and their use by typing `/` in the chat.', inline: false},
                { name: '!watch', value: 'Sends a direct message to you whenever keyword that you track gets mentioned. \n Usage: `!watch <keyword>`' },
                { name: '!uptime', value: 'Shows uptime of the bot. \n Usage: `!uptime`' },
                { name: '!flags', value: 'Shows recent messages that were flagged with their values. \n Usage: `!flags <@User, user ID or none>`' },
                { name: '!repeat', value: 'Admin only command which repeats what you say. \n Usage: `!repeat <phrase>`' },
                { name: '!dotprefix', value: 'Changes bot prefix. \n Usage: `!dotprefix <prefix>`' }
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
