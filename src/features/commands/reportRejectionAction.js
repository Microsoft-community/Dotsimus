const { MessageEmbed } = require('discord.js'),
    db = require('../../db');

module.exports = {
    name: 'reportRejectionAction',
    description: 'Unmutes user, reinstates removed message and notifies affected user.',
    async execute (client, interaction) {
        if (interaction.member.permissions.serialize().KICK_MEMBERS || interaction.member.permissions.serialize().BAN_MEMBERS) {
            const removedMessageInfo = interaction.message.embeds[0].footer.text.split(/ +/g),
                flaggedUserInfo = await client.users.fetch(interaction.message.embeds[0].fields[4].value).then(user => { return user }),
                reinstatedMessage = new MessageEmbed()
                    .setColor('#32CD32')
                    .setAuthor(`${flaggedUserInfo.username}#${flaggedUserInfo.discriminator}`, `https://cdn.discordapp.com/avatars/${interaction.message.embeds[0].fields[4].value}/${flaggedUserInfo.avatar}.png`, `https://discord.com/users/${interaction.message.embeds[0].fields[4].value}`)
                    .setDescription(`${interaction.message.embeds[0].fields[0].value}`)
                    .setFooter('Message reinstated by the moderation team.', `https://cdn.discordapp.com/icons/${interaction.guildId}/${interaction.guild.icon}.webp`);
            let reportRejectionEphemeralMsg = 'Report rejected, user is notified & unmuted.'
            client.guilds.cache.get(interaction.guildId).members.fetch(interaction.message.embeds[0].fields[4].value).then(async member => {
                member.roles.remove(await db.getAlerts(interaction.guildId).then(alerts => {
                    return alerts[0].mutedRoleId
                }));
                member.send(`You're now unmuted and your message is reinstated on **${interaction.guild.name}** - <https://discordapp.com/channels/${interaction.guildId}/${removedMessageInfo[0]}/${removedMessageInfo[1]}>`, reinstatedMessage).catch(error => {
                    console.info({ message: `Could not send unmute notice to ${member.id}.`, error: error });
                });
            }).catch(err => {
                reportRejectionEphemeralMsg = 'Report rejected, user is notified, but not unmuted due to an error.'
                console.error(err);
            })
            client.guilds.cache.get(interaction.guildId).channels
                .fetch(removedMessageInfo[0]).then(
                    channel => {
                        channel.messages.fetch(removedMessageInfo[1])
                            .then(message => {
                                message.edit({ content: null, embeds: [reinstatedMessage] })
                                interaction.reply({
                                    ephemeral: true,
                                    content: reportRejectionEphemeralMsg
                                });
                            })
                    })
                .catch(console.error);
            const updatedEmbed = interaction.message.embeds[0]
                .setColor('#e91e63')
                .setFooter('');
            interaction.message.edit(
                {
                    content: 'Report rejected by',
                    embeds: [updatedEmbed],
                    components: []
                })
        } else {
            interaction.reply({ ephemeral: true, content: Math.random() < 0.9 ? 'You do not have permission to use this command.' : 'You nasty devil, you don\'t take no for an answer?' })
        }
    },
};
