const { Client, MessageEmbed } = require('discord.js');

module.exports = {
    name: 'sendToxicityEmbed',
    type: 'button',
    description: 'Sends Toxicity embed in the channel.',
    async execute(client, interaction) {

        if(interaction.isButton()) {
            interaction.update({
                content: `Message has been sent to the channel.`,
                components: []
            })
        }
        const embedResponse = new MessageEmbed()
            .setColor('#ffbd2e')
            .addFields(interaction.message.embeds[0].fields)
            .setTimestamp()
            .setFooter(`${interaction.user.tag} | ${interaction.user.id}`, interaction.user.displayAvatarURL())
        interaction.channel.send({
            embeds: [embedResponse]
        })

    },
};