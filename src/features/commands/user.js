const Discord = require('discord.js'),
    db = require('../../db'),
    { getStatusColor, capitalizeFirstLetter, getDate, getDaysSince } = require('../../utils.js');

const sendInfoEmbed = (client, interaction, user) => {
    const getMember = client.guilds.cache.get(interaction.guild_id).member(user);
    db.getRecord(user, interaction.guild_id).then(data => {
        if (getMember) {
            const guildMember = getMember.guild.members.cache.get(getMember.user.id),
                infoEmbed = new Discord.MessageEmbed()
                    .setTitle(`${guildMember.user.username}#${guildMember.user.discriminator}`)
                    .setColor(getStatusColor(guildMember.presence.status))
                    .setDescription(`${guildMember.presence.activities[0]?.state ?? ''} \n`)
                    .setThumbnail(`https://cdn.discordapp.com/avatars/${getMember.user.id}/${getMember.user.avatar}.png`)
                    .setFooter(`User ID: ${getMember.user.id} - user created on ${getDate(guildMember.user.createdAt, 'en')}`)
                    .addFields(
                        {
                            name: 'Server infractions',
                            value: data[0]?.message?.length ?? '0',
                            inline: true
                        },
                        {
                            name: 'Joined on',
                            value: getDate(guildMember.joinedAt, 'en'),
                            inline: true
                        },
                        {
                            name: 'Roles',
                            value: guildMember.roles.cache.map(role => `<@&${role.id}>`).join(", "),
                            inline: false
                        },
                        {
                            name: 'Permissions',
                            value: guildMember.hasPermission('ADMINISTRATOR') ? '⦿ Administrator' : guildMember.permissions.toArray().map(feature => `⦿ ${capitalizeFirstLetter(feature.toLowerCase())}`),
                            inline: false
                        },
                        {
                            name: 'Last message',
                            value: guildMember.user.lastMessageID ? `[\💬 Message](https://discord.com/channels/${guildMember.guild.id}/${guildMember.user.lastMessageChannelID}/${guildMember.user.lastMessageID})` : 'N/A',
                            inline: false
                        }
                    );
            client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 4,
                    data: {
                        embeds: [infoEmbed]
                    },
                },
            });
        } else {
            client.users.fetch(user).then((user) => {
                const infoEmbed = new Discord.MessageEmbed()
                    .setTitle(`${user.username}#${user.discriminator}`)
                    .setColor(getStatusColor(user.presence.status))
                    .setDescription(capitalizeFirstLetter(user.presence.status))
                    .setThumbnail(user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/avatars/731190736996794420/acb75c08b6eb67c01a5a4cf6e5e567a1.png')
                    .setFooter(`User ID: ${user.id}`)
                    .addFields(
                        {
                            name: 'Server infractions',
                            value: data[0]?.message?.length ?? '0',
                            inline: true
                        },
                        {
                            name: 'Created on',
                            value: getDate(user.createdAt, 'en'),
                            inline: true
                        },
                        {
                            name: 'Last message',
                            value: user.lastMessageID ? `[\💬 Message](https://discord.com/channels/${interaction.guild_id}/${user.lastMessageChannelID}/${user.lastMessageID})` : 'N/A',
                            inline: false
                        }
                    );
                client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: {
                            embeds: [infoEmbed]
                        },
                    },
                });
            }
            )
        }
    })
}

const sendWarningEmbed = (client, interaction, user) => {
    const getMember = client.guilds.cache.get(interaction.guild_id).member(user);
    db.getRecord(user, interaction.guild_id).then(data => {
        if (getMember) {
            const guildMember = getMember.guild.members.cache.get(getMember.user.id),
                infoEmbed = new Discord.MessageEmbed()
                    .setTitle(`Infractions for ${guildMember.user.username}#${guildMember.user.discriminator}`)
                    .setColor(getStatusColor(guildMember.presence.status))
                    .setThumbnail(`https://cdn.discordapp.com/avatars/${getMember.user.id}/${getMember.user.avatar}.png`)
                    .setFooter(`User ID: ${getMember.user.id} - user created on ${getDate(guildMember.user.createdAt, 'en')}`)
                    .addFields(
                        {
                            name: 'Total infractions',
                            value: data[0]?.message?.length ?? '0',
                            inline: true
                        },
                        {
                            name: 'This week',
                            value: data[0]?.message?.filter(x => getDaysSince(Date.now(), x.timestamp) <= 7).length ?? '0',
                            inline: true
                        },
                        {
                            name: 'Past 30 days',
                            value: data[0]?.message?.filter(x => getDaysSince(Date.now(), x.timestamp) <= 30).length ?? '0',
                            inline: true
                        },
                        {
                            name: 'Last 5 warnings',
                            value: 'No warnings found.',
                            inline: false
                        },
                        {
                            name: 'Last 5 toxicity flags',
                            value: data[0] ? data[0].message.slice(0, 5).map(infraction => `${infraction._id} • ${getDate(infraction.timestamp, 'en')}`) : 'No infractions found.',
                            inline: false
                        }
                    );
            client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 4,
                    data: {
                        embeds: [infoEmbed]
                    },
                },
            });
        } else {
            client.users.fetch(user).then((user) => {
                const infoEmbed = new Discord.MessageEmbed()
                    .setTitle(`${user.username}#${user.discriminator}`)
                    .setColor(getStatusColor(user.presence.status))
                    .setThumbnail(user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/avatars/731190736996794420/acb75c08b6eb67c01a5a4cf6e5e567a1.png')
                    .setFooter(`User ID: ${user.id} - user created on ${getDate(user.createdAt)}`)
                    .addFields(
                        {
                            name: 'Total infractions',
                            value: data[0]?.message?.length ?? '0',
                            inline: true
                        },
                        {
                            name: 'This week',
                            value: data[0]?.message?.length ?? '0',
                            inline: true
                        },
                        {
                            name: 'Past 30 days',
                            value: data[0]?.message?.length ?? '0',
                            inline: true
                        },
                        {
                            name: 'Last 5 warnings',
                            value: 'No warnings found.',
                            inline: false
                        },
                        {
                            name: 'Last 5 toxicity flags',
                            value: data[0] ? data[0].message.slice(0, 5).map(infraction => `${infraction._id} • ${getDate(infraction.timestamp, 'en')}`) : 'No infractions found.',
                            inline: false
                        }
                    );
                client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: {
                            embeds: [infoEmbed]
                        },
                    },
                });
            }
            )
        }
    })
}

module.exports = {
    name: 'user',
    description: 'Provides user related information.',
    execute (client, interaction, activeUsersCollection) {
        switch (interaction.data.options[0].name) {
            case 'info':
                switch (interaction.data.options?.[0]?.options?.[0]?.name) {
                    case 'user-name':
                        sendInfoEmbed(client, interaction, interaction.data.options[0].options[0].value);
                        break;
                    case 'user-id':
                        sendInfoEmbed(client, interaction, interaction.data.options[0].options[0].value);
                        break;
                    default:
                        sendInfoEmbed(client, interaction, interaction.member.user.id);
                        break;
                }
                break;
            case 'warnings':
                switch (interaction.data.options?.[0]?.options?.[0]?.name) {
                    case 'user-name':
                        sendWarningEmbed(client, interaction, interaction.data.options[0].options[0].value);
                        break;
                    case 'user-id':
                        sendWarningEmbed(client, interaction, interaction.data.options[0].options[0].value);
                        break;
                    default:
                        sendWarningEmbed(client, interaction, interaction.member.user.id);
                        break;
                }
                break;
            default:
                break;
        }
    }
};
