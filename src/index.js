const {
  Client,
  Intents,
  Collection,
  MessageEmbed,
  MessageActionRow,
  Options,
  Permissions,
  MessageButton,
  MessageAttachment
} = require('discord.js'),
  client = new Client(
    {
      //       Temporarily disabled due to breaking /watch functionality
      //       makeCache: Options.cacheWithLimits({
      //         MessageManager: 200, 
      //         // UserManager: 100,
      //         // GuildMemberManager: 100,
      //         PresenceManager: 0,
      //         // GuildChannelManager: 0,
      //         ReactionManager: 0,
      //         ThreadManager: 0
      //       }),
      intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES", "GUILD_MESSAGE_TYPING", "GUILD_PRESENCES"], partials: ["CHANNEL"]
    });
//   client = new Discord.Client({ partials: ['MESSAGE', "USER", 'REACTION'], intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] }),
const Sentry = require('@sentry/node'),
  chalk = require('chalk'),
  fetch = require('request-promise-native'),
  db = require('./db'),
  perspective = require('./api/perspective'),
  { getRandomColor, collectCommandAnalytics, ArraySet}  = require('./utils'),
  fs = require('fs'),
  commandFiles = fs.readdirSync('./src/features/commands/').filter(file => file.endsWith('.js')),
  buttonFiles = fs.readdirSync('./src/features/commands/buttons/').filter(file => file.endsWith('.js')),
  menuFiles = fs.readdirSync('./src/features/commands/selectMenus/').filter(file => file.endsWith('.js')),
  ohSimusAsset = new MessageAttachment('./src/assets/images/ohsimus.png'),
  { REST } = require('@discordjs/rest'),
  { Routes } = require('discord-api-types/v9'),
  commandsArray = [],
  devClientId = '793068568601165875',
  devGuildId = '280600603741257728';

for (const file of commandFiles) {
  const command = require(`./features/commands/${file}`);
  if (command.type !== 'button' || command.type !== 'selectMenu') commandsArray.push(command.data.toJSON());
}

const rest = new REST({ version: '9' }).setToken(process.env.DEVELOPMENT !== 'true' ? process.env.BOT_TOKEN : process.env.BOT_TOKEN_DEV);

(async () => {
  try {
    console.info('Started refreshing application slash commands.');
    await rest.put(
      process.env.DEVELOPMENT !== 'true' ? Routes.applicationCommands('731190736996794420') : Routes.applicationGuildCommands(devClientId, devGuildId),
      { body: commandsArray },
    );
    console.info('Successfully reloaded application slash commands.');
  } catch (error) {
    console.error(error);
  }
})();

client.commands = new Collection();
commandFiles.map(file => {
  const command = require(`./features/commands/${file}`);
  client.commands.set(command.data.name, command);
})
buttonFiles.map(file => {
  const command = require(`./features/commands/buttons/${file}`);
  client.commands.set(command.name, command);
})
menuFiles.map(file => {
  const command = require(`./features/commands/selectMenus/${file}`);
  client.commands.set(command.name, command)
})

if (process.env.DEVELOPMENT !== 'true') Sentry.init({ dsn: process.env.SENTRY_DSN });

let prefix = '!';
db.initialize.then(function (response) {
  console.info(chalk.green(response))
  client.login(process.env.DEVELOPMENT !== 'true' ? process.env.BOT_TOKEN : process.env.BOT_TOKEN_DEV);
})
let serversConfig = []
const refreshServersConfigListing = () => {
  const serversConfigStore = []
  client.guilds.cache.forEach(server => {
    db.saveServerConfig(
      +new Date,
      server.id,
      server.name,
      prefix,
      false,
      server.memberCount
    ).then(data => serversConfigStore.push(data))
  })
  serversConfig = serversConfigStore;
}
// let watchedKeywordsCollection = db.getWatchedKeywords(),
let activeUsersCollection = [];

