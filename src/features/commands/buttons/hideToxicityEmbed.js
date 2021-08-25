const { Client } = require('discord.js'),
    db = require('../../../db'),
    perspective = require('../../../api/perspective');

module.exports = {
    name: 'hideToxicityEmbed',
    type: 'button',
    description: 'Retracts from sending Toxicity embed in the channel.',
    async execute (client, interaction) {
        if(interaction.isButton()) {
            interaction.update({
                content: 'Alright. Won\'t send this',
                components: []
            })
        }
    },
};
