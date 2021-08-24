const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unbans a user from the server.')
        .addStringOption(option =>
            option.setName('snowflake')
                .setDescription('User ID (snowflake) to unban.')
                .setRequired(true)
        ),
    async execute(client, interaction) {
        await interaction.deferReply();
        var userSnowflake = interaction.options.get('snowflake')?.value;
        var commandUser = client.users.cache.get(interaction.member.user.id);

        if (commandUser.permissions.has("BAN_MEMBERS", true)) {
        if (!isNaN(userSnowflake)) {
            // Unban user from guild
            interaction.guild.members.unban(user);
            interaction.editReply({
                type: 4,
                content: `<@${userSnowflake}> has been unbanned successfully`
            });
            
        } else {
            interaction.editReply({
                type: 4,
                ephemeral: true,
                content: `There's no user mentioned, try mentioning a user ID/snowflake in the option \`snowflake\` then try again`
            })
        }
       } else {
       interaction.editReply({

                type: 4,

                ephemeral: true,

                content: `You don't have enough permissions to run this command`

            })
       }
    },
}