client.on('ready', () => {
  console.info(chalk.green(`Logged in as ${client.user.tag}!`));
  client.user.setActivity(`Dotsimus.com`, { type: 'WATCHING' });
  refreshServersConfigListing()
  // client.api.applications('731190736996794420').guilds('553939036490956801').commands('792118637808058408').delete()
  // client.api.applications('731190736996794420').guilds('553939036490956801').commands.get().then(data => console.log(data))
});
const commandsCooldownSet = new ArraySet();
client.on('interactionCreate', async interaction => {
  if (commandsCooldownSet.has([interaction.user.id, interaction.commandName])) return interaction.reply({
    content: 'Oh snap! You have already used this action or command in the last 5 seconds.',
    ephemeral: true,
    files: [ohSimusAsset]
  });
  commandsCooldownSet.add([interaction.user.id, interaction.commandName]);
  setTimeout(() => commandsCooldownSet.delete([interaction.user.id, interaction.commandName]), 5000);

  try {
    if (interaction.isSelectMenu()) {
      client.commands.get(interaction.customId)?.execute(client, interaction)
    }
    !interaction.isButton() ? client.commands.get(interaction.commandName)?.execute(client, interaction, activeUsersCollection) : client.commands.get(interaction.customId)?.execute(client, interaction, activeUsersCollection);
    if (process.env.DEVELOPMENT !== 'true') !interaction.isButton() ? collectCommandAnalytics(interaction.commandName, interaction.options?._subcommand) : collectCommandAnalytics(interaction.customId);
  } catch (error) {
    console.error(error);
  }
});
// const refreshWatchedCollection = () => (
//   watchedKeywordsCollection = db.getWatchedKeywords()
// )

client.on('typingStart', ({ channel, user }) => {
  if (channel.type === "dm") return;
  if (activeUsersCollection.filter(userActivity => (userActivity.userId === user.id && userActivity.serverId === channel.guild.id)).length === 0) activeUsersCollection.push({
    userId: user.id,
    serverId: channel.guild.id,
    timestamp: Date.now()
  });
})

setInterval(function () {
  // cleanup task: executes every 3 minutes
  let timestamp = Date.now();
  activeUsersCollection = activeUsersCollection.filter(function (userActivity) {
    return timestamp < userActivity.timestamp + (3000 * 60);
  });
}, 30000);

// client.on('messageReactionAdd', (reaction, user) => {
//   console.log(`${user.username}: added "${reaction.emoji.name}".`);
// });

// client.on('messageReactionRemove', (reaction, user) => {
//   console.log(`${user.username}: removed "${reaction.emoji.name}".`);
// });

