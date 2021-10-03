const { Client, MessageEmbed, MessageActionRow, MessageButton } = require('discord.js'),
    db = require('../../../db'),
    perspective = require('../../../api/perspective');

module.exports = {
    name: 'reportApprovalAction',
    type: 'button',
    description: 'Keeps user muted and updates removed message with moderator notice.',
    async execute (client, interaction) {
        if (interaction.member.permissions.serialize().KICK_MEMBERS || interaction.member.permissions.serialize().BAN_MEMBERS || interaction.member.roles.cache.some(role => role.id === '332343869163438080')) {
            const removedMessageInfo = interaction.message.embeds[0].footer.text.split(/ +/g),
                reportApprovalEphemeralMsg = 'Report approved, user is notified & muted.';
            db.saveMessage(
                +new Date,
                interaction.guildId,
                interaction.message.embeds[0].fields.filter(field => field.name === 'User ID').map(field => field.value)[0],
                await client.users.fetch(interaction.message.embeds[0].fields.filter(field => field.name === 'User ID').map(field => field.value)[0]).then(user => { return user.username }),
                interaction.message.embeds[0].fields.filter(field => field.name === 'Is user new?').map(field => field.value)[0] === 'Yes' ? true : false,
                interaction.message.embeds[0].fields[0].value,
                await perspective.getToxicity(interaction.message.embeds[0].fields[0].value, {
                    channel: {
                        name: interaction.channelId
                    },
                    server: {
                        prefix: interaction.guildId, name: interaction.guildId //input server name
                    }
                }, true).then(toxicity => {
                    return toxicity.toxicity
                })
            )
            client.guilds.cache.get(interaction.guildId).channels
                .fetch(removedMessageInfo[0]).then(
                    channel => {
                        channel.messages.fetch(removedMessageInfo[1])
                            .then(message => {
                                message.edit('Message removed, report verified by the moderation team.')
                                interaction.reply({
                                    ephemeral: true,
                                    content: reportApprovalEphemeralMsg
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
                .setColor('#32CD32')
                .setFooter(''),
                actionMessage = `Report approved by <@${interaction.member.id}>`,
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
                            .setColor('#32CD32')
                            .setTitle('Report approved, user is muted indefinitely')
                            .addField('Message', interaction.message.embeds[0].fields[0].value)
                            .addField('User', interaction.message.embeds[0].fields.filter(field => field.name === 'User').map(field => field.value)[0])
                            .setDescription(`Approved by <@${interaction.member.id}>`);
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
