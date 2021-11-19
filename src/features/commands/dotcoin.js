const { SlashCommandBuilder } = require('@discordjs/builders'),
    { MessageEmbed } = require('discord.js'),
    { generateRandomHexColor } = require('../../utils'),
    db = require('../../db');


module.exports = {
    type: 'slash',
    data: new SlashCommandBuilder()
        .setName('dotcoin')
        .setDescription('??? ??? ???'),
    async execute (client, interaction) {
        db.getUserBalance(interaction.user.id).then(async (userInfo) => {
            if (userInfo.length === 0) {
                return interaction.reply({ content: 'Currently you have no Dotcoins.', ephemeral: true });
            } else {
                const newBalance = new Intl.NumberFormat().format(Math.round(userInfo[0].balance)),
                    balanceEmbed = new MessageEmbed()
                        .setTitle('Dotcoin Balance')
                        .setDescription(`Your current balance: **${newBalance}** dotcoin${newBalance > 1 ? 's' : ''}.`)
                        .setFooter('??? ??? ???')
                        .setColor(generateRandomHexColor());
                return interaction.reply({ embeds: [balanceEmbed], ephemeral: true });
            }
        })
    }
};