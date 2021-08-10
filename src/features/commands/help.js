const Discord = require('discord.js')
const prefix = require('../../index.js')

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
                { name: `${prefix}watch`, value: `Sends a direct message to you whenever keyword that you track gets mentioned. \n Usage: \`${prefix}watch <keyword>\`` },
                { name: `${prefix}uptime`, value: `Shows uptime of the bot. \n Usage: \`${prefix}uptime\`` },
                { name: `${prefix}flags`, value: `Shows recent messages that were flagged with their values. \n Usage: \`${prefix}flags <@User, user ID or none>\`` },
                { name: `${prefix}repeat`, value: `Admin only command which repeats what you say. \n Usage: \`${prefix}repeat <phrase>\`` },
                { name: `${prefix}dotprefix`, value: `Changes bot prefix. \n Usage: \`${prefix}dotprefix <prefix>\`` }
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
