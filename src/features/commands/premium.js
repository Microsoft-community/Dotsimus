const { SlashCommandBuilder } = require('@discordjs/builders')
const { Permissions } = require('discord.js');
const db = require('../../db');

module.exports = {
    type: 'slash',
    data: new SlashCommandBuilder()
        .setName("premium")
        .setDescription('Configure premium servers')
        .addSubcommand(subcommand =>
            subcommand
                .setName("configure")
                .setDescription("Configure premium features.")
                .addRoleOption(option => 
                    option
                        .setName("role")
                        .setDescription("The role that will be assigned to toxic members.")
                        .setRequired(true))
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("The investigations channel.")
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disables all premium features.')),
    async execute(_, interaction) {
        if (!interaction.guild) {
            return interaction.reply({ content: 'You can only use this command in servers!', ephemeral: true });
        }

        if (!interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
            const ohSimusAsset = new MessageAttachment('./src/assets/images/ohsimus.png');
            return interaction.reply({
                content: 'Oh snap! You don\'t have sufficient permissions to execute this command.',
                files: [ohSimusAsset],
                ephemeral: true
            });
        }

        const isPremium = await db.getServerConfig(interaction.guild.id).then(config => config[0]?.isSubscribed)
        if (!isPremium) {
            return interaction.reply({
                content: 'This command can only be run on a premium server, learn more over at [Dotsimus.com](https://dotsimus.com/).',
                ephemeral: true
            });
        }

        try {
            switch (interaction.options._subcommand) {
                case "configure":
                    const role = interaction.options.getRole("role"), channel = interaction.options.getChannel("channel");
                    await db.saveAlert(interaction.guild.id, role.id, undefined, 0.6, channel.id);
                    await channel.send({
                        content: `This channel has been setup for Dotsimus reports.\n**Muted role**: <@&${role.id}>.`,
                        allowedMentions: { parse: [] }
                    })
                    return interaction.reply({
                        content: "Configuration successful!",
                        ephemeral: true
                    });
                case "disable":
                    await db.deleteAllAlerts(interaction.guild.id);
                    return interaction.reply({
                        content: 'Premium features disabled!',
                        ephemeral: true
                    })
            }
        } catch (e) {
            console.log(e);
            return interaction.reply({
                content: `Unfortunately, an error occured."`,
                ephemeral: true
            });
        }
    }
}