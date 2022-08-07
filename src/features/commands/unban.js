const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageAttachment } = require('discord.js');

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
        const userSnowflake = interaction.options.getUser('user'), 
              ohSimusAsset = new MessageAttachment('./src/assets/images/ohsimus.png');
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
                content: 'Oh snap! You don\'t have sufficient permissions to unban this user.',
                files: [ohSimusAsset],
                ephemeral: true
            });
        }
    },
}
