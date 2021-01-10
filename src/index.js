const Discord = require('discord.js'),
  client = new Discord.Client(),
  Sentry = require('@sentry/node'),
  chalk = require('chalk'),
  fetch = require('request-promise-native'),
  db = require('./db'),
  perspective = require('./api/perspective'),
  { getTime } = require('./utils'),
  fs = require('fs'),
  commandFiles = fs.readdirSync('./src/features/commands/').filter(file => file.endsWith('.js'));

client.commands = new Discord.Collection();
commandFiles.map(file => {
  const command = require(`./features/commands/${file}`);
  client.commands.set(command.name, command);
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
let watchedKeywordsCollection = db.getWatchedKeywords(),
  activeUsersCollection = [];

client.on('ready', () => {
  console.info(chalk.green(`Logged in as ${client.user.tag}!`));
  client.user.setActivity(`Dotsimus.com traffic`, { type: 'WATCHING' });
  // let hours = 0;
  // setInterval(async () => {
  //   hours += 1;
  //   await client.user.setActivity(`chat for ${hours} hour(s)`, { type: 'WATCHING' });
  // }, 3600000);
  refreshServersConfigListing()
  // client.api.applications('731190736996794420').guilds('553939036490956801').commands('792118637808058408').delete()
  // client.api.applications('731190736996794420').guilds('553939036490956801').commands.get().then(data => console.log(data))
  client.ws.on("INTERACTION_CREATE", async (interaction) => {
    try {
      client.commands.get(interaction.data.name).execute(client, interaction, activeUsersCollection);
    } catch (error) {
      console.error(error);
    }
  });
});

const refreshWatchedCollection = () => (
  watchedKeywordsCollection = db.getWatchedKeywords()
)

client.on('typingStart', (channel, user) => {
  if (channel.type === "dm") return;
  if (activeUsersCollection.filter(userActivity => (userActivity.userId === user.id && userActivity.serverId === channel.guild.id)).length === 0) activeUsersCollection.push({
    userId: user.id,
    serverId: channel.guild.id,
    timestamp: Date.now()
  });
})

setInterval(function () {
  // cleanup task: executes every 5 minutes
  let timestamp = Date.now();
  activeUsersCollection = activeUsersCollection.filter(function (userActivity) {
    return timestamp < userActivity.timestamp + (5000 * 60);
  });
}, 30000);

client.on('message', message => {
  if (message.author.bot) return;
  if (message.channel.type === "dm") {
    client.users.cache.get('71270107371802624')
      .send(`${message.author.username}#${message.author.discriminator}(${message.author.id}): ${message.content}`);
    return console.info(`${getTime()} #DM ${message.author.username}(${message.author.id}): ${message.content}`);
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
      isAdmin: message.member.hasPermission("ADMINISTRATOR"),
      isModerator: message.member.hasPermission("KICK_MEMBERS") || message.member.hasPermission("BAN_MEMBERS"),
      isNew: Math.round(new Date() - message.member.joinedAt) / (1000 * 60 * 60 * 24) <= 7
    };
  watchedKeywordsCollection.then(entireCollection => {
    entireCollection.filter(watchedKeywordsCollection => watchedKeywordsCollection.serverId === server.id).map(watchedKeywordsGuild => {
      const words = watchedKeywordsGuild.watchedWords;
      const isWatcherActive = activeUsersCollection.filter(userActivity => userActivity.userId === watchedKeywordsGuild.userId).filter(function (serverFilter) {
        return (serverFilter.serverId === server.id);
      }).length > 0;
      words.forEach(word => {
        if (message.content.toLowerCase().indexOf(word) != -1) client.users.fetch(watchedKeywordsGuild.userId, false).then((user) => {
          const guild = client.guilds.cache.get(server.id);
          if (!guild.member(watchedKeywordsGuild.userId)) {
            db.removeWatchedKeyword(watchedKeywordsGuild.userId, server.id).then(resp => {
              refreshWatchedCollection()
              console.info('Removed watcher: ' + watchedKeywordsGuild.userId)
              return;
            })
          } else {
            try {
              if (watchedKeywordsGuild.userId === message.author.id
                || isWatcherActive
                || !message.channel.permissionsFor(watchedKeywordsGuild.userId).serialize()['VIEW_CHANNEL']) return;
              const trackingNoticeMod = new Discord.MessageEmbed()
                .setTitle(`❗ Tracked keyword "${word}" triggered`)
                .setDescription(message.content)
                .addFields(
                  { name: 'Message Author', value: `<@${message.author.id}>`, inline: true },
                  { name: 'Author ID', value: message.author.id, inline: true },
                  { name: 'Channel', value: `${server.name}/${message.channel.name} | 🔗 [Message link](https://discordapp.com/channels/${server.id}/${message.channel.id}/${message.id})` }
                )
                .setTimestamp()
                .setFooter(`Stop tracking with !unwatch command in ${server.name} server.`)
                .setColor('#7289da'),
                trackingNoticeUser = new Discord.MessageEmbed()
                  .setTitle(`❗ Tracked keyword triggered`)
                  .setDescription(`**"${word}"** mentioned in [**${server.name}/${message.channel.name}**.](https://discordapp.com/channels/${server.id}/${message.channel.id}/${message.id})`)
                  .setTimestamp()
                  .setFooter(`Stop tracking with !unwatch command in ${server.name} server.`)
                  .setColor('#7289da');
              user.send((message.channel.permissionsFor(watchedKeywordsGuild.userId).serialize()['KICK_MEMBERS'] || message.channel.permissionsFor(watchedKeywordsGuild.userId).serialize()['BAN_MEMBERS']) ? trackingNoticeMod : trackingNoticeUser).catch(error => {
                console.info(`Could not send DM to ${watchedKeywordsGuild.userId}, tracking is being disabled.`);
                db.removeWatchedKeyword(watchedKeywordsGuild.userId, server.id).then(resp => {
                  refreshWatchedCollection()
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
  if (server.isPremium) {
    getToxicity(message.content, message, false).then(toxicity => {
      // console.info(`${getTime()} #${message.channel.name} ${message.author.username}: ${message.content} | ${chalk.red((Number(toxicity.toxicity) * 100).toFixed(2))} ${chalk.red((Number(toxicity.insult) * 100).toFixed(2))}`)
      const messageToxicity = toxicity.toxicity,
        messageTemplates = [`watch your language.`, `take a break.`, `surely you could pick some nicer words.`, `lets be nice to each other.`],
        warningMessage = Math.floor(Math.random() * messageTemplates.length),
        saveMessage = () => {
          db.saveMessage(
            +new Date,
            server.id,
            user.id,
            user.name,
            user.isNew,
            message.content,
            messageToxicity
          )
        };
      const alerts = async (messages) => {
        // alerts.filter(a => toxicity.toxicity >= a.threshold || toxicity.combined >= .80) removed filters temp
        const totalInfractions = await db.getRecord(user.id, message.guild.id).then(data => data[0]?.message?.length ?? '0')
        db.getAlerts(message.channel.guild.id).then(alerts => alerts.forEach(alert => {
          console.info(alert);
          const role = message.guild.roles.cache.find(role => role.name === 'Muted'),
            member = message.guild.members.cache.get(message.author.id),
            previousMessage = messages[1] ? {
              name: `Previous message (Toxicity: ${Math.round(Number(messages[1].values.toxicity) * 100)}%, Insult: ${Math.round(Number(messages[1].values.insult) * 100)}%)`,
              value: messages[1].message, inline: false
            } : { name: 'Previous message', value: 'No recent message found.' },
            removedMessage = message.content;
          message.delete({ reason: "Removed potentially toxic message." }).catch(() => {
            console.info(
              `Could not delete message ${message.content} | ${message.id}.`
            );
          }).then(() => {
            if (role) member.roles.add(role);
            const infractionMessageResponse = role ? 'Message has been flagged for review, awaiting moderation response.' : 'Message has been flagged for review, ⚠ user is not muted.'
            message.channel.send(infractionMessageResponse).then(sentMessage => {
              const filter = (reaction, user) => {
                return ['✅', '❌'].includes(reaction.emoji.name);
              },
                investigationEmbed = new Discord.MessageEmbed()
                  .setColor('#ffbd2e')
                  .setAuthor('Alert type: Toxicity')
                  .setTitle(`🔎 Investigate user's message`)
                  .addFields(
                    previousMessage,
                    {
                      name: `Current message (Toxicity: ${Math.round(Number(messageToxicity) * 100)}%, Insult: ${Math.round(Number(toxicity.insult) * 100)}%)`,
                      value: removedMessage,
                      inline: false
                    },
                    { name: 'User', value: `<@${message.author.id}>`, inline: true },
                    { name: 'User ID', value: message.author.id, inline: true },
                    { name: 'Is user new?', value: user.isNew ? "Yes" : "No", inline: true },
                    { name: 'Total infractions', value: totalInfractions, inline: true },
                    { name: 'Channel', value: `<#${message.channel.id}> | 🔗 [Message link](https://discordapp.com/channels/${server.id}/${message.channel.id}/${sentMessage.id})` }
                  )
                  .setFooter('✅ marks report as valid, ❌ unmutes user and reinstates message where it was at the time of removal.');
              // remove message from db if moderator reinstates
              saveMessage()
              alertRecipient = alert.channelId === '792393096020885524' ? '<@71270107371802624>' : '@here';
              client.channels.cache.get(alert.channelId).send(alertRecipient, investigationEmbed).then(investigationMessage => {
                const removeBotReactions = () => {
                  const userReactions = investigationMessage.reactions.cache.filter(reaction => reaction.users.cache.has(client.user.id));
                  try {
                    for (const reaction of userReactions.values()) {
                      reaction.users.remove(client.user.id);
                    }
                  } catch (error) {
                    console.error('Failed to remove reactions.');
                  }
                }
                investigationMessage.react('✅').then(() => investigationMessage.react('❌')).then(() => {
                  investigationMessage.awaitReactions(filter, { max: 1, time: 10800000, errors: ['time'] })
                    .then(collected => {
                      const reaction = collected.first();
                      const reinstatedMessage = new Discord.MessageEmbed()
                        .setColor('#32CD32')
                        .setAuthor(`${message.author.username}#${message.author.discriminator}`, `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png`, `https://discord.com/channels/@me/${message.author.id}`)
                        .setDescription(removedMessage)
                        .setFooter('Message reinstated by the moderation team.', `https://cdn.discordapp.com/icons/${message.guild.id}/${message.guild.icon}.webp`);
                      if (reaction.emoji.name === '✅') {
                        sentMessage.edit('Message removed, report verified by the moderation team.');
                        investigationEmbed.setColor('#32CD32');
                        investigationMessage.edit(`Report approved by <@${reaction.users.cache.find(reaction => reaction.bot === false).id}>.`, investigationEmbed);
                        removeBotReactions()
                      } else {
                        sentMessage.edit('', reinstatedMessage);
                        investigationEmbed.setColor('#e91e63');
                        removeBotReactions()
                        member.roles.remove(role)
                        // prettify this, make a separate embed for this instead of re-using
                        member.send(`You're now unmuted and your message is reinstated on **${server.name}** - <https://discordapp.com/channels/${server.id}/${message.channel.id}/${sentMessage.id}>`, reinstatedMessage).catch(error => {
                          console.info({ message: `Could not send unmute notice to ${member.id}.`, error: error });
                        });
                        investigationMessage.edit(`User is unmuted and message reinstated by <@${reaction.users.cache.find(reaction => reaction.bot === false).id}>.`, investigationEmbed);
                      }
                    })
                    .catch(error => {
                      removeBotReactions()
                      investigationMessage.react('❓')
                      investigationEmbed.setColor('#808080');
                      investigationMessage.edit('Report expired.', investigationEmbed)
                      console.error(error);
                    });
                })
              })
            })
          })
          // const mention = a.mention.type === 'role' ? `<@&${a.mention.id}>` : `<@${a.mention.id}>`;
          // let notice = ('@here', investigationEmbed);
          // if (a.mention.type === 'role' && !a.channelId) {
          //   notice = `${mention} members have been notified of potential toxicity.`
          // }
        }))
      }
      // Log both recent messages into the logs within embed
      if ((((messageToxicity >= .75 || toxicity.insult >= .80) && user.isNew) || (messageToxicity >= .80 || toxicity.combined >= .80))) {
        console.info(`${getTime()} #${message.channel.name} ${message.author.username}: ${message.content} | ${chalk.red((Number(messageToxicity) * 100).toFixed(2))} ${chalk.red((Number(toxicity.insult) * 100).toFixed(2))}`)
        const evaluatedMessages = [];
        async function getLatestUserMessages (userId) {
          await message.channel.messages.fetch({
            limit: 30
          }).then(message => {
            const getLatestMessages = message.filter(function (message) {
              if (this.count < 2 && message.author.id === userId) {
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
              console.info({ initmsg: evaluationMessage });
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
          console.info(result)
          if (result.length === 2) {
            if (isNaN(result[1].values.toxicity)) return;
            console.info({ 
              result: result[0].values.toxicity, 
              secondres: result[1].values.toxicity, 
              total: ((result[0].values.toxicity + result[1].values.toxicity) / 2) >= .70 });
            if (((result[0].values.toxicity + result[1].values.toxicity) / 2) >= .70) {
              console.info({
                amount: (result[0].values.toxicity + result[1].values.toxicity) / 2,
                lenght: result.length
              });
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
      isModerator = message.member.hasPermission("KICK_MEMBERS") || message.member.hasPermission("BAN_MEMBERS");
    let userArgFormat = args.length === 0 ? message.author.id : args[0];
    switch (command) {
      case 'flags':
        // TODO: limit amount of records that get shown(to last 4 maybe?)
        // Show total amount of records
        // Add embed
        if (mention) userArgFormat = mention.user.id;
        if (!Number.isInteger(+userArgFormat)) {
          message.channel.send('Invalid user ID or mention provided.')
          break;
        }
        db.getRecord(userArgFormat, server.id).then(data => {
          if (data.length !== 0) {
            message.channel.send('Flags record \n' + data[0].message.map(x => `||${x.message}|| - ${x.toxicity} \n`).join(''))
          } else {
            message.channel.send('No records found for this user.')
          }
        })
        break;
      case 'toxic':
        getToxicity(commandMessage, message, true).then(toxicity => {
          const messageToxicity = toxicity.toxicity
          if (!isNaN(messageToxicity)) {
            message.channel.send(`I am **${(Number(messageToxicity) * 100).toFixed(2)}%** certain that this is a negative message.`);
          } else {
            message.reply('message cannot be analyzed.')
          }
        })
        break;
      case 'grant':
        try {
          grantAccess(message, mention, userArgFormat, isModerator);
        } catch (error) {
          console.error(error)
        }
        break;
      case 'eval':
      case 'dot':
        if (message.author.id === '71270107371802624') {
          try {
            const executeCode = (code) => {
              return eval(code);
            },
              executionResult = executeCode(commandMessage);
            JSON.stringify(executionResult).length > 2000 ?
              (message.channel.send('Response is too long, check console.'), console.info(executionResult))
              :
              message.channel.send(JSON.stringify(executionResult), { code: "xl" })
          } catch (error) {
            console.error(error)
            message.channel.send('Something went horribly wrong, check the logs.')
          }
        }
        break;
      case 'test':
      case 'debug':
        getToxicity(commandMessage, message, true).then(toxicity => {
          if (!isNaN(toxicity.toxicity)) {
            const embedResponse = new Discord.MessageEmbed()
              .setColor('#ffbd2e')
              .addFields(
                { name: 'Message', value: commandMessage.slice(0, 1024) },
                { name: 'Probability', value: `**Toxicity:** ${toxicity.toxicity} \n **Insult:** ${toxicity.insult}` },
                { name: 'Combined probability', value: toxicity.combined }
              );
            message.channel.send(embedResponse);
          } else {
            message.reply('message cannot be analyzed.')
          }
        })
        break;
      case 'watch':
      case 'track':
        if (args.length === 0) return;
        const trackingWord = args[0].toLowerCase();
        try {
          db.watchKeyword(message.author.id, server.id, trackingWord).then(resp => {
            refreshWatchedCollection().then(resp => db.getWatchedKeywords(message.author.id, server.id).then(keywords => {
              const list = keywords[0].watchedWords
              message.react("✅")
              message.author.send(`\`${trackingWord}\` keyword tracking is set up successfully.\nCurrently tracked keywords:\n${list.map(keyword => `${keyword} \n`).join('')}You can track up to 5 keywords.`)
            }))
          })

        } catch (error) {
          message.reply('allow direct messages from server members in this server for this feature to work.')
        }
        break;
      case 'unwatch':
      case 'untrack':
        db.removeWatchedKeyword(message.author.id, server.id).then(resp => {
          refreshWatchedCollection()
        })
        message.react("✅")
        break;
      case 'setalerts':
        message.channel.send(user.isAdmin ? 'true' : 'false')
        break;
      case 'repeat':
      case 'dotpeat':
        if (user.isAdmin) {
          message.delete({ reason: "Command initiation message." }).catch(() => {
            console.info(
              `Could not delete message ${message.content} | ${message.id}.`
            );
          });
          message.channel.send(commandMessage)
        }
        break;
      case 'uptime':
        let days = Math.floor(client.uptime / 86400000),
          hours = Math.floor(client.uptime / 3600000) % 24,
          minutes = Math.floor(client.uptime / 60000) % 60,
          seconds = Math.floor(client.uptime / 1000) % 60;
        message.channel.send(`Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s`);
        break;
      // case 'help':
      // case 'dothelp':
      //   // TODO: Make prefixes dynamic whenever prefix override will be introduced
      //   const embedResponse = new Discord.MessageEmbed()
      //     .setTitle('Dotsimus and its functionality')
      //     .setDescription('Dotsimus is a machine learning powered chat moderation bot, its goal is to help monitor and protect the server.')
      //     .setColor('#ffbd2e')
      //     .addFields(
      //       { name: '!setAlerts', value: 'Allows to set up alerts to notify moderators whenever user reaches the threshold. \n Usage: `!setAlerts <user or role> <threshold> <channel>`' },
      //       { name: '!toxic', value: 'Shows toxicity certainty for requested message. \n Usage: `!toxic <phrase>`' },
      //       { name: '!debug', value: 'Shows raw toxicity values for requested message. \n Usage: `!debug <phrase>`' },
      //       { name: '!repeat', value: 'Repeats what is said by the user. \n Usage: `!repeat <phrase>`' },
      //       { name: '!rule', value: 'Shows defined rules. \n Usage: `!rule <rule number or all or phrase>`' },
      //       { name: '!uptime', value: 'Shows uptime of the bot. \n Usage: `!uptime`' },
      //       { name: '!flags', value: 'Shows recent messages that were flagged with their values. \n Usage: `!flags <@User or none>`' },
      //       { name: '!watch', value: 'Sends a direct message to you whenever keyword that you track gets mentioned. \n Usage: `!watch <keyword>`' }
      //     );
      //   message.channel.send(embedResponse);
      //   break;
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
      // document command in help section
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
      // document
      // make admin only
      // set up db
      // better command name? alertsSetup?
      // ask whether infraction message should be deleted
      // ask for mute role ID
      case 'setupalerts':
        message.channel.send('[1/3] Enter channel ID for alerts channel.').then(() => {
          const filter = m => m.author.id === message.author.id,
            collector = message.channel.createMessageCollector(filter, { max: 3, time: 60000 });
          collector.next.then(collectorMessage => {
            if (isNaN(collectorMessage.content)) {
              collector.stop('error')
              return Promise.reject('Invalid value provided.')
            };
          }).then(() => {
            message.channel.send('[2/3] Enter alerts treshold, recommended value: `0.85` /n Expected answer: Value from `0.1` to `1`').then(() => {
              collector.next.then(collectorMessage => {
                if (isNaN(collectorMessage.content)) {
                  collector.stop('error')
                  return Promise.reject('Invalid value provided.')
                } else {
                  message.channel.send('[3/3] Should alerts ping with `@here`? /n Expected answers: Yes/No')
                }
              })
            })
          });
          collector.on('end', (collected, reason) => {
            console.log(reason);
            // switch case for errors time, error, limit, default
            if (reason === 'limit') {
              const collectionValues = collected.map(user => user.content)
              console.log(collected.size);
              console.log(collectionValues);
              message.channel.send(`Alerts setup completed
**Channel ID:** ${collectionValues[0]}
**Alerts treshold:** ${collectionValues[1]} 
**Moderation Alert:** ${collectionValues[2]}`)
            } else {
              message.channel.send(`Alerts setup failed
Reason: \`${reason}\``)
            }
          });
        });
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

    // TODO: Properly exclude quotes instead of ignoring comments with quotes
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

const grantAccess = (message, mention, user, isModerator) => {
  if (!isModerator) return;
  const role = message.guild.roles.cache.find(role => role.id === '191569917542268928'),
    member = message.guild.members.cache.get(user);
  if (mention && role) {
    user = mention.user.id;
    message.guild.members.cache.get(user).roles.add(role)
    message.reply('user has been granted access to the server.');
  } else {
    message.guild.members.cache.get(user).roles.add(role)
    message.reply('user has been granted access to the server.');
  }
  if (!Number.isInteger(+user)) {
    message.channel.send('Invalid user ID or mention provided.');
  }
}
