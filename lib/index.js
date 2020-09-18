const Discord = require('discord.js'),
  client = new Discord.Client(),
  Sentry = require('@sentry/node'),
  chalk = require('chalk'),
  request = require('request-promise-native'),
  db = require('./db'),
  DEFAULT_ALERT_THRESHOLD = 0.8;
const { getTime, toxicityReport } = require('./utils');

Sentry.init({ dsn: 'https://cc4bb0af29884a99bd204804ea5c5ac6@o436175.ingest.sentry.io/5396750' });

client.on('ready', () => {
  console.log(chalk.green(`Logged in as ${client.user.tag}!`));
  client.user.setActivity(`chat`, { type: 'WATCHING' });
  let hours = 0;
  setInterval(async () => {
    hours += 1;
    await client.user.setActivity(`chat for ${hours} hour(s)`, { type: 'WATCHING' });
  }, 3600000);
});

client.login(process.env.BOT_TOKEN);

db.initialize.then(function (response) { console.info(chalk.green(response)) })

const prefix = '!'
client.on('message', message => {
  if (message.author.bot || process.env.DEVELOPMENT && !(message.author.id === '71270107371802624')) return;
  if (message.channel.type === "dm") return console.info(`${getTime()} #DM ${message.author.username}: ${message.content}`);
  const serverId = message.channel.guild.id,
    serverName = message.channel.guild.name,
    isAdmin = message.member.hasPermission("ADMINISTRATOR");
  getToxicity(message.content, message, false).then(toxicity => {
    // console.info(`${getTime()} #${message.channel.name} ${message.author.username}: ${message.content} | ${chalk.red((Number(toxicity.toxicity) * 100).toFixed(2))} ${chalk.red((Number(toxicity.insult) * 100).toFixed(2))}`)
    const messageToxicity = toxicity.toxicity,
      messageTemplates = [`watch your language.`, `take a break.`, `surely you could pick some nicer words.`, `lets be nice to each other.`],
      warningMessage = Math.floor(Math.random() * messageTemplates.length);
    if ((messageToxicity >= .80 || toxicity.combined >= .80) && (message.guild.members.cache.get(message.author.id).roles.cache.map(r => `${r}`)).length === 1 && serverId === '150662382874525696') {
      console.info(`${getTime()} #${message.channel.name} ${message.author.username}: ${message.content} | ${chalk.red((Number(messageToxicity) * 100).toFixed(2))} ${chalk.red((Number(toxicity.insult) * 100).toFixed(2))}`)
      try {
        message.delete({ reason: "toxic message" });
        const role = message.guild.roles.cache.find(role => role.name === 'Muted'),
          member = message.guild.members.cache.get(message.author.id);
        if (role) {
          member.roles.add(role);
          message.reply('has been flagged for review.')
        } else {
          message.channel.send('Failed to mute.')
        }
        client.channels.cache.get('745276933767430255').send(`🔎 Investigate **new user** <@${message.author.id}>'s message(${(Number(messageToxicity) * 100).toFixed(2)}, ${(Number(toxicity.insult) * 100).toFixed(2)}) in <#${message.channel.id}> \n${message.content}. \n https://discordapp.com/channels/${serverId}/${message.channel.id}/${message.id} \n <@&150878439220576256>`);
      } catch (error) {
        console.error(error)
        message.channel.send('Failed to mute.')
      }
    }
    if (messageToxicity >= .81 || toxicity.combined >= .80) {
      console.info(`${getTime()} #${message.channel.name} ${message.author.username}: ${message.content} | ${chalk.red((Number(messageToxicity) * 100).toFixed(2))} ${(Number(toxicity.insult) * 100).toFixed(2)}`)
      console.table(new toxicityReport(+new Date, message.author.id, message.author.username, message.content, messageToxicity))
      try {
        db.saveWarningDb(+new Date, message.author.id, message.author.username, message.content, messageToxicity)
      } catch (error) {
        console.error(error)
      }
      if (messageToxicity >= .90 || toxicity.combined >= .85) {
        try {
          message.delete({ reason: "toxic message" });
          const role = message.guild.roles.cache.find(role => role.name === 'Muted'),
            member = message.guild.members.cache.get(message.author.id);
          if (role) {
            member.roles.add(role);
            message.reply('has been muted for excessive toxicity.')
          } else {
            message.channel.send('Failed to mute.')
          }
        } catch (error) {
          console.error(error)
          message.channel.send('Failed to mute.')
        }
      }
      // message.reply(messageTemplates[warningMessage]);
    }

    const alerts = db.getAlerts(message.channel.guild.id)
      .then(alerts => alerts
        .filter(a => toxicity.toxicity >= a.threshold || toxicity.combined >= .80)
        .forEach(a => {
          const mention = a.mention.type === 'role' ? `<@&${a.mention.id}>` : `<@${a.mention.id}>`,
            notice = `🔎 Investigate <@${message.author.id}>'s message(${(Number(toxicity.toxicity) * 100).toFixed(2)}) in <#${message.channel.id}> \n${message.content}. \n https://discordapp.com/channels/${serverId}/${message.channel.id}/${message.id} \n ${mention}`;
          if (a.mention.type === 'role' && !a.channelId) {
            notice = `${mention} members have been notified of potential toxicity.`
          }
          client.channels.cache.get(a.channelId).send(notice);
        }))
  })
  // If there's only one message then proceed the same way as now
  // Log both recent messages into the logs within embed
  // Include link to messages
  async function getLatestUserMessages (userId) {
    message.channel.messages.fetch({
      limit: 10
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
        console.info(`${message.author.username}: ${message.content} - ${message.channel.name}`)
      })
    })
  }
  getLatestUserMessages(message.author.id)

  if (message.content.startsWith(prefix)) {
    const args = message.content.slice(prefix.length).trim().split(/ +/g),
      command = args.shift().toLowerCase(),
      commandMessage = args.join(' ');
    switch (command) {
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
      case 'setalerts':
        message.channel.send(isAdmin ? 'true' : 'false')
        break;
      case 'repeat':
      case 'dotpeat':
        if (isAdmin) {
          message.delete({ reason: "Command initiation message." });
          message.channel.send(commandMessage)
        }
        break;
      case 'help':
      case 'dothelp':
        // TODO: Make prefixes dynamic whenever prefix override will be introduced
        const embedResponse = new Discord.MessageEmbed()
          .setTitle('Dotsimus and its functionality')
          .setDescription('Dotsimus is a machine learning powered chat moderation bot, its goal is to help monitor and protect the server.')
          .setColor('#ffbd2e')
          .addFields(
            { name: '!setAlerts', value: 'Allows to set up alerts to notify moderators whenever user reaches the threshold. \n Usage: `!setAlerts <user or role> <treshold> <channel>`' },
            { name: '!toxic', value: 'Shows toxicity certainty for requested message. \n Usage: `!toxic <phrase>`' },
            { name: '!debug', value: 'Shows raw toxicity values for requested message. \n Usage: `!debug <phrase>`' },
            { name: '!repeat', value: 'Repeats what is said by the user. \n Usage: `!repeat <phrase>`' },
            { name: '!rule', value: 'Shows defined rules. \n Usage: `!rule <rule number or all>`' },
          );
        message.channel.send(embedResponse);
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
            message.channel.send(rulesEmbed);
            break;
          default:
            if (rules.length >= commandMessage && commandMessage > 0) {
              let ruleEmbed = new Discord.MessageEmbed()
                .setTitle(`Rule ${commandMessage}`)
                .setURL(rules[parseInt(commandMessage) - 1].link)
                .setDescription(rules[parseInt(commandMessage) - 1].description)
                .setColor('#08d9d6')
              setTimeout(function () { message.delete({ reason: "Command initiation message." }) }, 5000);
              message.channel.send(ruleEmbed);
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
    if (!sanitizedMessage.startsWith(prefix) && !sanitizedMessage.startsWith('>') && sanitizedMessage.length !== 0) {
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
            communityId: `${serverName}/${message.channel.name}`
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
