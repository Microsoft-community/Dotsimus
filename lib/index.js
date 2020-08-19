require('dotenv').config()
const Discord = require('discord.io'),
  Sentry = require('@sentry/node'),
  logger = require('winston'),
  request = require('request-promise-native'),
  db = require('./db'),
  DEFAULT_ALERT_THRESHOLD = 0.8;

Sentry.init({ dsn: 'https://cc4bb0af29884a99bd204804ea5c5ac6@o436175.ingest.sentry.io/5396750' });

; (async function () {
  // Configure logger settings
  logger.remove(logger.transports.Console)
  logger.add(logger.transports.Console, {
    colorize: true
  })
  logger.level = 'debug'

  // Initialize Discord Bot
  const bot = new Discord.Client({
    token: process.env.BOT_TOKEN,
    autorun: true
  })

  bot.on('ready', function (evt) {
    logger.info(`Connected to bot: ${bot.username} (${bot.id})`)
  })

  try {
    await db.initialize
    logger.info('Connected to database')
  }
  catch (e) {
    logger.error(e)
  }

  // TODO catch errors
  bot.on('message', function (user, userId, channelId, message, evt) {
    if (userId === bot.id) {
      return
    }

    // For now, it seems like this is how we can ignore DMs to the bot.
    if (!bot.channels[channelId]) {
      return
    }

    const serverId = bot.channels[channelId].guild_id
    const server = bot.servers[serverId]

    // TODO how to get this???
    const resolveRole = tag => Object.values(server.roles).find(role => tag.includes(role.id || member))
    const resolveMember = tag => Object.values(server.members).find(member => tag.includes(member.id || member))
    const resolveUser = tag => Object.values(bot.users).find(user => tag.includes(user.id || user))

    const isAdmin = userId => {
      const member = resolveMember(userId)
      if (member.roles.some(r => server.roles[r].GENERAL_ADMINISTRATOR)) {
        return Promise.resolve(true)
      }

      return db.getAdminRole(serverId).then(roleId => {
        if (!roleId) {
          return Promise.resolve(false)
        }

        return member.roles.some(id => roleId === id)
      })
    }

    const channelName = bot.channels[Object.keys(bot.channels).find(c => bot.channels[c].id === channelId)].name

    function toxicityReport (timestamp, userId, user, message, toxicity) {
      this.timestamp = timestamp;
      this.userId = userId;
      this.user = user;
      this.message = message;
      this.toxicity = toxicity;
    }

    getToxicity(message).then(toxicity => {
      // TODO Make user warnings configurable
      const messageTemplates = [`<@${userId}>, watch your language.`, `<@${userId}>, take a break.`, `<@${userId}>, surely you could pick some nicer words.`, `<@${userId}>, lets be nice to each other.`],
        warningMessage = Math.floor(Math.random() * messageTemplates.length);
      logger.info(`#${channelName} ${user}: ${message} | ${(Number(toxicity) * 100).toFixed(2)}`)
      if (toxicity > .80) {
        let timestamp = +new Date
        logger.info(new toxicityReport(+new Date, userId, user, message, toxicity))
        try {
          db.saveWarningDb(timestamp, userId, user, message, toxicity)
        } catch (error) {
          logger.info(error)
        }
        bot.sendMessage({
          to: channelId,
          message: messageTemplates[warningMessage]
        })
      }

      const alerts = db.getAlerts(serverId)
        .then(alerts => alerts
          .filter(a => toxicity >= a.threshold)
          .forEach(a => {
            const mention = a.mention.type === 'role' ? `<@&${a.mention.id}>` : `<@${a.mention.id}>`,
              notice = `🔎 Investigate <@${userId}>'s message(${(Number(toxicity) * 100).toFixed(2)}) in <#${channelId}> \n${message}. \n${mention}`;
            if (a.mention.type === 'role' && !a.channelId) {
              notice = `${mention} members have been notified of potential toxicity.`
            }
            logger.info(a.channelId, a.mention.type, channelId)
            bot.sendMessage({
              to: a.channelId || (a.mention.type === 'role') ? a.channelId : a.mention.id,
              message: notice
            })
          }))
    })

    const commands = {
      toxic: (args) => {
        getToxicity(args.join(' ')).then(toxicity => {
          // TODO why isn't this sending messages?
          console.log('done', channelId, typeof channelId, `I am ${(Number(toxicity) * 100).toFixed(2)}% certain that is toxic.`)
          bot.sendMessage({
            to: channelId,
            message: `I am ${(Number(toxicity) * 100).toFixed(2)}% certain that is toxic.`
          }, (error, response) => {
            console.error(error)
          })
        })
      },
      getAdmin: () => {
        db.getAdminRole(serverId).then(roleId => {
          bot.sendMessage({
            to: channelId,
            message: `The admin role is configured as ${roleId ? resolveRole(roleId).name : '<none>'}.`
          })
        })
      },
      setAdmin: ([roleArg]) => {
        const role = resolveRole(roleArg)

        const outcome = db.saveAdminRole(server.id, role.id)
          .then(() => {
            bot.sendMessage({
              to: channelId,
              message: `The admin role has been updated to ${role.name}.`
            })
          })
          .catch(e => {
            console.error(e)
            bot.sendMessage({
              to: channelId,
              message: `Failed to update the admin role.`
            })
          })
      },
      getAlerts: roleOrUser => {
        const usage = '!createAlert roleOrUser threshold channelId'
        const role = resolveRole(roleOrUser),
          user = resolveMember(roleOrUser)

        logger.info(`looking up alerts for server ${server.id}`)
        db.getAlerts(server.id, role && role.id || user && user.id)
          .then(alerts => {
            const message = alerts.map(a => {
              const target = (resolveRole(a.mention.id) || resolveUser(a.mention.id) || {})
              const name = target.name || target.username || target.id || `${a.mention.id} (not found)`
              return `• ${a.mention.type} ${name} at ${a.threshold}${a.channelId ? 'in ' + a.channelId : ''}`
            }).join('\n')

            bot.sendMessage({
              to: channelId,
              message: message
            })
          })
          .catch(e => {
            logger.error(e)
            bot.sendMessage({
              to: channelId,
              message: 'Failed to look up alerts'
            })
          })
      },
      deleteAlerts: ([roleOrUser, threshold, channelId]) => {
        const usage = '!deleteAlerts [roleOrUser] [threshold in (0, 1)] [channel])'

        // TODO validate against various argument combos

        const role = roleOrUser && resolveRole(roleOrUser),
          user = roleOrUser && resolveMember(roleOrUser)

        db.deleteAlerts(server.id, role && role.id, user && user.id, threshold, channelId)
          .then(toDelete => {
            bot.sendMessage({
              to: channelId,
              message: `${toDelete.length} alert${toDelete.length > 1 ? 's' : ''} ${toDelete.length > 1 ? 'were' : 'was'} deleted`
            })
          })
      },
      createAlert: ([roleOrUser, threshold = DEFAULT_ALERT_THRESHOLD, channelId]) => {
        const usage = '!createAlert roleOrUser [threshold in (0, 1)] [channel])'
        const role = resolveRole(roleOrUser),
          user = resolveMember(roleOrUser)

        if (!role && !user) {
          bot.sendMessage({
            to: channelId,
            message: `Please tag the role or user you want to create an alert for.\n${usage}`
          })

          return
        }

        if (Number.isNaN(threshold) || threshold <= 0 || threshold >= 1) {
          bot.sendMessage({
            to: channelId,
            message: usage
          })

          return
        }

        if (role && !role.mentionable) {
          bot.sendMessage({
            to: channelId,
            message: `Heads up, the ${role.name} role is not mentionable.`
          })
        }

        let responseMessage
        const p = db.saveAlert(server.id, role && role.id, user && user.id, threshold, channelId)
          .then(() => {
            bot.sendMessage({
              to: channelId,
              message: 'Successfully created alert'
            })
          })
          .catch(() => {
            bot.sendMessage({
              to: channelId,
              message: `Failed to create alert: ${e}`
            })
          })
      }
    }

    // Listen for messages that will start with `!`.
    if (message.substring(0, 1) === '!') {
      const [command, ...args] = message.substring(1).split(' ')
      if (commands[command]) {
        isAdmin(userId)
          .then(isAdmin => {
            if (!isAdmin) {
              console.log('not allowed')
              return
            }

            commands[command](args)
          })
      }
    }
  })

  async function getToxicity (message) {
    // logger.info(`Message: ${message}`)
    if (message.length !== 0) {
      try {
        const result = await request({
          method: 'POST',
          uri: `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${process.env.PERSPECTIVE_KEY}`,
          body: {
            comment: {
              text: message,
              type: 'PLAIN_TEXT'
            },
            languages: ['en'],
            requestedAttributes: { SEVERE_TOXICITY: {} },
            doNotStore: true,
            communityId: 'Microsoft-community-discord'
          },
          json: true
        })
        // logger.info(result.attributeScores.SEVERE_TOXICITY)
        return result.attributeScores.SEVERE_TOXICITY.summaryScore.value
      } catch (e) {
        console.error(e)
      }
    }
  }
})()