client.on('messageCreate', message => {
  if (message.author.bot) return;
  if (message.channel.type === "DM") {
    if (message.author.id === process.env.OWNER && message.reference !== null) {
      message.channel.messages.fetch(message.reference.messageId)
        .then(referenceMessage => {
          client.users.cache.get(referenceMessage.content.split(/ +/g)[0])
            .send(message.content);
        }).catch(error => {
          console.error(error)
          client.users.cache.get(process.env.OWNER).send(`❌ Failed to send the message.`);
        })
      return;
    }
    client.users.cache.get(process.env.OWNER)
      .send(`${message.author.id} ${message.author.username}#${message.author.discriminator} \n${message.content}`);
    return;
  }

  if (serversConfig.filter(data => data?.serverId === message.channel.guild.id).length === 0) return refreshServersConfigListing();
  const server = {
    name: message.channel.guild.name,
    id: message.channel.guild.id,
    prefix: serversConfig.filter(data => data?.serverId === message.channel.guild.id)[0]?.prefix ? serversConfig.filter(data => data?.serverId === message.channel.guild.id)[0]?.prefix : '!',
    isPremium: serversConfig.filter(data => data?.serverId === message.channel.guild.id)[0]?.isSubscribed
  },
    user = {
      id: message.author.id,
      name: message.author.username,
      isAdmin: message.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR),
      isModerator: message.member.permissions.has(Permissions.FLAGS.KICK_MEMBERS) || message.member.permissions.has(Permissions.FLAGS.BAN_MEMBERS),
      isNew: Math.round(new Date() - message.member.joinedAt) / (1000 * 60 * 60 * 24) <= 7,
      isRegular: Math.round(new Date() - message.member.joinedAt) / (1000 * 60 * 60 * 24) >= 30,
    };
  db.getWatchedKeywords().then(entireCollection => {
    entireCollection.filter(watchedKeywordsCollection => watchedKeywordsCollection.serverId === server.id).map(watchedKeywordsGuild => {
      const words = watchedKeywordsGuild.watchedWords;
      const isWatcherActive = activeUsersCollection.filter(userActivity => userActivity.userId === watchedKeywordsGuild.userId).filter(function (serverFilter) {
        return (serverFilter.serverId === server.id);
      }).length > 0;
      words.forEach(word => {
        // change to contains?
        if (message.content.toLowerCase().indexOf(word) != -1) client.users.fetch(watchedKeywordsGuild.userId, false).then((user) => {
          const guild = client.guilds.cache.get(server.id);
          if (!guild.members.cache.get(watchedKeywordsGuild.userId)) {
            db.removeWatchedKeyword(watchedKeywordsGuild.userId, server.id).then(resp => {
              // refreshWatchedCollection()
              console.info('Removed watcher: ' + watchedKeywordsGuild.userId)
              return;
            })
          } else {
            try {
              if (watchedKeywordsGuild.userId === message.author.id
                || isWatcherActive
                || !message.channel.permissionsFor(watchedKeywordsGuild.userId).has(Permissions.FLAGS.VIEW_CHANNEL)) return;
              const trackingNoticeMod = new MessageEmbed()
                .setTitle(`❗ Tracked keyword "${word}" triggered`)
                .setDescription(message.content)
                .addFields(
                  { name: 'Message Author', value: `<@${message.author.id}>`, inline: true },
                  { name: 'Author ID', value: message.author.id, inline: true },
                  { name: 'Channel', value: `${server.name}/${message.channel.name} | 🔗 [Message link](${message.url})` }
                )
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .setFooter(`Stop tracking with /watch remove command in ${server.name} server.`)
                .setColor(getRandomColor(guild.members.cache.get(message.author.id).displayName));
              user.send((message.channel.permissionsFor(watchedKeywordsGuild.userId).has(Permissions.FLAGS.KICK_MEMBERS) || message.channel.permissionsFor(watchedKeywordsGuild.userId).has(Permissions.FLAGS.BAN_MEMBERS)) ? { embeds: [trackingNoticeMod] } : { embeds: [trackingNoticeMod] }).catch(error => {
                console.info(`Could not send DM to ${watchedKeywordsGuild.userId}, tracking is being disabled.`);
                db.removeWatchedKeyword(watchedKeywordsGuild.userId, server.id).then(resp => {
                  // refreshWatchedCollection()
                })
              });
            } catch (error) {
              console.error({
                author: message.author.id,
                message: message.content,
                watcher: watchedKeywordsGuild.userId,
                server: server.id,
                error: error
              })
            }
          }
        });
      });
    })
  })
  if (server.isPremium && !(message.member.permissions.has(Permissions.FLAGS.KICK_MEMBERS) || message.member.permissions.has(Permissions.FLAGS.BAN_MEMBERS) || message.member.roles.cache.has('332343869163438080')) || process.env.DEVELOPMENT === 'true') {
    getToxicity(message.content, message, false).then(toxicity => {
      // console.info(`${getTime()} #${message.channel.name} ${message.author.username}: ${message.content} | ${chalk.red((Number(toxicity.toxicity) * 100).toFixed(2))} ${chalk.red((Number(toxicity.insult) * 100).toFixed(2))}`)
      const messageToxicity = toxicity.toxicity;
      const alerts = async (messages) => {
        // alerts.filter(a => toxicity.toxicity >= a.threshold || toxicity.combined >= .80) removed filters temp
        const totalInfractions = await db.getRecord(user.id, message.guild.id).then(data => data[0]?.message?.length ?? '0')
        db.getAlerts(message.channel.guild.id).then(alerts => alerts.forEach(alert => {
          const role = alerts[0].mutedRoleId,
            member = message.guild.members.cache.get(message.author.id),
            secondMessage = messages[1] ? {
              name: `Second message (Toxicity: ${Math.round(Number(messages[1].values.toxicity) * 100)}%, Insult: ${Math.round(Number(messages[1].values.insult) * 100)}%)`,
              value: messages[1].message.length > 1024 ? messages[1].message.slice(0, 1021).padEnd(1024, '.') : messages[1].message, inline: false
            } : { name: 'Second message', value: 'No recent message found.' },
            thirdMessage = messages[2] ? {
              name: `Third message (Toxicity: ${Math.round(Number(messages[2].values.toxicity) * 100)}%, Insult: ${Math.round(Number(messages[2].values.insult) * 100)}%)`,
              value: messages[2].message.length > 1024 ? messages[2].message.slice(0, 1021).padEnd(1024, '.') : messages[2].message, inline: false
            } : { name: 'Third message', value: 'No recent message found.' },
            removedMessage = message.content,
            removedMessageAttachmentArray = [];
          message.attachments.forEach(attachment => {
            removedMessageAttachmentArray.push(attachment.url);
          })
          message.delete({ reason: "Removed potentially toxic message." }).catch(() => {
            console.info(
              `Could not delete message ${message.content} | ${message.id}.`
            );
          }).then(async () => {
            if (role) member.roles.add(role);
            const infractionMessageResponse = role ? 'Message has been flagged for review, awaiting moderation response.' : 'Message has been flagged for a review, ⚠ user is not muted.',
              hardCodedApplePerms = (data) => data.roles.cache.has('332343869163438080'),
              channelMembersWithAccess = await client.guilds.cache.get(server.id).channels.fetch(alert.channelId).then(channel => (channel.members.filter((member) => ((member.permissions.has(Permissions.FLAGS.KICK_MEMBERS) || hardCodedApplePerms(member)) && member.presence !== null && member.presence?.status !== 'offline' && member.user?.bot === false)))),
              channelMembersWithAccessAll = await client.guilds.cache.get(server.id).channels.fetch(alert.channelId).then(channel => (channel.members.filter((member) => ((member.permissions.has(Permissions.FLAGS.KICK_MEMBERS) || hardCodedApplePerms(member)) && member.user?.bot === false)))),
              serverThreads = await client.guilds.cache.get(server.id).channels.fetch(alert.channelId).then((threads) => threads.threads),
              matchingThread = await serverThreads.fetchArchived().then(thread => thread.threads.filter(y => y.name.split(/ +/g).slice(-1)[0] === member.id).first());

            message.channel.send(infractionMessageResponse).then(async sentMessage => {
              const investigationEmbed = new MessageEmbed()
                .setColor('#ffbd2e')
                .setAuthor('Alert type: Toxicity')
                .setTitle(`🔎 Investigate user's message`)
                .addFields(
                  {
                    name: `Trigger message (Toxicity: ${Math.round(Number(messageToxicity) * 100)}%, Insult: ${Math.round(Number(toxicity.insult) * 100)}%)`,
                    value: removedMessage.length > 1024 ? removedMessage.slice(0, 1021).padEnd(1024, '.') ?? 'No recent message found.' : removedMessage ?? 'No recent message found.',
                    inline: false
                  }
                )
                .setFooter(`${message.channel.id} ${sentMessage.id}`);

              const embedArray = [investigationEmbed];
              let attachmentCount = 0,
                itemsProcessed = 0;
              removedMessageAttachmentArray.forEach(attachmentUrl => {
                let urlSplits = attachmentUrl.split('/');
                let attachmentEmbed = new MessageEmbed()
                  .setColor('#ffbd2e')
                  .setTitle(`Trigger attachment: ${urlSplits[urlSplits.length - 1]}`)
                  .setImage(attachmentUrl)
                  .setFooter(`${attachmentCount += + 1}  •  Attachment ID: ${urlSplits[5]}`);
                embedArray.push(attachmentEmbed);
              })
              const reportActions = new MessageActionRow()
                .addComponents(
                  new MessageButton()
                    .setCustomId('reportApprovalAction')
                    .setLabel('Approve')
                    .setStyle('SUCCESS'),
                  new MessageButton()
                    .setCustomId('reportApprovalUnmuteAction')
                    .setLabel('Approve & unmute')
                    .setStyle('SUCCESS'),
                  new MessageButton()
                    .setCustomId('reportRejectionAction')
                    .setLabel('Reject & unmute')
                    .setStyle('SECONDARY'),
                  new MessageButton()
                    .setCustomId('reportApprovalActionBan')
                    .setLabel('Ban')
                    .setStyle('DANGER')
                    .setDisabled(true)
                );
              if (messages[1]) investigationEmbed.addField(
                `Second message (Toxicity: ${Math.round(Number(messages[1].values.toxicity) * 100)}%, Insult: ${Math.round(Number(messages[1].values.insult) * 100)}%)`,
                messages[1].message.length > 1024 ? messages[1].message.slice(0, 1021).padEnd(1024, '.') : messages[1].message,
                false);
              if (messages[2]) investigationEmbed.addField(
                `Third message (Toxicity: ${Math.round(Number(messages[2].values.toxicity) * 100)}%, Insult: ${Math.round(Number(messages[2].values.insult) * 100)}%)`,
                messages[2].message.length > 1024 ? messages[2].message.slice(0, 1021).padEnd(1024, '.') : messages[2].message,
                false);
              investigationEmbed.addFields(
                { name: 'User', value: `<@${message.author.id}>`, inline: true },
                { name: 'User ID', value: `${message.author.id}`, inline: true },
                { name: 'Is user new?', value: `${user.isNew ? "Yes" : "No"}`, inline: true },
                { name: 'Total infractions', value: `${totalInfractions >= 1 ? totalInfractions : 'No infractions present.'}`, inline: true },
                { name: 'Channel', value: `<#${message.channel.id}> | 🔗 [Message link](${sentMessage.url})` }
              )
              // alertRecipient = alert.channelId === '792393096020885524' ? `<@${process.env.OWNER}>` : '@here';
              const sendReport = (selectedThreadMods, thread) => {
                itemsProcessed++
                if (itemsProcessed === selectedThreadMods.size) {
                  thread.send({
                    content: '@here',
                    embeds: embedArray,
                    components: [reportActions]
                  }).then(async sentReport => {
                    const pins = await thread.messages.fetchPinned().then(pinned => {
                      return pinned
                    })
                    if (pins.size >= 49) pins.last().unpin();
                    sentReport.pin(true)
                  }).catch(console.error);
                }
              }
              if (matchingThread !== undefined) {
                await matchingThread.setArchived(false)
                thread = matchingThread
                if (channelMembersWithAccess.map(user => user).length > 0) {
                  channelMembersWithAccess.forEach(moderator => {
                    thread.members.add(moderator).then(() => sendReport(channelMembersWithAccess, thread))
                  })
                } else {
                  channelMembersWithAccessAll.forEach(moderator => {
                    thread.members.add(moderator).then(() => sendReport(channelMembersWithAccessAll, thread))
                  })
                }
              } else {
                serverThreads.create({
                  name: `${message.author.username.slice(0, 10)} ${message.author.id}`,
                  autoArchiveDuration: 1440,
                  reason: `Infraction received for user ${message.author.id}`,
                }).then(async newThread => {
                  thread = newThread
                  if (channelMembersWithAccess.map(user => user).length > 0) {
                    channelMembersWithAccess.forEach(moderator =>
                      thread.members.add(moderator).then(() => sendReport(channelMembersWithAccess, thread))
                    )
                  } else {
                    channelMembersWithAccessAll.forEach(moderator =>
                      thread.members.add(moderator).then(() => sendReport(channelMembersWithAccessAll, thread))
                    )
                  }
                })
              }
            })
          })
        }))
      }

      if ((((messageToxicity >= .85 || toxicity.insult >= .95) && user.isNew) || (messageToxicity >= .85 || toxicity.combined >= .85))) {
        // console.info(`${getTime()} #${message.channel.name} ${message.author.username}: ${message.content} | ${chalk.red((Number(messageToxicity) * 100).toFixed(2))} ${chalk.red((Number(toxicity.insult) * 100).toFixed(2))}`)
        if (Math.random() < 0.5) message.channel.sendTyping();
        const evaluatedMessages = [];
        async function getLatestUserMessages (userId) {
          await message.channel.messages.fetch({
            limit: 30
          }).then(message => {
            const getLatestMessages = message.filter(function (message) {
              if (this.count < 3 && message.author.id === userId) {
                message => message.author.id === userId
                this.count++;
                return true;
              }
              return false;
            }, { count: 0 })
            getLatestMessages.forEach(message => {
              evaluatedMessages.push({ content: message.content })
            })
          })

          async function getEvaluatedMessages () {
            let resolvedMessages = await Promise.all(evaluatedMessages.map(async (evaluationMessage) => {
              const result = await getToxicity(evaluationMessage.content, message, true);
              output = {
                message: evaluationMessage.content,
                values: result
              };
              return output;
            }));
            return resolvedMessages
          }
          return getEvaluatedMessages()
        }
        getLatestUserMessages(message.author.id).then(function (result) {
          // console.info(result)
          if (result.length === 2) {
            if (isNaN(result[1].values.toxicity)) return;
            if (((result[0].values.toxicity + result[1].values.toxicity) / 2) >= .70 && !user.isRegular) {
              alerts(result)
            }
          }
          if (result.length === 3) {
            if ((isNaN(result[1].values.toxicity)) || (isNaN(result[2].values.toxicity))) return;
            if (((result[0].values.toxicity + result[1].values.toxicity + result[2].values.toxicity) / 3) >= .70) {
              alerts(result)
            }
          } else {
            if (!user.isNew) return;
            try {
              alerts(result)
            } catch (error) {
              console.error(error)
            }
          }
        })
      }
    })
  }

  if (message.content.startsWith(server.prefix)) {
    const args = message.content.slice(server.prefix.length).trim().split(/ +/g),
      command = args.shift().toLowerCase(),
      commandMessage = args.join(' '),
      mention = message.mentions.members.first(),
      isModerator = message.member.permissions.has(Permissions.FLAGS.KICK_MEMBERS) || message.member.permissions.has(Permissions.FLAGS.BAN_MEMBERS);
    let userArgFormat = args.length === 0 ? message.author.id : args[0];
    switch (command) {
      // case 'flags':
      //   // TODO: limit amount of records that get shown(to last 4 maybe?)
      //   // Show total amount of records
      //   // Add embed
      //   if (mention) userArgFormat = mention.user.id;
      //   if (!Number.isInteger(+userArgFormat)) {
      //     message.channel.send('Invalid user ID or mention provided.')
      //     break;
      //   }
      //   db.getRecord(userArgFormat, server.id).then(data => {
      //     if (data.length !== 0) {
      //       message.channel.send('Flags record \n' + data[0].message.map(x => `||${x.message}|| - ${x.toxicity} \n`).join(''))
      //     } else {
      //       message.channel.send('No records found for this user.')
      //     }
      //   })
      //   break;
      case 'eval':
      case 'dot':
        if (message.author.id === process.env.OWNER) {
          try {
            const executeCode = (code) => {
              return eval(code);
            },
              executionResult = executeCode(commandMessage);
            JSON.stringify(executionResult)?.length > 2000 ?
              (message.channel.send('Response is too long, check console.'), console.info(executionResult))
              :
              message.channel.send(JSON.stringify(executionResult), { code: "xl" })
          } catch (error) {
            console.error(error)
            message.channel.send('Something went horribly wrong, check the logs.')
          }
        }
        break;
      case 'watch':
      case 'track':
        const watchCommandSlashMigrationNoticeEmbed = new MessageEmbed()
          .setColor('#0099ff')
          .setTitle('The !watch (or !track) command has been migrated to a new home!')
          .setDescription('You can now use it along with other slash commands.\nType `/watch add` to use it.')
          .setTimestamp();
        message.channel.send({ embeds: [watchCommandSlashMigrationNoticeEmbed] });
        break;
      case 'unwatch':
      case 'untrack':
        const watchCommandSlashMigrationNoticeEmbed1 = new MessageEmbed()
          .setColor('#0099ff')
          .setTitle('The !unwatch (or !untrack) command has been migrated to a new home!')
          .setDescription('You can now use it along with other slash commands.\nType `/watch remove` to use it in an overhauled way.')
          .setTimestamp();
        message.channel.send({ embeds: [watchCommandSlashMigrationNoticeEmbed1] });
        break;
      case 'repeat':
      case 'dotpeat':
        if (message.author.id === process.env.OWNER) {
          message.delete({ reason: "Command initiation message." }).catch(() => {
            console.info(
              `Could not delete message ${message.content} | ${message.id}.`
            );
          });
          message.channel.send(commandMessage)
        }
        break;
      case 'sendfeedback':
        const attribute = args.slice(0, 1)[0],
          suggestedScore = args.slice(args.length - 1, args.length)[0],
          suggestionMessage = args.slice(1, args.length - 1)[0];
        if (args.length < 3) {
          message.channel.send('You must provide three arguments. \n `!sendfeedback [attribute] [comment] [suggested score]`')
        } else {
          if (user.isAdmin) {
            perspective.sendFeedback(attribute, suggestionMessage, suggestedScore, message).then(response => {
              message.channel.send(response)
            })
          } else {
            message.channel.send('insufficient permissions.')
          }
        }
        break;
      case 'dotprefix':
        if (user.isAdmin) {
          const maxPrefixLength = 4,
            prefixInputLength = args[0]?.length;
          if (prefixInputLength > 0 && prefixInputLength <= maxPrefixLength) {
            db.updateServerPrefix(
              server.id, args[0]
            ).then(data => {
              serversConfigStore = []
              if (data) client.guilds.cache.forEach(server => {
                db.saveServerConfig(
                  +new Date, server.id //rework schema to eliminate the need of pushing date unecessarily here or make a find function
                ).then(data => {
                  serversConfigStore.push(data)
                })
              })
              serversConfig = serversConfigStore;
              message.channel.send("Prefix changed.");
            })
          } else {
            message.channel.send(`Failed to change the prefix: length must have maximum length of ${maxPrefixLength} characters.`);
          }
        }
        break;
    }
  }

  async function getToxicity (rawMessage, message, dataCollection) {
    const getSanitizedEmojis = new RegExp(/<((!?\d+)|(:.+?:\d+))>/g),
      getSanitizedMentions = new RegExp(/<!?(@|@!|@&)(\d+)>/g),
      getSanitizedChannels = new RegExp(/<!?#(\d+)>/g),
      names = ['Jack', 'Jennifer'];
    let unsanitizedMessage = rawMessage.replace(/([\u2011-\u27BF]|[\uE000-\uF8FF]|[\uD800-\uDBFF][\uDC00-\uDFFF])/g, '')
    unsanitizedMessage = unsanitizedMessage.replace(getSanitizedEmojis, '');
    unsanitizedMessage = unsanitizedMessage.replace(getSanitizedChannels, '#' + message.channel.name);
    const sanitizedMessage = unsanitizedMessage.replace(getSanitizedMentions, names[Math.floor(Math.random() * 2)]);

    if (!sanitizedMessage.startsWith(server.prefix) && !sanitizedMessage.startsWith('>') && sanitizedMessage.length !== 0) {
      try {
        const result = await fetch({
          method: 'POST',
          uri: `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${process.env.PERSPECTIVE_KEY}`,
          body: {
            comment: {
              text: sanitizedMessage,
              type: 'PLAIN_TEXT'
            },
            languages: ['en'],
            requestedAttributes: { SEVERE_TOXICITY: {}, INSULT: {} },
            doNotStore: dataCollection,
            communityId: `${server.name}/${message.channel.name}`
          },
          json: true
        })
        return { toxicity: result.attributeScores.SEVERE_TOXICITY.summaryScore.value, insult: result.attributeScores.INSULT.summaryScore.value, combined: (result.attributeScores.SEVERE_TOXICITY.summaryScore.value + result.attributeScores.INSULT.summaryScore.value) / 2 }
      } catch (e) {
        console.error(e)
        return { toxicity: NaN, insult: NaN, combined: NaN }
      }
    } else {
      return { toxicity: NaN, insult: NaN, combined: NaN }
    }
  }
})
