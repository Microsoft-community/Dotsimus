require('dotenv').config()
const Sentry = require('@sentry/node'),
  mongoose = require('mongoose'),
  alertSchema = require('./alertSchema'),
  adminRoleSchema = require('./adminRoleSchema'),
  saveMessageSchema = require('./schemas/saveMessageSchema');

Sentry.init({ dsn: 'https://cc4bb0af29884a99bd204804ea5c5ac6@o436175.ingest.sentry.io/5396750' });

const initialize = new Promise((resolve, reject) => {
  mongoose.connect(process.env.DB_HOST, { useUnifiedTopology: true, useNewUrlParser: true, useFindAndModify: false }, function (error, response) {
    if (error) {
      reject(`Error connecting to mongo database: ${error}`)
    } else {
      resolve('Successfully connected to mongo database')
    }
  })
})

const Alert = mongoose.model('Alert', alertSchema),
  AdminRole = mongoose.model('AdminRole', adminRoleSchema),
  SaveMessage = mongoose.model('userInfractions', saveMessageSchema);

const TTL = 30 * 1000,
  cache = new Map();
const cachify = (originalFn) => {
  return async (...args) => {
    let fnCache = cache.get(originalFn)
    if (!fnCache) {
      fnCache = cache.set(originalFn, {})
    }
    const key = args.join('.')
    if (fnCache[key] && fnCache[key].date + TTL > Date.now()) {
      return fnCache[key].value
    }
    else {
      const value = await originalFn.apply(this, args)
      fnCache[key] = {
        date: Date.now(),
        value: value
      }
      return fnCache[key].value
    }
  }
}

module.exports = {
  initialize,
  getAdminRole: cachify(function (serverId) {
    const query = { serverId }

    return new Promise((resolve, reject) => {
      AdminRole.findOne(query, { versionKey: false }).lean().exec((error, data) => {
        if (error) {
          return reject(error)
        }
        resolve(data && data.roleId)
      })
    })
  }),
  getRecord: async function (userId, serverId) {
    const result = await SaveMessage.find({ userId: userId, serverId: serverId }).lean();
    return result;
  },
  saveMessage: function (timestamp, serverId, userId, userName, isUserNew, message, toxicity) {
    const query = { userId, serverId }
    return new Promise((resolve, reject) => {
      SaveMessage.findOneAndUpdate(query, {
        'serverId': serverId,
        'userId': userId,
        'userName': userName,
        'isUserNew': isUserNew,
        $push: { 'message': { 'timestamp': timestamp, 'message': message, 'toxicity': toxicity } }
      }, {
        upsert: true
      }, (error, data) => {
        if (error) {
          console.error(error)
          return reject(error)
        }
        resolve(data)
      })
    }).catch(e => {
      console.error(e)
      throw 'Failed to add a toxicity record.'
    })
  },
  saveAdminRole: function (serverId, roleId) {
    const query = { serverId, roleId }

    return new Promise((resolve, reject) => {
      AdminRole.findOneAndUpdate(query, {
        serverId,
        roleId
      }, {
        upsert: true,
        lean: true
      }, (error, data) => {
        if (error) {
          return reject(error)
        }
        resolve(data)
      })
    })
      .then(role => {
        console.log(role)
        return true
      })
      .catch(e => {
        console.error(e)
        throw 'Failed to update or add an admin role'
      })
  },
  getAlerts: cachify(function (serverId, mentionId) {
    const query = { serverId }
    if (mentionId) {
      query.mentionId = mentionId
    }

    return new Promise((resolve, reject) => {
      Alert.find(query, { versionKey: false }).lean().exec((error, data) => {
        if (error) {
          return reject(error)
        }
        resolve(data)
      })
    })
  }),
  deleteAlerts: async function (serverId, roleId, userId, threshold, channelId, dryRun = false) {
    const mentionType = roleId ? 'role' : 'user'
    const mentionId = roleId ? roleId : userId

    // Remove undefined values (but not null values)
    const query = JSON.parse(JSON.stringify({
      serverId,
      'mention.id': mentionId,
      'mention.type': mentionType,
      threshold,
      channelId
    }))

    const matches = await new Promise((resolve, reject) => {
      Alert.find(query, (error, data) => {
        if (error) {
          return reject(error)
        }
        resolve(data)
      })
    })

    if (dryRun) {
      return matches
    }
    else {
      return new Promise((resolve, reject) => {
        Alert.remove(query, error => {
          if (error) {
            return reject(error)
          }
          resolve(matches)
        })
      })
    }
  },
  saveAlert: function (serverId, roleId, userId, threshold, channelId) {
    if (roleId && userId) {
      throw new Error('Cannot create an alert for both a role and a user at the same time.')
    }
    const mentionType = roleId ? 'role' : 'user',
      mentionId = roleId ? roleId : userId,
      query = { serverId, 'mention.id': mentionId };
    return new Promise((resolve, reject) => {
      Alert.findOneAndUpdate(query, {
        serverId,
        threshold,
        channelId,
        mention: {
          id: mentionId,
          type: mentionType
        }
      }, {
        upsert: true,
        lean: true
      }, (error, data) => {
        if (error) {
          return reject(error)
        }
        resolve(data)
      })
    })
      .then(alert => {
        console.log(alert)
        return true
      })
      .catch(e => {
        console.error(e)
        throw 'Failed to update or add an alert'
      })
  }
}
