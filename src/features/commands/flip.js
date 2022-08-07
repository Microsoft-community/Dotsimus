const {
    SlashCommandBuilder
} = require('@discordjs/builders'),
    wait = require('util').promisify(setTimeout), {
        MessageAttachment
    } = require('discord.js');


module.exports = {
    type: 'slash',
    data: new SlashCommandBuilder()
        .setName('flip-a-coin')
        .setDescription('Resolve any argument with a flip of a coin.')
        .addStringOption(option =>
            option.setName('side')
            .setDescription('Pick coin side.')
            .setRequired(true)
            .addChoices({
                name: 'Head',
                value: 'head'
            }, {
                name: 'Tails',
                value: 'tails'
            })
        ),
    async execute(client, interaction) {
        if (interaction.guild.id === '150662382874525696') {
            const ohSimusAsset = new MessageAttachment('./src/assets/images/ohsimus.png');
            return interaction.reply({
                content: 'Oh snap! This feature is currently disabled by the moderation team.',
                files: [ohSimusAsset],
                ephemeral: true
            });
        }
        const result = Math.random() >= 0.5 ? 'Sorry buddy, you got this wrong this time around! Better luck next time.' : 'Winner winner, artificial dinner! You got it right, keep it up champ!';
        await interaction.deferReply();
        await wait(2000);
        await interaction.editReply(result);
    },
};