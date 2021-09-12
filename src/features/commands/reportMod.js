const { SlashCommandBuilder } = require('@discordjs/builders');
const { Permissions } = require('discord.js');
const db = require('../../db');

module.exports = {
    type: 'slash',
    data: new SlashCommandBuilder()
        .setName('reportmod')
        .setDescription('Manage reports')
        .addSubcommand(command =>
            command
                .setName('block')
                .setDescription('Block an user from using report commands')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to block')
                        .setRequired(true)))
        .addSubcommand(command =>
            command
                .setName('unblock')
                .setDescription('Reallow an user to use report commands')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to block')
                        .setRequired(true))),

    async execute(client, interaction) {
        if (!interaction.member.permissions.serialize().KICK_MEMBERS) {
            interaction.reply({
                content: 'Insufficient permission to execute this command.'
            });
            return;
        }

        switch(interaction.options.getSubcommand()) {
            case 'block': {
                const user = interaction.options.getUser('user');
    
                await db.saveBlockedReportUser(interaction.guild.id, user.id, user.username);
        
                interaction.reply({
                    content: `:exclamation: The user ${user} is now blocked from using report commands.`,
                    ephemeral: true
                })
            } break;
            case 'unblock': {
                const user = interaction.options.getUser('user');
    
                await db.deleteBlockedReportUser(interaction.guild.id, user.id);
        
                interaction.reply({
                    content: `:white_check_mark: The user ${user} can now use report commands.`,
                    ephemeral: true
                })
            } break;
        }
    }
}
