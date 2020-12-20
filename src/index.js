const Discord = require('discord.js'),
  client = new Discord.Client(),
  Sentry = require('@sentry/node'),
  chalk = require('chalk'),
  request = require('request-promise-native'),
  db = require('./db'),
  perspective = require('./api/perspective'),
  PaginationEmbed = require('discord-paginationembed'),
  DEFAULT_ALERT_THRESHOLD = 0.8;
const { getTime, toxicityReport } = require('./utils');

if (process.env.DEVELOPMENT !== 'true') Sentry.init({ dsn: process.env.SENTRY_DSN });

let prefix = '!';
db.initialize.then(function (response) {
  console.info(chalk.green(response))
  client.login(process.env.BOT_TOKEN);
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
client.on('ready', () => {
  console.info(chalk.green(`Logged in as ${client.user.tag}!`));
  client.user.setActivity(`chat`, { type: 'WATCHING' });
  let hours = 0;
  setInterval(async () => {
    hours += 1;
    await client.user.setActivity(`chat for ${hours} hour(s)`, { type: 'WATCHING' });
  }, 3600000);
  refreshServersConfigListing()
});

let watchedKeywordsCollection = db.getWatchedKeywords(),
  activeUsersCollection = [];
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
  if (message.author.bot || process.env.DEVELOPMENT === 'true' && !(message.author.id === '71270107371802624')) return;
  if (message.channel.type === "dm") {
    client.users.fetch('71270107371802624', false).then((user) =>
      user.send(`<@${message.author.id}>: ${message.content}`)
    )
    return console.info(`${getTime()} #DM ${message.author.username}: ${message.content}`);
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
      isNew: message.guild.members.cache.get(message.author.id).roles.cache.map(roles => `${roles}`).length === 1
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
      const alerts = () => {
        // alerts.filter(a => toxicity.toxicity >= a.threshold || toxicity.combined >= .80) removed filters temp
        db.getAlerts(message.channel.guild.id).then(alerts => alerts.forEach(a => {
          const investigationEmbed = new Discord.MessageEmbed()
            .setColor('#ffbd2e')
            .setDescription(`🔎 **Investigate user's message(${(Number(messageToxicity) * 100).toFixed(2)}, ${(Number(toxicity.insult) * 100).toFixed(2)})** \n ${message.content.slice(0, 1024)}`)
            .addFields(
              { name: 'User', value: `<@${message.author.id}>`, inline: true },
              { name: 'User ID', value: message.author.id, inline: true },
              { name: 'Is user new?', value: user.isNew ? "Yes" : "No", inline: true },
              { name: 'Channel', value: `<#${message.channel.id}> | 🔗 [Message link](https://discordapp.com/channels/${server.id}/${message.channel.id}/${message.id})` }
            );
          const mention = a.mention.type === 'role' ? `<@&${a.mention.id}>` : `<@${a.mention.id}>`;
          let notice = ('@here', investigationEmbed);
          if (a.mention.type === 'role' && !a.channelId) {
            notice = `${mention} members have been notified of potential toxicity.`
          }
          client.channels.cache.get(a.channelId).send('@here', investigationEmbed).then(function (embedMessage) {
            embedMessage.react("👍")
            embedMessage.react("👎")
          })
        }))
      }
      // Log both recent messages into the logs within embed
      if ((((messageToxicity >= .75 || toxicity.insult >= .80) && user.isNew) || (messageToxicity >= .80 || toxicity.combined >= .80)) && server.id === '150662382874525696') {
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
              console.log({ initmsg: evaluationMessage });
              const result = await getToxicity(evaluationMessage.content, message, true);
              output = result;
              return output;
            }));
            return resolvedMessages
          }
          return getEvaluatedMessages()
        }
        getLatestUserMessages(message.author.id).then(function (result) {
          console.log({ endResult: result })
          const newInvestigationEmbed = new Discord.MessageEmbed()
            .setColor('#ffbd2e')
            .setDescription(`🔎 **Investigate **new user's** message(${(Number(messageToxicity) * 100).toFixed(2)}, ${(Number(toxicity.insult) * 100).toFixed(2)})** \n ${message.content.slice(0, 1024)}`)
            .addFields(
              { name: 'User', value: `<@${message.author.id}>`, inline: true },
              { name: 'User ID', value: message.author.id, inline: true },
              { name: 'Is user new?', value: user.isNew ? "Yes" : "No", inline: true },
              { name: 'Channel', value: `<#${message.channel.id}> | 🔗 [Message link](https://discordapp.com/channels/${server.id}/${message.channel.id}/${message.id})` }
            );
          const role = message.guild.roles.cache.find(role => role.name === 'Muted'),
            member = message.guild.members.cache.get(message.author.id);
          if (result.length === 2) {
            if (isNaN(result[1].toxicity)) return;
            console.info({ result: result[0].toxicity, secondres: result[1].toxicity, total: ((result[0].toxicity + result[1].toxicity) / 2) >= .70 });
            if (((result[0].toxicity + result[1].toxicity) / 2) >= .70) {
              console.info({ amount: (result[0].toxicity + result[1].toxicity) / 2, lenght: result.length });
              message.delete({ reason: "toxic message" }).catch(() => {
                console.info(
                  `Could not delete message ${message.content} | ${message.id}.`
                );
              });
              if (role) {
                member.roles.add(role);
                message.reply('has been flagged for review.')
              } else {
                message.channel.send('Failed to mute.')
              }
              saveMessage()
              user.isNew ? client.channels.cache.get('745276933767430255').send('@here', newInvestigationEmbed).then(function (embedMessage) {
                embedMessage.react("👍")
                embedMessage.react("👎")
              }) : alerts();
            }
          } else {
            if (!user.isNew) return;
            try {
              message.delete({ reason: "toxic message" }).catch(() => {
                console.info(
                  `Could not delete message ${message.content} | ${message.id}.`
                );
              });
              if (role) {
                member.roles.add(role);
                message.reply('has been flagged for review.')
              } else {
                message.channel.send('Failed to mute.')
              }
              try {
                user.isNew ? saveMessage() : ''
                user.isNew ? client.channels.cache.get('745276933767430255').send('@here', newInvestigationEmbed).then(function (embedMessage) {
                  embedMessage.react("👍")
                  embedMessage.react("👎")
                }) : alerts();
              } catch (error) {
                console.error(error)
              }
            } catch (error) {
              console.error(error)
              message.channel.send('Failed to mute.')
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
          message.delete({ reason: "Command initiation message." });
          message.channel.send(commandMessage)
        }
        break;
      case 'activity':
      case 'serveractivity':
        // add to commands list
        const activeUsers = activeUsersCollection.filter(userActivity => userActivity.serverId === server.id).length
        message.channel.send(`${activeUsers} ${activeUsers > 1 ? 'users' : 'user'} engaged with the server in the past ~5 minutes.`)
        break;
      case 'uptime':
        let days = Math.floor(client.uptime / 86400000),
          hours = Math.floor(client.uptime / 3600000) % 24,
          minutes = Math.floor(client.uptime / 60000) % 60,
          seconds = Math.floor(client.uptime / 1000) % 60;
        message.channel.send(`Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s`);
        break;
      case 'help':
      case 'dothelp':
        // TODO: Make prefixes dynamic whenever prefix override will be introduced
        const embedResponse = new Discord.MessageEmbed()
          .setTitle('Dotsimus and its functionality')
          .setDescription('Dotsimus is a machine learning powered chat moderation bot, its goal is to help monitor and protect the server.')
          .setColor('#ffbd2e')
          .addFields(
            { name: '!setAlerts', value: 'Allows to set up alerts to notify moderators whenever user reaches the threshold. \n Usage: `!setAlerts <user or role> <threshold> <channel>`' },
            { name: '!toxic', value: 'Shows toxicity certainty for requested message. \n Usage: `!toxic <phrase>`' },
            { name: '!debug', value: 'Shows raw toxicity values for requested message. \n Usage: `!debug <phrase>`' },
            { name: '!repeat', value: 'Repeats what is said by the user. \n Usage: `!repeat <phrase>`' },
            { name: '!rule', value: 'Shows defined rules. \n Usage: `!rule <rule number or all or phrase>`' },
            { name: '!uptime', value: 'Shows uptime of the bot. \n Usage: `!uptime`' },
            { name: '!flags', value: 'Shows recent messages that were flagged with their values. \n Usage: `!flags <@User or none>`' },
            { name: '!watch', value: 'Sends a direct message to you whenever keyword that you track gets mentioned. \n Usage: `!watch <keyword>`' }
          );
        message.channel.send(embedResponse);
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
      // TODO: limit to 25
      case 'rules':
      case 'rule':
        const rules = [
          {
            description: 'No harassment, hate speech, racism, sexism, trolling, stereotype based attacks, or spreading harmful/false information. You may be banned immediately and without warning or recourse.',
            link: 'https://msft.chat/member/#_1-no-harassment-hate-speech-racism-sexism-trolling-stereotype-based-attacks-or-spreading-harmful-false-information-you-may-be-banned-immediately-and-without-warning-or-recourse'
          },
          {
            description: 'Do not post anything that is NSFW. If you are unsure if it\'s considered NSFW you shouldn\'t post it.',
            link: 'https://msft.chat/member/#_2-do-not-post-anything-that-is-nsfw-if-you-are-unsure-if-it-s-considered-nsfw-you-shouldn-t-post-it'
          },
          {
            description: 'Do not ask for money or any other goods(such as games or Nitro). Likewise, do not advertise / sell your services, products, bots or servers.',
            link: 'https://msft.chat/member/#_3-do-not-ask-for-money-or-any-other-goods-such-as-games-or-nitro-likewise-do-not-advertise-sell-your-services-products-bots-or-servers'
          },
          {
            description: 'Do not stir up drama. If there is a conflict, work to defuse it instead of making it worse.',
            link: 'https://msft.chat/member/#_4-do-not-stir-up-drama-if-there-is-a-conflict-work-to-defuse-it-instead-of-making-it-worse'
          },
          {
            description: 'Do not mention or DM inactive members who aren\'t part of the present conversation. Don\'t bother Microsoft employees(or anyone else) with tech support/moderation related queries. This rule doesn\'t apply if you\'re mentioning someone with whom you have some kind of mutual relationship.',
            link: 'https://msft.chat/member/#_5-do-not-mention-or-dm-inactive-members-who-aren-t-part-of-the-present-conversation-don-t-bother-microsoft-employees-or-anyone-else-with-tech-support-moderation-related-queries-this-rule-doesn-t-apply-if-you-re-mentioning-someone-with-whom-you-have-some-kind-of-mutual-relationship'
          },
          {
            description: 'Refrain from using too many special characters in your current display name. A couple of special symbols are fine so long as there is a normal alphanumeric name that people can easily type. For example, "ExampleName 🧅" is fine, but "👊♙ εχ𝕒м𝐩𝕃𝒆ｎ𝐀𝓶𝔢 💢😾" is not.',
            link: 'https://msft.chat/member/#_6-refrain-from-using-too-many-special-characters-in-your-current-display-name-a-couple-of-special-symbols-are-fine-so-long-as-there-is-a-normal-alphanumeric-name-that-people-can-easily-type-for-example-examplename-%F0%9F%A7%85-is-fine-but-%F0%9F%91%8A%E2%99%99-%CE%B5%CF%87%F0%9D%95%92%D0%BC%F0%9D%90%A9%F0%9D%95%83%F0%9D%92%86n%F0%9D%90%80%F0%9D%93%B6%F0%9D%94%A2-%F0%9F%92%A2%F0%9F%98%BE-is-not'
          },
          {
            description: 'Please be mindful of channels and their uses, failure to do so may result in loss of access to the channel. Bringing something up once is alright, however starting a long discussion about something that belongs in another channel, or posting the same thing across multiple channels, is not.',
            link: 'https://msft.chat/member/#_7-please-be-mindful-of-channels-and-their-uses-failure-to-do-so-may-result-in-loss-of-access-to-the-channel-bringing-something-up-once-is-alright-however-starting-a-long-discussion-about-something-that-belongs-in-another-channel-or-posting-the-same-thing-across-multiple-channels-is-not'
          },
          {
            description: 'Users in direct violation of Discord\'s Terms of Service will be banned without warning. This includes the use of userbots or not meeting the minimum age requirement.',
            link: 'https://msft.chat/member/#_8-users-in-direct-violation-of-discord-s-terms-of-service-will-be-banned-without-warning-this-includes-the-use-of-userbots-or-not-meeting-the-minimum-age-requirement'
          },
          {
            description: 'Check the description in each channel before posting as extended rules may exist for that channel.',
            link: 'https://msft.chat/member/#_9-check-the-description-in-each-channel-before-posting-as-extended-rules-may-exist-for-that-channel'
          },
          {
            description: 'If a staff member tells you to stop doing something then you should stop doing that thing.',
            link: 'https://msft.chat/member/#_10-if-a-staff-member-tells-you-to-stop-doing-something-then-you-should-stop-doing-that-thing'
          },
          {
            description: 'No content related to piracy or illegal activities.',
            link: 'https://msft.chat/member/#_11-no-content-related-to-piracy-or-illegal-activities'
          },
          {
            description: 'No discussing moderation actions outside of modmail.',
            link: 'https://msft.chat/member/#_12-no-discussing-moderation-actions-outside-of-modmail'
          },
          {
            description: 'Do not attempt to take support or other requests outside of the server as we cannot ensure your or the user\'s safety from scams, trolling and abuse. This includes suggesting the use of DMs or remote assistance tools (such as Quick Assist or TeamViewer).',
            link: 'https://msft.chat/member/#_13-do-not-attempt-to-take-support-or-other-requests-outside-of-the-server-as-we-cannot-ensure-your-or-the-user-s-safety-from-scams-trolling-and-abuse-this-includes-suggesting-the-use-of-dms-or-remote-assistance-tools-such-as-quick-assist-or-teamviewer'
          },
          {
            description: 'No content which may induce epilepsy without first making a disclaimer and obstructing the content.',
            link: 'https://msft.chat/member/#_14-no-content-which-may-induce-epilepsy-without-first-making-a-disclaimer-and-obstructing-the-content'
          },
          {
            description: 'No typing in any other language than English; we cannot moderate different languages and most people here speak in English. Failure to oblige will result in a warning or mute.',
            link: 'https://msft.chat/member/#_15-no-typing-in-any-other-language-than-english-we-cannot-moderate-different-languages-and-most-people-here-speak-in-english-failure-to-oblige-will-result-in-a-warning-or-mute'
          },
          {
            description: 'Non contributive, incoherent behavior which is disruptive to the community and conversations will not be tolerated.',
            link: 'https://msft.chat/member/#_16-non-contributive-incoherent-behavior-which-is-disruptive-to-the-community-and-conversations-will-not-be-tolerated'
          }
        ]
        let number = 1;
        const rulesAll = rules.map(rule => ({ name: 'Rule ' + number++, value: rule.description }))
        switch (commandMessage) {
          case 'all':
            let rulesEmbed = new Discord.MessageEmbed()
              .setTitle('Microsoft Community rules')
              .setColor('#08d9d6')
              .addFields(rulesAll);
            message.channel.send(rulesEmbed).then(embedMessage => {
              const embeds = [];
              for (let i = 1; i <= 5; ++i)
                embeds.push(new Discord.MessageEmbed().addField('Page', i));
              let number = 1;
              const Embeds = new PaginationEmbed.FieldsEmbed()
                .setArray(embeds)
                .setAuthorizedUsers([message.author.id])
                .setChannel(embedMessage.channel)
                .setPageIndicator(true)
                .setClientAssets({ message: embedMessage, prompt: 'Say page number {{user}}' })
                .setDisabledNavigationEmojis(['delete'])
                .setTimeout(180000)
                .setArray(rules.map(rule => ({ name: number++, description: rule.description })))
                .setPage(1)
                .setElementsPerPage(3)
                .formatField('Total rules ' + rules.length, rule => `**${rule.name}.** ${rule.description}\n`, false)
                .on('error', console.error);
              Embeds.embed
                .setTitle('Microsoft Community rules')
                .setColor('#08d9d6');
              Embeds.build();
            })
            break;
          default:
            if (commandMessage) {
              if (rules.length >= commandMessage && commandMessage > 0) {
                let ruleEmbed = new Discord.MessageEmbed()
                  .setTitle(`Rule ${commandMessage}`)
                  .setURL(rules[parseInt(commandMessage) - 1].link)
                  .setDescription(rules[parseInt(commandMessage) - 1].description)
                  .setColor('#08d9d6')
                setTimeout(function () { message.delete({ reason: "Command initiation message." }) }, 5000);
                message.channel.send(ruleEmbed);
              } else {
                // TODO: look for exact match
                const findRule = (rule, term) => {
                  term = term.toLowerCase();
                  if (rule.value.toLowerCase().search(term) !== -1 || rule.name.toLowerCase().search(term) !== -1) {
                    return true;
                  }
                  return false;
                }
                let search_result = rulesAll.filter(x => findRule(x, commandMessage));
                if (search_result.length === 0) message.channel.send(`There are ${rules.length} rules in this server, you may want to try this again.`);
                else {
                  let searchrulesEmbed = new Discord.MessageEmbed()
                    .setColor('#08d9d6')
                    .addFields(search_result);
                  message.channel.send(searchrulesEmbed);
                }
              }
            } else {
              message.channel.send(`There are ${rules.length} rules in this server, you may want to try this again.`);
            }
            break;
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

    // TODO: Properly exclude quotes instead of ignoring comments with quotes
    if (!sanitizedMessage.startsWith(server.prefix) && !sanitizedMessage.startsWith('>') && sanitizedMessage.length !== 0) {
      try {
        const result = await request({
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
