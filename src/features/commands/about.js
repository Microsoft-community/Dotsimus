const { SlashCommandBuilder } = require('@discordjs/builders'),
    Discord = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('about')
        .setDescription('Find out more about Dotsimus.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('help')
                .setDescription('Shows general information about bot and its commands.'))
        .addSubcommand(subcommand => subcommand
            .setName('uptime')
            .setDescription('Shows how long bot stayed up since the last restart.'))
        .addSubcommand(subcommand => subcommand
            .setName('ping')
            .setDescription('Shows bots latency.'))
        .addSubcommand(subcommand => subcommand
            .setName('restart')
            .setDescription('⚠️ Restarts the bot.')),
    async execute (client, interaction) {
        switch (interaction.options.getSubcommand()) {
            case 'help':
                const embedResponse = new Discord.MessageEmbed()
                    .setTitle('Dotsimus and its functionality')
                    .setDescription(`Dotsimus is a machine learning powered chat moderation bot, its primary goal is to help monitor, protect the server while its secondary goal is to enhance user experience. \n
Support server: https://discord.gg/XAFXecKFRG
Add Dotsimus to your server: http://add-bot.dotsimus.com`)
                    .setColor('#ffbd2e')
                    .addFields(
                        { name: 'Slash commands', value: 'You can see available slash commands and their use by typing `/` in the chat.', inline: false },
                        { name: '!watch', value: 'Sends a direct message to you whenever keyword that you track gets mentioned. \n Usage: `!watch <keyword>`' },
                        { name: '!repeat', value: 'Admin only command which repeats what you say. \n Usage: `!repeat <phrase>`' },
                        { name: '!dotprefix', value: 'Changes bot prefix. \n Usage: `!dotprefix <prefix>`' }
                    );
                interaction.reply({
                    type: 4,
                    embeds: [embedResponse]
                });
                break;
            case 'uptime':
                const startupTimestamp = Math.round((Date.now() - client.uptime) / 1000);
                interaction.reply({
                    content: `Bot restarted <t:${startupTimestamp}:R>.`
                });
                break;
            case 'ping':
                const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
                interaction.editReply(`Websocket heartbeat: ${client.ws.ping}ms\nRoundtrip latency: ${sent.createdTimestamp - interaction.createdTimestamp}ms`);
                break;
            case 'restart':
                if (interaction.member.id === process.env.OWNER) {
                    interaction.reply('Restarting..').then(() => process.exit(0));
                } else {
                    interaction.reply({
                        content: 'You are not authorized to use this command.',
                        ephermal: true
                    });
                }
            default:
                break;
        }
    },
};