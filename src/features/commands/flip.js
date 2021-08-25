const { SlashCommandBuilder } = require('@discordjs/builders'),
    wait = require('util').promisify(setTimeout);

module.exports = {
    type: 'slash',
    data: new SlashCommandBuilder()
        .setName('flip-a-coin')
        .setDescription('Resolve any argument with a flip of a coin.')
        .addStringOption(option =>
            option.setName('side')
                .setDescription('Pick coin side.')
                .setRequired(true)
                .addChoice('Head', 'head')
                .addChoice('Tails', 'tails')),
    async execute (client, interaction) {
        const result = Math.random() >= 0.5 ? 'Sorry buddy, you got this wrong this time around! Better luck next time.' : 'Winner winner, artificial dinner! You got it right, keep it up champ!';
        await interaction.deferReply();
        await wait(2000);
        await interaction.editReply(result);
    },
};