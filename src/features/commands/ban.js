const { SlashCommandBuilder } = require('@discordjs/builders');
const { Permissions, MessageAttachment } = require("discord.js");

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
        const user = interaction.options.getUser('user');
        const ohSimusAsset = new MessageAttachment('./src/assets/images/ohsimus.png');

        if (interaction.guild.id === '150662382874525696') {
            return interaction.reply({
                content: 'Oh snap! This feature is currently disabled by the moderation team.',
                files: [ohSimusAsset],
                ephemeral: true
            });
        }
        
        if (!interaction.member.permissions.has(Permissions.FLAGS.BAN_MEMBERS)) {
            interaction.reply({
                content: 'Oh snap! You don\'t have sufficient permissions to execute this command.',
                files: [ohSimusAsset],
                ephemeral: true
            });
            return;
        }

        if (interaction.options.getMember('user')) {
            if (interaction.options.getMember('user').manageable) {
                banUser(user, interaction);
                return;
            }
            interaction.reply({
                content: 'Oh snap! Dotsimus does not have sufficient permissions to ban this user.\nCheck whether the bot has enough permissions and try again.',
                files: [ohSimusAsset],
                ephemeral: true
            });
            return;
        }
        
        banUser(user, interaction);
    },
}

var banUser = (user, interaction) => {
    const reason = interaction.options.get('reason')?.value ?? "No reason specified";
    user.send({ content: `You have been banned from ${interaction.guild.name} for **${reason}**.` });
    interaction.guild.members.ban(user, { reason: interaction.options.getString('reason')?.value }).then(() => {
        if (!interaction.options.get('reason')?.value) {
            interaction.reply({
                type: 4,
                content: `${user} has been banned.`,
                ephemeral: false
            });
        } else {
            interaction.reply({
                type: 4,
                content: `${user} has been banned for **${reason}**.`,
                ephemeral: false
            });
        }
    }).catch(() => {
        interaction.reply({
            content: 'Oh snap! Something went horribly wrong, check whether bot has required permissions enabled.',
            files: [ohSimusAsset],
            ephemeral: true
        })
    });
}
