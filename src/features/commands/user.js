const Discord = require('discord.js'),
    db = require('../../db'),
    { getStatusColor, capitalizeFirstLetter, getDate, getDaysSince } = require('../../utils.js'),
    apiDateToTimestamp = (date) => {
        const dateObj = new Date(date);
        return Math.floor(dateObj.getTime() / 1000);
    },
    sendInfoEmbed = (client, interaction, user) => {
        const getMember = client.guilds.cache.get(interaction.guildId).members.fetch(user).then(async member => {
            // console.log(member.user.presence);
            return member
        });

        db.getRecord(user, interaction.guildId).then(async data => {
            if (getMember) {
                const guildMember = await getMember,
                    infoEmbed = new Discord.MessageEmbed()
                        .setTitle(`${guildMember.user.username}#${guildMember.user.discriminator}`)
                        .setColor(`${getStatusColor(guildMember?.presence?.status)}`)
                        .setDescription(`${guildMember?.presence?.activities[0]?.state ?? ''} \n`)
                        .setThumbnail(`https://cdn.discordapp.com/avatars/${guildMember.user.id}/${guildMember.user.avatar}.png`)
                        .setFooter(`User ID: ${guildMember.user.id} - user created on ${getDate(guildMember.user.createdAt, 'en')}`)
                        .addFields(
                            {
                                name: 'Server infractions',
                                value: `${data[0]?.message?.length ?? '0'}`,
                                inline: true
                            },
                            {
                                name: 'Joined on',
                                value: `<t:${apiDateToTimestamp(guildMember.joinedAt)}>`,
                                inline: true
                            },
                            {
                                name: 'Roles',
                                value: `${guildMember._roles.length >= 1 ? guildMember._roles.map(role => `<@&${role}>`).join(", ") : 'No roles'}`,
                                inline: false
                            },
                            {
                                name: 'Permissions',
                                value: `${guildMember.permissions.serialize().ADMINISTRATOR ? '⦿ Administrator' : guildMember.permissions.toArray().map(feature => `⦿ ${capitalizeFirstLetter(feature.toLowerCase())}`).join("\r\n")}`,
                                inline: false
                            }
                        );
                interaction.reply({
                    type: 4,
                    embeds: [infoEmbed]
                })
            } else {
                client.users.fetch(user).then((user) => {
                    const infoEmbed = new Discord.MessageEmbed()
                        .setTitle(`${user.username}#${user.discriminator}`)
                        .setColor(`${getStatusColor(user?.presence?.status)}`)
                        .setDescription(`${capitalizeFirstLetter(user.presence.status)}`)
                        .setThumbnail(`${user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/avatars/731190736996794420/acb75c08b6eb67c01a5a4cf6e5e567a1.png'}`)
                        .setFooter(`User ID: ${user.id}`)
                        .addFields(
                            {
                                name: 'Server infractions',
                                value: `${data[0]?.message?.length ?? '0'}`,
                                inline: true
                            },
                            {
                                name: 'Created on',
                                value: `<t:${apiDateToTimestamp(guildMember.user.createdAt)}>`,
                                inline: true
                            }
                        );
                    interaction.reply({
                        type: 4,
                        embeds: [infoEmbed]
                    })
                }
                )
            }
        })
    }

