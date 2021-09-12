const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    type: 'slash',
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unbans user from the server.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Select user to unban.')
                .setRequired(true)
        ),
    async execute (client, interaction) {
        const userSnowflake = interaction.options.getUser('user');
        if (interaction.member.permissions.serialize().BAN_MEMBERS) {
            const isUserBanned = await interaction.guild.bans.fetch({ user: userSnowflake, cache: false }).catch(() => false);
            if (isUserBanned) {
                interaction.guild.members.unban(userSnowflake).catch(() => { });
                interaction.reply({
                    type: 4,
                    content: `${userSnowflake} has been unbanned successfully.`
                });
            } else {
                interaction.reply({
                    type: 4,
                    ephemeral: true,
                    content: `⚠️ User isn't banned or invalid user specified.`
                })
            }
        } else {
            interaction.reply({
                type: 4,
                ephemeral: true,
                content: `You don't have required permissions to use this command.`
            })
        }
    },
}
