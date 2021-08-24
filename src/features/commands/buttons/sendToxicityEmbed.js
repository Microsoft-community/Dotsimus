const { Client, MessageEmbed } = require('discord.js'),
    db = require('../../../db'),
    perspective = require('../../../api/perspective');
    const { input } = require('../toxic')

module.exports = {
    name: 'sendToxicityEmbed',
    type: 'button',
    description: 'Sends Toxicity embed in the channel.',
    async execute (client, interaction) {
        //console.log(interaction.message.embeds[0])
        const embedResponse = new MessageEmbed()
                    .setColor('#ffbd2e')
                    //.setDescription('need to figure out a way to send user\'s input')
                    .addFields(interaction.message.embeds[0].fields)
                    .setTimestamp()
                    .setFooter(`${interaction.user.tag} | ${interaction.user.id}`, `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`)
        interaction.channel.send({
            embeds: [embedResponse]
        })
    },
};