const sendWarningEmbed = (client, interaction, user) => {
    const getMember = client.guilds.cache.get(interaction.guildId).members.fetch(user).then(async member => {
        return member
    });
    db.getRecord(user, interaction.guildId).then(async data => {
        if (getMember) {
            const guildMember = await getMember,
                infoEmbed = new Discord.MessageEmbed()
                    .setTitle(`Infractions for ${guildMember.user.username}#${guildMember.user.discriminator}`)
                    .setColor(`${getStatusColor(guildMember?.presence?.status)}`)
                    .setThumbnail(`https://cdn.discordapp.com/avatars/${guildMember.user.id}/${guildMember.user.avatar}.png`)
                    .setFooter(`User ID: ${guildMember.user.id} - user created on ${getDate(guildMember.user.createdAt, 'en')}`)
                    .addFields(
                        {
                            name: 'Total infractions',
                            value: `${data[0]?.message?.length ?? '0'}`,
                            inline: true
                        },
                        {
                            name: 'This week',
                            value: `${data[0]?.message?.filter(x => getDaysSince(Date.now(), x.timestamp) <= 7).length ?? '0'}`,
                            inline: true
                        },
                        {
                            name: 'Past 30 days',
                            value: `${data[0]?.message?.filter(x => getDaysSince(Date.now(), x.timestamp) <= 30).length ?? '0'}`,
                            inline: true
                        },
                        {
                            name: 'Last 5 warnings',
                            value: 'No warnings found.',
                            inline: false
                        },
                        {
                            name: 'Last 5 toxicity flags',
                            value: `${data[0] ? data[0].message.reverse().slice(0, 5).map(infraction => `${infraction._id} • <t:${apiDateToTimestamp(infraction.timestamp)}:R>`) : 'No infractions found.'}`,
                            inline: false
                        }
                    );
            interaction.reply({
                type: 4,
                embeds: [infoEmbed]
            })
        } else {
            client.users.fetch(user).then((user) => {
                const infoEmbed = new Discord.MessageEmbed()
                    .setTitle(`${user.username}#${user.discriminator}`)
                    .setColor(`${getStatusColor(user?.presence?.status)}`)
                    .setThumbnail(`https://cdn.discordapp.com/avatars/${guildMember.user.id}/${guildMember.user.avatar}.png`)
                    .setFooter(`User ID: ${user.id} - user created on ${getDate(user.createdAt)}`)
                    .addFields(
                        {
                            name: 'Total infractions',
                            value: `${data[0]?.message?.length ?? '0'}`,
                            inline: true
                        },
                        {
                            name: 'This week',
                            value: `${data[0]?.message?.filter(x => getDaysSince(Date.now(), x.timestamp) <= 7).length ?? '0'}`,
                            inline: true
                        },
                        {
                            name: 'Past 30 days',
                            value: `${data[0]?.message?.filter(x => getDaysSince(Date.now(), x.timestamp) <= 30).length ?? '0'}`,
                            inline: true
                        },
                        {
                            name: 'Last 5 warnings',
                            value: 'No warnings found.',
                            inline: false
                        },
                        {
                            name: 'Last 5 toxicity flags',
                            value: `${data[0] ? data[0].message.reverse().slice(0, 5).map(infraction => `${infraction._id} • <t:${apiDateToTimestamp(infraction.timestamp)}:R>`) : 'No infractions found.'}`,
                            inline: false
                        }
                    );
                interaction.reply({
                    type: 4,
                    embeds: [infoEmbed]
                })
            }
            )
        }
    })
}

module.exports = {
    name: 'user',
    description: 'Provides user related information.',
    execute (client, interaction, activeUsersCollection) {
        switch (interaction.options._subcommand) {
            case 'info':
                switch (interaction.options._hoistedOptions[0]?.name) {
                    case 'user-name':
                        sendInfoEmbed(client, interaction, interaction.options._hoistedOptions[0].value);
                        break;
                    case 'user-id':
                        sendInfoEmbed(client, interaction, interaction.options._hoistedOptions[0].value);
                        break;
                    default:
                        sendInfoEmbed(client, interaction, interaction.member.user.id);
                        break;
                }
                break;
            case 'warnings':
                switch (interaction.options._hoistedOptions[0]?.name) {
                    case 'user-name':
                        sendWarningEmbed(client, interaction, interaction.options._hoistedOptions[0].value);
                        break;
                    case 'user-id':
                        sendWarningEmbed(client, interaction, interaction.options._hoistedOptions[0].value);
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
