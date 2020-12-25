const Discord = require('discord.js')

const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

module.exports = {
    name: 'server',
    description: 'server',
    execute (client, interaction, activeUsersCollection) {
        const message = client.guilds.cache.get(interaction.guild_id)
        switch (interaction.data.options[0].name) {
            case 'activity':
                const activeUsers = activeUsersCollection.filter(userActivity => userActivity.serverId === interaction.guild_id).length
                client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: {
                            content: `${activeUsers} ${activeUsers > 1 ? 'users' : 'user'} engaged with the server in the past ~5 minutes.`
                        },
                    },
                });
                break;
            case 'info':
                console.log(message);
                const infoEmbed = new Discord.MessageEmbed()
                    .setAuthor(message.name)
                    .setColor('#e4717a')
                    .setDescription(`Owner: <@${message.ownerID}> (${message.ownerID})`)
                    .addFields(
                        { name: 'Members', value: `${message.memberCount}`, inline: true },
                        { name: 'Emojis', value: `${message.emojis.cache.size} `, inline: true },
                        { name: 'Channels', value: `${message.channels.cache.size}`, inline: true },
                        { name: 'Roles', value: `${message.roles.cache.size}`, inline: true },
                        { name: 'Location', value: capitalizeFirstLetter(message.region), inline: true },
                        { name: 'Language', value: message.preferredLocale.toLowerCase(), inline: true },
                        { name: 'Created', value: message.createdAt.toLocaleString(), inline: true },
                        { name: 'Features', value: message.features.map(feature => `⦿ ${capitalizeFirstLetter(feature.toLowerCase())}`), inline: false }
                    )
                client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: {
                            embeds: [infoEmbed]
                        },
                    },
                });
                break;
            default:
                break;
        }
    },
};