const Discord = require('discord.io')
const logger = require('winston')
const request = require('request-promise-native')

const { discordToken, perspectiveKey } = require('./auth.json')

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
  logger.info('Connected')
  logger.info('Logged in as: ')
  logger.info(bot.username + ' - (' + bot.id + ')')
})

bot.on('message', function (user, userId, channelId, message, evt) {
  const serverId = bot.channels[channelId].guild_id
  const server = bot.servers[serverId]
  const adminRole = Object.values(server.roles).find(role => role.name.includes('admin'))

  getToxicity(message).then(toxicity => {
    if (toxicity > .9 && userId !== bot.id) {
      bot.sendMessage({
        to: channelId,
        message: `<@${userId}>, cool your jets.`
      })
    }

    if (toxicity > .99) {
      logger.info('Notifying admins')

      const channelName = bot.channels[Object.keys(bot.channels).find(c => bot.channels[c].id === channelId)].name
      bot.sendMessage({
        to: channelId,
        message: `<@&${adminRole.id}>, please investigate ${user}'s toxic message in ${channelName}: ${message}.`
      })
    }
  })

  // Listen for messages that will start with `!`.
  if (message.substring(0, 1) == '!') {
    let args = message.substring(1).split(' ')
    const cmd = args[0]

    args = args.splice(1)
    switch(cmd) {
      case 'toxic':
        getToxicity(message).then(toxicity => {
          bot.sendMessage({
            to: channelId,
            message: `I am ${ (Number(toxicity) * 100).toFixed(2) }% certain that is toxic.`
          })
        })
      break
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
