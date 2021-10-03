const { SlashCommandBuilder } = require('@discordjs/builders'),
    { MessageAttachment, Permissions } = require('discord.js'),
    { drawDot } = require('../../utils/dotdraw.js');

module.exports = {
    type: 'slash',
    data: new SlashCommandBuilder()
        .setName('dot-draw')
        .setDescription('Draws Dotsimus chat bubbles.')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('Text to draw')
                .setRequired(true)
        ),
    async execute (client, interaction) {
        if (!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES) || !interaction.member.id === process.env.OWNER) {
            const ohSimusAsset = new MessageAttachment('./src/assets/images/ohsimus.png');
            interaction.reply({
                content: 'Oh snap! You don\'t have sufficient permissions to execute this command.',
                files: [ohSimusAsset],
                ephemeral: true
            });
            return;
        }
        const text = interaction.options._hoistedOptions[0].value;
        if (text.length > 30) {
            const ohSimusAsset = new MessageAttachment('./src/assets/images/ohsimus.png');
            interaction.reply({
                content: 'Oh snap! It looks like there are too many characters to draw.',
                files: [ohSimusAsset],
                ephemeral: true
            });
            return;
        }

        const image = await drawDot(text),
            attachment = new MessageAttachment(image, 'dot.png');

        await interaction.reply({
            files: [attachment]
        })
    }
}