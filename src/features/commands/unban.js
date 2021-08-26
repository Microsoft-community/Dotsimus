const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unbans user from the server.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Select user to unban.')
                .setRequired(true)
        ),
    async execute (client, interaction) {
        await interaction.deferReply();
        const userSnowflake = interaction.options.getUser('user');
        if (interaction.member.permissions.serialize().BAN_MEMBERS) {
            if (!isNaN(userSnowflake)) {
                interaction.guild.members.unban(userSnowflake).catch(() => {});
                interaction.editReply({
                    type: 4,
                    content: `${userSnowflake} has been unbanned successfully.`
                });
            } else {
                interaction.editReply({
                    type: 4,
                    ephemeral: true,
                    content: `⚠️ Invalid user specified, try double check whether user ID is correct.`
                })
            }
        } else {
            interaction.editReply({
                type: 4,
                ephemeral: true,
                content: `You don't have enough permissions to run this command.`
            })
        }
    },
}
