const Discord = require('discord.io')
const logger = require('winston')
const request = require('request-promise-native')

const db = require('./db')

const { discordToken, perspectiveKey } = require('../auth.json')

const DEFAULT_ALERT_THRESHOLD = 0.9

;(async function () {
  // Configure logger settings
  logger.remove(logger.transports.Console)
  logger.add(logger.transports.Console, {
    colorize: true
  })
  logger.level = 'debug'

  // Initialize Discord Bot
  const bot = new Discord.Client({
    token: discordToken,
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

    getToxicity(message).then(toxicity => {
      // TODO Make user warnings configurable
      if (toxicity > .95) {
        bot.sendMessage({
          to: channelId,
          message: `<@${userId}>, cool your jets.`
        })
      }

      /* Disabling this in favor of custom alerts. Consider adding a default alert for new servers
      const adminRole = Object.values(server.roles).find(role => role.name.includes('admin'))
      if (toxicity > .99) {
        logger.info('Notifying admins')

        bot.sendMessage({
          to: channelId,
          message: `<@&${adminRole.id}>, please investigate ${user}'s toxic message in ${channelName}: ${message}.`
        })
      }*/

      const alerts = db.getAlerts(serverId)
        .then(alerts => alerts
          .filter(a => toxicity >= a.threshold)
          .forEach(a => {
            const mention = a.mention.type === 'role' ? `<@&${a.mention.id}>` : `<@${a.mention.id}>`
            let notice = `${mention} please investigate ${user}'s toxic message in ${channelName}: ${message}.`

            if (a.mention.type === 'role' && !a.channelId) {
              notice = `${mention} members have been notified of potential toxicity.`
            }

            bot.sendMessage({
              to: a.channelId || (a.mention.type === 'role') ? channelId : a.mention.id,
              message: notice
            })
          }))
    })

    const commands = {
      toxic: (args) => {
        getToxicity(args.join(' ')).then(toxicity => {
          // TODO why isn't this sending messages?
          console.log('done', channelId, typeof channelId, `I am ${ (Number(toxicity) * 100).toFixed(2) }% certain that is toxic.`)
          console.log(bot.sendMessage)
          bot.sendMessage({
            to: channelId,
            message: `I am ${ (Number(toxicity) * 100).toFixed(2) }% certain that is toxic.`
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
        const usage = '!createAlert roleOrUser [threshold in (0, 1)] [channel]'
        const role = resolveRole(roleOrUser),
          user = resolveMember(roleOrUser)

        logger.info(`looking up alerts for server ${server.id}`)
        db.getAlerts(server.id, role && role.id || user && user.id)
          .then(alerts => {
            const message = alerts.map(a => {
              const target = (resolveRole(a.mention.id) || resolveUser(a.mention.id) || {})
              const name = target.name || target.username || target.id || `${a.mention.id} (not found)`
              return `• ${a.mention.type} ${name} at ${a.threshold}${a.channelId ? 'in ' + a.channelId : '' }`
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
      deleteAlerts: ([roleOrUser, threshold, channel]) => {
        const usage = '!deleteAlerts [roleOrUser] [threshold in (0, 1)] [channel])'

        // TODO validate against various argument combos

        const role = roleOrUser && resolveRole(roleOrUser),
          user = roleOrUser && resolveMember(roleOrUser)

        db.deleteAlerts(server.id, role && role.id, user && user.id, threshold, channel && channel.id)
          .then(toDelete => {
            bot.sendMessage({
              to: channelId,
              message: `${toDelete.length} alert${toDelete.length > 1 ? 's':''} ${toDelete.length > 1 ? 'were':'was'} deleted`
            })
          })
      },
      createAlert: ([roleOrUser, threshold = DEFAULT_ALERT_THRESHOLD, channel]) => {
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
        const p = db.saveAlert(server.id, role && role.id, user && user.id, threshold, channel && channel.id)
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
    logger.info(`Received ${message}`)
    try {
      const result = await request({
        method: 'POST',
        uri: `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${perspectiveKey}`,
        body: {
          comment: { text: message },
          languages: ['en'],
          requestedAttributes: { TOXICITY: {} },
          doNotStore: true
        },
        json: true
      })

      return result.attributeScores.TOXICITY.summaryScore.value
    } catch (e) {
      console.error(e)
    }
  }
})()
