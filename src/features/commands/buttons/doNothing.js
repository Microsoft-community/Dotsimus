const { Client } = require('discord.js'),
    db = require('../../../db'),
    perspective = require('../../../api/perspective');

module.exports = {
    name: 'doNothing',
    type: 'button',
    description: 'Doesn\'t remove any watched keywords',
    async execute (client, interaction) {
        if(interaction.isButton()) {
            interaction.update({
                content: 'Alright. Won\'t remove any keywords',
                components: []
            })
        }
    },
};
