const { Client } = require('discord.js');

module.exports = {
    name: 'hideToxicityEmbed',
    type: 'button',
    description: 'Retracts from sending Toxicity embed in the channel.',
    async execute (client, interaction) {
        if(interaction.isButton()) {
            interaction.update({
                content: 'Message won\'t be shown.',
                components: []
            })
        }
    },
};
