const { MessageActionRow, MessageButton } = require('discord.js'),
    db = require('../../../db'),
    perspective = require('../../../api/perspective');

module.exports = {
    name: 'reportApprovalUnmuteAction',
    type: 'button',
    description: 'Unmutes user and updates removed message with moderator notice.',
    async execute (client, interaction) {
        if (interaction.member.permissions.serialize().KICK_MEMBERS || interaction.member.permissions.serialize().BAN_MEMBERS || interaction.member.roles.cache.some(role => role.id === '332343869163438080')) {
            const removedMessageInfo = interaction.message.embeds[0].footer.text.split(/ +/g),
                reportApprovalEphemeralMsg = 'Report approved, user is notified & unmuted.';
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
            client.guilds.cache.get(interaction.guildId).members.fetch(interaction.message.embeds[0].fields.filter(field => field.name === 'User ID').map(field => field.value)[0]).then(async member => {
                member.roles.remove(await db.getAlerts(interaction.guildId).then(alerts => {
                    return alerts[0].mutedRoleId
                }));
                const buttonsRow = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setLabel('Get back to chat')
                            .setURL(`discord://-/channels/${interaction.guildId}/${removedMessageInfo[0]}/${removedMessageInfo[1]}`)
                            .setStyle('LINK')
                    );
                member.send({
                    content: `Moderators decided that your message is inappropriate, despite that you're now unmuted on **${interaction.guild.name}**.`,
                    components: [buttonsRow]
                }).catch(error => {
                    console.info({ message: `Could not send unmute notice to ${member.id}.`, error: error });
                });
            }).catch(err => {
                reportRejectionEphemeralMsg = 'Report approved, user is notified, but not unmuted due to an error.'
                console.error(err);
            })
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
                .setFooter('');
            interaction.message.edit(
                {
                    content: `Report approved by <@${interaction.member.id}>`,
                    embeds: [updatedEmbed],
                    components: []
                })
        } else {
            interaction.reply({ ephemeral: true, content: Math.random() < 0.9 ? 'You do not have permissions to use this action.' : 'You nasty devil, you don\'t take no for an answer?' })
        }
    },
};
