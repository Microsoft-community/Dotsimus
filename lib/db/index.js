const util = require('util')
const mongoose = require('mongoose')
const _ = require('lodash')

const { mongoUri } = require('../../auth.json')

const alertSchema = require('./alertSchema')
const adminRoleSchema = require('./adminRoleSchema')
const warnSchema = require('./warnSchema')

const initialize = new Promise((resolve, reject) => {
  mongoose.connect(mongoUri, function (error, response) {
    if (error) {
      reject(`Error connecting to mongo database: ${error}`)
    } 
    else {
      resolve('Successfully connected to mongo database')
    }
  })
})

const Alert = mongoose.model('Alert', alertSchema)
const AdminRole = mongoose.model('AdminRole', adminRoleSchema)
const WarningToDbs = mongoose.model('saveWarningDb', warnSchema)

// 30 seconds
const TTL = 30 * 1000
const cache = new Map()
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
  saveWarningDb: function (timestamp, userId, user, message, toxicity) {
    const query = { timestamp, userId, user, message, toxicity }

    return new Promise((resolve, reject) => {
      WarningToDbs.findOneAndUpdate(query, {
        timestamp, userId, user, message, toxicity
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
      .then(userId => {
        console.log(userId)
        return true
      })
      .catch(e => {
        console.error(e)
        throw 'Failed to add warning.'
      })
  },
  getAlerts: cachify(function (serverId, mentionId) {
    const query = { serverId }
    if (mentionId) {
      query.mentionId = mentionId
    }

    /*return util.promisify(Alert.find)(query)
      .then(alerts => {
        console.log(alerts)
        return alerts
      })
      .catch(e => {
        console.error(e)
        throw 'Failed to retrieve alerts'
      })*/

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
      throw new Error ('Cannot create an alert for both a role and a user at the same time.')
    }

    const mentionType = roleId ? 'role' : 'user'
    const mentionId = roleId ? roleId : userId

    const query = { serverId,  'mention.id': mentionId }
/*
    return util.promisify(Alert.findOneAndUpdate)(query, {
      serverId,
      threshold,
      channelId,
      mention: {
        id: mentionId,
        type: mentionType
      }
    }, {
      upsert: true
    })
      .then(alert => {
        console.log(alert)
        return true
      })
      .catch(e => {
        console.error(e)
        throw 'Failed to update or add an alert'
      })
*/
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
