const { Client } = require('discord.js'),
    db = require('../../db'),
    perspective = require('../../api/perspective');

module.exports = {
    name: 'reportApprovalAction',
    description: 'Keeps user muted and updates removed message with moderator notice.',
    async execute (client, interaction) {
        if (interaction.member.permissions.serialize().KICK_MEMBERS || interaction.member.permissions.serialize().BAN_MEMBERS) {
            const removedMessageInfo = interaction.message.embeds[0].footer.text.split(/ +/g)
            let reportApprovalEphemeralMsg = 'Report approved, user is notified & muted.'
            client.guilds.cache.get(interaction.guildId).members.fetch(interaction.message.embeds[0].fields[4].value).then(async member => {
                member.roles.add(await db.getAlerts(interaction.guildId).then(alerts => {
                    return alerts[0].mutedRoleId
                }));
            }).catch(err => {
                reportApprovalEphemeralMsg = 'Report approved, user is notified, but not muted. Please set up muted role.'
            })
            db.saveMessage(
                +new Date,
                interaction.guildId,
                interaction.message.embeds[0].fields[4].value,
                await client.users.fetch(interaction.message.embeds[0].fields[4].value).then(user => { return user.username }),
                interaction.message.embeds[0].fields[5].value === 'Yes' ? true : false,
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
                                });
                            })
                    })
                .catch(console.error);
            const updatedEmbed = interaction.message.embeds[0]
                .setColor('#32CD32')
                .setFooter('');
            interaction.message.edit(
                {
                    content: 'Report approved by',
                    embeds: [updatedEmbed],
                    components: []
                }).then(() => {
                    client.guilds.cache.get(interaction.guildId).channels.fetch(interaction.channelId).then(
                        thread => {
                            thread.setArchived(true);
                        })
                })
        } else {
            interaction.reply({ ephemeral: true, content: Math.random() < 0.9 ? 'You do not have permission to use this command.' : 'You nasty devil, you don\'t take no for an answer?' })
        }
    },
};
