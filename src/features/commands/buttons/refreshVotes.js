const { Client, MessageAttachment } = require('discord.js'),
    strawpoll = require('../../../api/strawpoll'),
    { updateResults } = require('../../../utils');

module.exports = {
    name: 'refreshVotes',
    type: 'button',
    description: 'Refreshes poll results.',
    async execute (client, interaction) {
        try {
            updateResults(interaction, interaction.message.embeds[0])
            interaction.reply({
                content: '☑️ Poll refreshed succesfully.',
                ephemeral: true
            });
        } catch (error) {
            console.error(error);
            const ohSimusAsset = new MessageAttachment('./src/assets/images/ohsimus.png');
            interaction.reply({
                content: 'Oh snap! An error occured while refreshing poll results.',
                files: [ohSimusAsset],
                ephemeral: true
            });
        }
    }
}
