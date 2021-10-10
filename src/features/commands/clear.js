const { SlashCommandBuilder } = require('@discordjs/builders'),
    { MessageAttachment, Permissions } = require('discord.js'),
    ohSimusAsset = new MessageAttachment('./src/assets/images/ohsimus.png');


module.exports = {
    type: 'slash',
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Bulk removes selected amount of messages.')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Type in amount of messages that you want to remove.')
                .setRequired(true)),
    async execute (client, interaction) {
        await interaction.deferReply();
        if (!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES))
            return interaction.editReply({
                content: 'Oh snap! You don\'t have sufficient permissions to execute this command.',
                files: [ohSimusAsset],
                ephemeral: true
            });

        const amount = interaction.options._hoistedOptions[0].value
        if (amount > 100) {
            return interaction.editReply({
                content: 'You can only delete up to 100 messages at a time.',
                files: [ohSimusAsset],
                ephemeral: true
            });
        }

        interaction.channel.bulkDelete(amount + 1, true)
            .catch(err => {
                interaction.editReply({
                    content: 'There was an error trying to prune messages in this channel!',
                    files: [ohSimusAsset],
                    ephemeral: true
                });
            });

        interaction.editReply({
            content: `Successfully deleted ${amount} message${amount > 1 ? 's' : ''}.`,
            ephemeral: true
        });
    },
};