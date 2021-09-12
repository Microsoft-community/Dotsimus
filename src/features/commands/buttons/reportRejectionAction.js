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
            // setAuthor ONLY works if there is a custom User profile image, if not it willl be set to something else
                    .setAuthor(`${flaggedUserInfo.username}#${flaggedUserInfo.discriminator}`, `https://cdn.discordapp.com/avatars/${interaction.message.embeds[0].fields.filter(field => field.name === 'User ID').map(field => field.value)[0]}/${flaggedUserInfo.avatar}.png`, `https://discord.com/users/${interaction.message.embeds[0].fields.filter(field => field.name === 'User ID').map(field => field.value)[0]}`)
                    .setDescription(`${interaction.message.embeds[0].fields[0].value}`)
                    .setFooter('Message reinstated by the moderation team.', `https://cdn.discordapp.com/icons/${interaction.guildId}/${interaction.guild.icon}.webp`);
            let reportRejectionEphemeralMsg = 'Report rejected, user is notified & unmuted.'
            client.guilds.cache.get(interaction.guildId).members.fetch(interaction.message.embeds[0].fields.filter(field => field.name === 'User ID').map(field => field.value)[0]).then(async member => {
                member.roles.remove(await db.getAlerts(interaction.guildId).then(alerts => {
                    return alerts[0].mutedRoleId
                }));
                const buttonsRow = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setLabel('Go to message')
                            .setURL(`https://discordapp.com/channels/${interaction.guildId}/${removedMessageInfo[0]}/${removedMessageInfo[1]}`)
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
                .setFooter('');
            interaction.message.edit(
                {
                    content: `Report rejected by <@${interaction.member.id}>`,
                    embeds: [updatedEmbed],
                    components: []
                })
        } else {
            interaction.reply({ ephemeral: true, content: Math.random() < 0.9 ? 'You do not have permission to use this command.' : 'You nasty devil, you don\'t take no for an answer?' })
        }
    },
};
