const { SlashCommandBuilder } = require('@discordjs/builders'),
    Discord = require('discord.js'),
    capitalizeFirstLetter = (string) => {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },
    apiDateToTimestamp = (date) => {
        const dateObj = new Date(date);
        return Math.floor(dateObj.getTime() / 1000);
    };

module.exports = {
    type: 'slash',
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Shows server information and activity.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('information')
                .setDescription('Shows information about a server.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('activity')
                .setDescription('Shows the server\'s engagement and activity in the past 3 minutes.')),
    execute (client, interaction, activeUsersCollection) {
        const serverData = client.guilds.cache.get(interaction.guildId)
        switch (interaction.options._subcommand) {
            case 'activity':
                const activeUsers = activeUsersCollection.filter(userActivity => userActivity.serverId === interaction.guildId).length
                interaction.reply({
                    type: 4,
                    content: `${activeUsers} ${activeUsers > 1 || activeUsers == 0 ? 'users' : 'user'} engaged with the server in the past ~3 minutes.`
                })
                break;
            case 'information':
                const infoEmbed = new Discord.MessageEmbed()
                    .setTitle(serverData.name, serverData.iconURL())
                    .setColor('#e4717a')
                    .setDescription(`${serverData.description ? serverData.description : 'No description available.'} \n
Owner: <@${serverData.ownerId}> \n
${serverData.vanityURLCode ? `Invite link: discord.gg/${serverData.vanityURLCode}` : ''}`)
                    .setThumbnail(serverData.iconURL())
                    .addFields(
                        {
                            name: 'By the numbers', value: `Members: **${serverData.memberCount}**
Emojis: **${serverData.emojis.cache.size}**
Channels: **${serverData.channels.cache.size}**
Roles: **${serverData.roles.cache.size}**
                        `, inline: false
                        },
                        { name: 'Language', value: `${serverData.preferredLocale.toLowerCase()}`, inline: true },
                        { name: 'Boosters', value: `🚀 ${serverData.premiumSubscriptionCount}`, inline: false },
                        { name: 'Explicit content filtering', value: `${serverData.explicitContentFilter}`, inline: true },
                        { name: 'Verification level', value: `${serverData.verificationLevel}`, inline: true },
                        { name: 'Features', value: `${serverData.features.length >= 1 ? serverData.features.map(feature => `• ${capitalizeFirstLetter(feature.toLowerCase())}\n`) : "No features available."}`.replaceAll(",", ""), inline: false },
                        { name: 'Created', value: `<t:${apiDateToTimestamp(serverData.createdAt)}:R>`, inline: false }
                    )
                interaction.reply({
                    type: 4,
                    embeds: [infoEmbed]
                })
                break;
            default:
                break;
        }
    },
};
