const { SlashCommandBuilder } = require('@discordjs/builders'),
    { MessageEmbed } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bans a user from the server.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to ban.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason to include in ban message.')
                .setRequired(false)
        ),
    async execute(client, interaction) {
        await interaction.deferReply();
        var userSnowflake = interaction.options.getUser('user');
        var commandUser = client.users.cache.get(interaction.member.user.id);
        if (commandUser.permissions.has("BAN_MEMBERS", false)) {
        if (!isNaN(userSnowflake)) {
            var reason = interaction.options.get('reason')?.value;
            // Ban user from guild
            interaction.guild.members.ban(user);
            if (isNaN(reason)) {
                reason = "No reason specified.";
                interaction.editReply({
                    type: 4,
                    content: `<@${userSnowflake}> has been banned.`
                });
            } else {
                interaction.editReply({
                    type: 4,
                    content: `<@${userSnowflake}> has been banned for **${reason}.**`
                });
            }

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
