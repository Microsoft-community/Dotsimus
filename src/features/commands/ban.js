const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    type: 'slash',
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bans user from the server.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Select user to ban.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for a ban.')
                .setRequired(false)
        ),
    async execute (client, interaction) {
        await interaction.deferReply({ ephemeral: true });
        const userSnowflake = interaction.options.getUser('user');
        if (interaction.member.permissions.serialize().BAN_MEMBERS) {
            if (!isNaN(userSnowflake)) {
                const reason = interaction.options.get('reason')?.value ?? "No reason specified.";
                interaction.guild.members.ban(userSnowflake, { reason: interaction.options.get('reason')?.value })
                if (!interaction.options.get('reason')?.value) {
                    interaction.editReply({
                        type: 4,
                        content: `${userSnowflake} has been banned.`,
                        ephemeral: false
                    });
                } else {
                    interaction.editReply({
                        type: 4,
                        content: `${userSnowflake} has been banned for **${reason}.**`,
                        ephemeral: false
                    });
                }
            } else {
                interaction.editReply({
                    type: 4,
                    ephemeral: true,
                    content: `⚠️ Invalid user specified, double check whether user ID is correct.`
                })
            }
        } else {
            interaction.editReply({
                type: 4,
                ephemeral: true,
                content: `You don't have required permissions to run this command.`
            })

        }
    },
}
