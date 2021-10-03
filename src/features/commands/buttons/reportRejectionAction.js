const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js'),
    db = require('../../../db');

module.exports = {
    name: 'reportRejectionAction',
    type: 'button',
    description: 'Unmutes user, reinstates removed message and notifies affected user.',
    async execute (client, interaction) {
        if (interaction.member.permissions.serialize().KICK_MEMBERS || interaction.member.permissions.serialize().BAN_MEMBERS || interaction.member.roles.cache.some(role => role.id === '332343869163438080')) {
            const removedMessageInfo = interaction.message.embeds[0].footer.text.split(/ +/g),
                flaggedUserInfo = await client.users.fetch(interaction.message.embeds[0].fields.filter(field => field.name === 'User ID').map(field => field.value)[0]).then(user => { return user }),
                reinstatedMessage = new MessageEmbed()
                    .setColor('#32CD32')
                    .setAuthor(`${flaggedUserInfo.username}#${flaggedUserInfo.discriminator}`, flaggedUserInfo.displayAvatarURL(), `https://discord.com/users/${flaggedUserInfo.id}`)
                    .setDescription(`${interaction.message.embeds[0].fields[0].value}`)
                    .setFooter('Message reinstated by the moderation team.', interaction.guild.iconURL({ format: "webp" }));
            let reportRejectionEphemeralMsg = 'Report rejected, user is notified & unmuted.'
            client.guilds.cache.get(interaction.guildId).members.fetch(interaction.message.embeds[0].fields.filter(field => field.name === 'User ID').map(field => field.value)[0]).then(async member => {
                member.roles.remove(await db.getAlerts(interaction.guildId).then(alerts => {
                    return alerts[0].mutedRoleId
                }));
                const buttonsRow = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setLabel('Go to message')
                            .setURL(`https://discord.com/channels/${interaction.guildId}/${removedMessageInfo[0]}/${removedMessageInfo[1]}`)
                            .setStyle('LINK')
                    );
                member.send({
                    content: `Hooray! Your infraction is removed and your message reinstated on **${interaction.guild.name}** by the moderation team.`,
                    embeds: [reinstatedMessage],
                    components: [buttonsRow]
                }).catch(error => {
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
                                }).then(() => {
                                    client.guilds.cache.get(interaction.guildId).channels.fetch(interaction.channelId).then(
                                        thread => {
                                            thread.setArchived(true);
                                        })
                                })
                            })
                    })
                .catch(console.error);
            const updatedEmbed = interaction.message.embeds[0]
                .setColor('#e91e63')
                .setFooter(''),
                actionMessage = `Report rejected, user is notified and unmuted by <@${interaction.member.id}>`,
                investigationNoticeButtons = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setLabel('Open thread')
                            .setURL(interaction.message.url)
                            .setStyle('LINK'));

            db.getAlerts(interaction.guild.id).then(alerts => alerts.forEach(alert => {
                const sendMessageToChannel = async (channelId) => {
                    const channel = await client.guilds.cache.get(interaction.guildId).channels.fetch(channelId),
                        investigationNotice = new MessageEmbed()
                            .setColor('#e91e63')
                            .setTitle('Report rejected, user is notified and unmuted')
                            .addField('Message', interaction.message.embeds[0].fields[0].value)
                            .addField('User', interaction.message.embeds[0].fields.filter(field => field.name === 'User').map(field => field.value)[0])
                            .setDescription(`Rejected by <@${interaction.member.id}>`);
                    channel.send({ embeds: [investigationNotice], components: [investigationNoticeButtons] }).catch(console.error);
                }
                sendMessageToChannel(alert.channelId);
            }));
            interaction.message.edit(
                {
                    content: actionMessage,
                    embeds: [updatedEmbed],
                    components: []
                })
        } else {
            interaction.reply({ ephemeral: true, content: Math.random() < 0.9 ? 'You do not have permissions to use this action.' : 'You nasty devil, you don\'t take no for an answer?' })
        }
    },
};
