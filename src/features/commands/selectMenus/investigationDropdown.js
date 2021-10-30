const { Client, MessageEmbed, MessageActionRow, MessageButton } = require('discord.js'),
    db = require('../../../db'),
    perspective = require('../../../api/perspective');

module.exports = {
    name: 'investigationDropdown',
    type: 'selectMenu',
    description: 'Executes actions that get picked within investigation dropdown.',
    async execute (client, interaction) {
        if (interaction.member.permissions.serialize().KICK_MEMBERS || interaction.member.permissions.serialize().BAN_MEMBERS || interaction.member.roles.cache.some(role => role.id === '332343869163438080')) {
            const removedMessageInfo = interaction.message.embeds[0].footer.text.split(/ +/g),
                sendNoticesAndArchiveThread = (publicActionNotice, privateActionNotice, privateActionNoticeEmbed) => client.guilds.cache.get(interaction.guildId).channels
                    .fetch(removedMessageInfo[0]).then(
                        channel => {
                            channel.messages.fetch(removedMessageInfo[1])
                                .then(message => {
                                    message.edit({
                                        content: publicActionNotice,
                                        embeds: privateActionNoticeEmbed ?? null
                                    })
                                    interaction.update({
                                        ephemeral: true,
                                        content: privateActionNotice
                                    }).then(() => {
                                        client.guilds.cache.get(interaction.guildId).channels.fetch(interaction.channelId).then(
                                            thread => {
                                                thread.setArchived(true);
                                            })
                                    })
                                })
                        })
                    .catch(console.error),
                dispatchNoticeToLogs = (messageColor, actionOutcome) => db.getAlerts(interaction.guild.id).then(alerts => alerts.forEach(alert => {
                    const sendMessageToChannel = async (channelId) => {
                        const channel = await client.guilds.cache.get(interaction.guildId).channels.fetch(channelId),
                            investigationNotice = new MessageEmbed()
                                .setColor(messageColor)
                                .setTitle(actionOutcome)
                                .addField('Message', interaction.message.embeds[0].fields[0].value)
                                .addField('User', interaction.message.embeds[0].fields.filter(field => field.name === 'User').map(field => field.value)[0])
                                .setDescription(`Approved by <@${interaction.member.id}>`);
                        channel.send({ embeds: [investigationNotice], components: [investigationNoticeButtons] }).catch(console.error);
                    }
                    sendMessageToChannel(alert.channelId);
                }));

                const saveInfraction = db.saveMessage(
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
                            prefix: interaction.guildId, name: interaction.guild.name
                        }
                    }, true).then(toxicity => {
                        return toxicity.toxicity
                    })
                );
                
            let actionMessage,
                updatedEmbed,
                investigationNoticeButtons;

            switch (interaction.values[0]) {
                case 'reportApprovalAction':
                    const reportApprovalEphemeralMsg = 'Report approved, user is notified & muted.';
                    saveInfraction
                    sendNoticesAndArchiveThread('Message removed, report verified by the moderation team.',
                        reportApprovalEphemeralMsg
                    );
                    updatedEmbed = interaction.message.embeds[0]
                        .setColor('#32CD32')
                        .setFooter('');
                    actionMessage = `Report approved by <@${interaction.member.id}>`,
                        investigationNoticeButtons = new MessageActionRow()
                            .addComponents(
                                new MessageButton()
                                    .setLabel('Open thread')
                                    .setURL(interaction.message.url)
                                    .setStyle('LINK'));
                    dispatchNoticeToLogs('#32CD32', 'Report approved, user is muted indefinitely');
                    interaction.message.edit(
                        {
                            content: actionMessage,
                            embeds: [updatedEmbed],
                            components: []
                        })
                    break;

                case 'reportApprovalUnmuteAction':
                    let reportApprovalUnmuteEphemeralMsg = 'Report approved, user is notified & unmuted.';
                    saveInfraction
                    client.guilds.cache.get(interaction.guildId).members.fetch(interaction.message.embeds[0].fields.filter(field => field.name === 'User ID').map(field => field.value)[0]).then(async member => {
                        member.roles.remove(await db.getAlerts(interaction.guildId).then(alerts => {
                            return alerts[0].mutedRoleId
                        }));
                        const buttonsRow = new MessageActionRow()
                            .addComponents(
                                new MessageButton()
                                    .setLabel('Get back to chat')
                                    .setURL(`https://discord.com/channels/${interaction.guildId}/${removedMessageInfo[0]}/${removedMessageInfo[1]}`)
                                    .setStyle('LINK')
                            );
                        member.send({
                            content: `You're no longer muted on **${interaction.guild.name}**.`,
                            components: [buttonsRow]
                        }).catch(error => {
                            console.info({ message: `Could not send unmute notice to ${member.id}.`, error: error });
                        });
                    }).catch(err => {
                        reportApprovalUnmuteEphemeralMsg = 'Report approved, user is notified, but not unmuted due to an error.'
                        console.error(err);
                    })
                    sendNoticesAndArchiveThread('Message removed, report verified by the moderation team.', reportApprovalUnmuteEphemeralMsg);
                    updatedEmbed = interaction.message.embeds[0]
                        .setColor('#ffbd2e')
                        .setFooter('');
                    actionMessage = `Report approved, user is notified and unmuted by <@${interaction.member.id}>`,
                        investigationNoticeButtons = new MessageActionRow()
                            .addComponents(
                                new MessageButton()
                                    .setLabel('Open thread')
                                    .setURL(interaction.message.url)
                                    .setStyle('LINK'));
                    dispatchNoticeToLogs('#ffbd2e', 'Report approved, user is unmuted');
                    interaction.message.edit(
                        {
                            content: actionMessage,
                            embeds: [updatedEmbed],
                            components: []
                        })
                    break;

                case 'reportRejectionAction':
                    const flaggedUserInfo = await client.users.fetch(interaction.message.embeds[0].fields.filter(field => field.name === 'User ID').map(field => field.value)[0]).then(user => { return user }),
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
                    sendNoticesAndArchiveThread(
                        null,
                        reportRejectionEphemeralMsg,
                        [reinstatedMessage]
                    );
                    updatedEmbed = interaction.message.embeds[0]
                        .setColor('#e91e63')
                        .setFooter('');
                    actionMessage = `Report rejected, user is notified and unmuted by <@${interaction.member.id}>`,
                        investigationNoticeButtons = new MessageActionRow()
                            .addComponents(
                                new MessageButton()
                                    .setLabel('Open thread')
                                    .setURL(interaction.message.url)
                                    .setStyle('LINK'));
                    dispatchNoticeToLogs('#e91e63', 'Report rejected, user is notified and unmuted');
                    interaction.message.edit(
                        {
                            content: actionMessage,
                            embeds: [updatedEmbed],
                            components: []
                        })
                    break;

                case 'reportApprovalBanAction':
                    interaction.reply({
                        content: 'Oops, this one doesn\'t work just yet..',
                        ephemeral: true
                    });
                    // const reportApprovalBanEphemeralMsg = 'Report approved, user is permanently banned.';
                    // db.saveMessage(
                    //     +new Date,
                    //     interaction.guildId,
                    //     interaction.message.embeds[0].fields.filter(field => field.name === 'User ID').map(field => field.value)[0],
                    //     await client.users.fetch(interaction.message.embeds[0].fields.filter(field => field.name === 'User ID').map(field => field.value)[0]).then(user => { return user.username }),
                    //     interaction.message.embeds[0].fields.filter(field => field.name === 'Is user new?').map(field => field.value)[0] === 'Yes' ? true : false,
                    //     interaction.message.embeds[0].fields[0].value,
                    //     await perspective.getToxicity(interaction.message.embeds[0].fields[0].value, {
                    //         channel: {
                    //             name: interaction.channelId
                    //         },
                    //         server: {
                    //             prefix: interaction.guildId, name: interaction.guild.name
                    //         }
                    //     }, true).then(toxicity => {
                    //         return toxicity.toxicity
                    //     })
                    // )
                    // client.guilds.cache.get(interaction.guildId).members.fetch(interaction.message.embeds[0].fields.filter(field => field.name === 'User ID').map(field => field.value)[0]).then(async member => {
                    //     member.roles.remove(await db.getAlerts(interaction.guildId).then(alerts => {
                    //         return alerts[0].mutedRoleId
                    //     }));
                    //     interaction.guild.members.ban(interaction.message.embeds[0].fields.filter(field => field.name === 'User ID').map(field => field.value)[0], {
                    //         reason: `Infraction message: ${interaction.message.embeds[0].fields[0].value}`
                    //     }).catch(console.error);
                    //     const buttonsRow = new MessageActionRow()
                    //         .addComponents(
                    //             new MessageButton()
                    //                 .setLabel('Get back to chat')
                    //                 .setURL(`https://discord.com/channels/${interaction.guildId}/${removedMessageInfo[0]}/${removedMessageInfo[1]}`)
                    //                 .setStyle('LINK')
                    //         );
                    //     member.send({
                    //         content: `Moderators decided that your message is inappropriate, despite that you're now unmuted on **${interaction.guild.name}**.`,
                    //         components: [buttonsRow]
                    //     }).catch(error => {
                    //         console.info({ message: `Could not send unmute notice to ${member.id}.`, error: error });
                    //     });
                    // }).catch(err => {
                    //     reportRejectionEphemeralMsg = 'Report approved, user is notified, but not unmuted due to an error.'
                    //     console.error(err);
                    // })
                    // sendNoticesAndArchiveThread('Report approved, user is permanently banned.', reportApprovalBanEphemeralMsg);
                    // updatedEmbed = interaction.message.embeds[0]
                    //     .setColor('#32CD32')
                    //     .setFooter('');
                    // actionMessage = `Report approved by <@${interaction.member.id}>`,
                    //     investigationNoticeButtons = new MessageActionRow()
                    //         .addComponents(
                    //             new MessageButton()
                    //                 .setLabel('Open thread')
                    //                 .setURL(interaction.message.url)
                    //                 .setStyle('LINK'));
                    // dispatchNoticeToLogs('#32CD32', 'Report approved, user is permanently banned');
                    // interaction.message.edit(
                    //     {
                    //         content: actionMessage,
                    //         embeds: [updatedEmbed],
                    //         components: []
                    //     })
                    break;
            }
        } else {
            interaction.update({
                ephemeral: true,
                content: Math.random() < 0.9 ?
                    'You do not have permissions to do this action.' :
                    'You nasty devil, you don\'t take no for an answer?'
            })
        }
    },
};
