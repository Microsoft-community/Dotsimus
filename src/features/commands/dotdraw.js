const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageAttachment } = require('discord.js');
const { drawDot } = require('../../utils/dotdraw.js');

module.exports = {
type: 'slash',
    type: 'slash',
    data: new SlashCommandBuilder()
        .setName('dotdraw')
        .setDescription('Draw dot text')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('Text to draw')
                .setRequired(true)
        ),

    async execute (client, interaction) {
        const text = interaction.options._hoistedOptions[0].value;
        const image = await drawDot(text);

        const attachment = new MessageAttachment(image, 'dot.png');

        await interaction.reply({
            files: [attachment]
        })
    }
}