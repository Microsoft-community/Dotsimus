const { SlashCommandBuilder } = require('@discordjs/builders');
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
        switch(interaction.options.getSubcommand()) {
            case 'block': {
                const user = interaction.options.getUser('user');
    
                await db.saveBlockedReportUser(user.id, user.username);
        
                interaction.reply({
                    content: `:exclamation: The user ${user} is now blocked from using report commands.`,
                    ephemeral: true
                })
            } break;
            case 'unblock': {
                const user = interaction.options.getUser('user');
    
                await db.deleteBlockedReportUser(user.id);
        
                interaction.reply({
                    content: `:white_check_mark: The user ${user} can now use report commands.`,
                    ephemeral: true
                })
            } break;
        }
    }
}
