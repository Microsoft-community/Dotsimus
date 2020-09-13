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

db.initialize.then(function (response) { console.info(chalk.green(response))})

const prefix = '!'
client.on('message', message => {
  if (message.channel.type === "dm") return console.info(`${getTime()} #DM ${message.author.username}: ${message.content}`);
  if (message.author.bot) return;
  const serverId = message.channel.guild.id
  const isAdmin = message.member.hasPermission("ADMINISTRATOR")
  getToxicity(message.content, message, false).then(toxicity => {
    const messageTemplates = [`watch your language.`, `take a break.`, `surely you could pick some nicer words.`, `lets be nice to each other.`],
      warningMessage = Math.floor(Math.random() * messageTemplates.length);
    if (toxicity >= .80 && (message.guild.members.cache.get(message.author.id).roles.cache.map(r => `${r}`)).length === 1 && serverId === '150662382874525696') {
        console.info(`${getTime()} #${message.channel.name} ${message.author.username}: ${message.content} | ${chalk.red((Number(toxicity) * 100).toFixed(2))}`)
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
          client.channels.cache.get('745276933767430255').send(`🔎 Investigate **new user** <@${message.author.id}>'s message(${(Number(toxicity) * 100).toFixed(2)}) in <#${message.channel.id}> \n${message.content}. \n https://discordapp.com/channels/${serverId}/${message.channel.id}/${message.id} \n <@&150878439220576256>`);
      } catch (error) {
        console.error(error)
        message.channel.send('Failed to mute.')
      }
    }
    if (toxicity >= .81) {
      console.info(`${getTime()} #${message.channel.name} ${message.author.username}: ${message.content} | ${chalk.red((Number(toxicity) * 100).toFixed(2))}`)
      console.table(new toxicityReport(+new Date, message.author.id, message.author.username, message.content, toxicity))
      try {
        db.saveWarningDb(+new Date, message.author.id, message.author.username, message.content, toxicity)
      } catch (error) {
        console.error(error)
      }
      if (toxicity >= .90) {
          try {
            message.delete({reason: "toxic message"});
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
        .filter(a => toxicity >= a.threshold)
        .forEach(a => {
          const mention = a.mention.type === 'role' ? `<@&${a.mention.id}>` : `<@${a.mention.id}>`,
            notice = `🔎 Investigate <@${message.author.id}>'s message(${(Number(toxicity) * 100).toFixed(2)}) in <#${message.channel.id}> \n${message.content}. \n https://discordapp.com/channels/${serverId}/${message.channel.id}/${message.id} \n ${mention}`;
          if (a.mention.type === 'role' && !a.channelId) {
            notice = `${mention} members have been notified of potential toxicity.`
          }
          client.channels.cache.get(a.channelId).send(notice);
        }))
  })

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  if (command === 'toxic' && message.content.slice(0, prefix.length) === prefix) {
    const commandMessage = args.join(' ')
    getToxicity(commandMessage, message, true).then(toxicity => {
      if (!isNaN(toxicity)) {
        message.channel.send(`I am **${(Number(toxicity) * 100).toFixed(2)}%** certain that this is a negative message.`);
      } else {
        message.reply('message cannot be analyzed.')
      }
    })
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
      }
    }
  }
})
