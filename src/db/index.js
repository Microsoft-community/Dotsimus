require('dotenv').config()
const Sentry = require('@sentry/node'),
  mongoose = require('mongoose'),
  alertSchema = require('./alertSchema'),
  adminRoleSchema = require('./adminRoleSchema'),
  serversConfigSchema = require('./schemas/serversConfig'),
  saveMessageSchema = require('./schemas/saveMessageSchema'),
  watchKeywordSchema = require('./schemas/watchKeywordSchema'),
  blockedReportSchema = require('./schemas/blockedReport'),
  pollSchema = require('./schemas/pollSchema');
const addBalanceSchema = require('./schemas/addBalanceSchema');

if (process.env.DEVELOPMENT !== 'true') Sentry.init({ dsn: process.env.SENTRY_DSN });

const initialize = new Promise((resolve, reject) => {
  mongoose.connect(process.env.DEVELOPMENT !== 'true' ? process.env.DB_HOST : process.env.DB_HOST_DEV, { useUnifiedTopology: true, useNewUrlParser: true }, function (error, response) {
    if (error) {
      throw new Error(`Error connecting to mongo database: ${error}`)
    } else {
      resolve('Successfully connected to mongo database')
    }
  })
})

const Alert = mongoose.model('Alert', alertSchema),
  AdminRole = mongoose.model('AdminRole', adminRoleSchema),
  ServersConfig = mongoose.model('ServersConfig', serversConfigSchema),
  SaveMessage = mongoose.model('userInfractions', saveMessageSchema),
  addBalance = mongoose.model('usersBalance', addBalanceSchema),
  WatchKeyword = mongoose.model('watchedKeywords', watchKeywordSchema),
  BlockedReport = mongoose.model('blockedReport', blockedReportSchema),
  Poll = mongoose.model('Polls', pollSchema),
  TTL = 30 * 1000,
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
  addToBalance: function (userId, amount) {
    return new Promise((resolve, reject) => {
      addBalance.findOneAndUpdate({ userId: userId }, { $inc: { balance: amount } }, { upsert: true }, (error, data) => {
        if (error) {
          console.error(error)
          return reject(error)
        }
        resolve(data)
      })
    }).catch(e => {
      console.error(e)
      throw 'Failed to add to user\'s balance.'
    })
  },
  getUserBalance: cachify(async function (userId) {
    if (userId) {
      return await addBalance.find({ userId: userId }).lean()
    } else {
      return await addBalance.find({}).lean();
    }
  }),
  getWatchedKeywords: cachify(async function (userId, serverId) {
    if (userId && serverId) {
      return await WatchKeyword.find({ userId, serverId }).lean()
    } else {
      return await WatchKeyword.find({}).lean();
    }
  }),
  watchKeyword: function (userId, serverId, watchedWords) {
    const query = { userId, serverId }
    return new Promise((resolve, reject) => {
      WatchKeyword.findOneAndUpdate(query, {
        'serverId': serverId,
        'userId': userId,
        $push: { 'watchedWords': { $each: [watchedWords], $slice: -5 } }
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
      throw 'Failed to add a tracked word.'
    })
  },
  removeWatchedKeyword1: function (userId, serverId, watchedWords) {
    const query = { userId, serverId }
    return new Promise((resolve, reject) => {
      WatchKeyword.findOneAndUpdate(query, {
        $pull: { 'watchedWords': { $in: [watchedWords] } }
      }, (error, data) => {
        if (error) {
          console.error(error)
          return reject(error)
        }
        resolve(data)
      })
    }).catch(e => {
      console.error(e)
      throw 'Failed to remove a tracked word.'
    })
  },
  removeWatchedKeyword: function (userId, serverId, watchedWord) {
    const query = { userId, serverId, watchedWord }
    return new Promise((resolve, reject) => {
      WatchKeyword.findOneAndDelete(query, (error, data) => {
        if (error) {
          console.error(error)
          return reject(error)
        }
        resolve(data)
      })
    }).catch(e => {
      console.error(e)
      throw 'Failed to remove a tracked word.'
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
  saveServerConfig: cachify(function (joinDate, serverId, serverName, prefix, isSubscribed, memberCount) {
    const query = { serverId }
    return new Promise((resolve, reject) => {
      ServersConfig.findOneAndUpdate(query, { $setOnInsert: { joinDate, serverId, prefix, isSubscribed }, serverName, memberCount }, {
        upsert: true,
        lean: true
      }, (error, data) => {
        if (error) {
          return reject(error)
        }
        resolve(data)
      })
    })
      .then(data => {
        return data
      })
      .catch(e => {
        console.error(e)
        throw 'Failed to update or add server config'
      })
  }),
  getServerConfig: cachify(async function (serverId) {
    if (serverId) {
      return await ServersConfig.find({ serverId }).lean()
    } else {
      return await ServersConfig.find({}).lean();
    }
  }),
  updateServerPrefix: cachify(function (serverId, prefix) {
    const query = { serverId }
    return new Promise((resolve, reject) => {
      ServersConfig.findOneAndUpdate(query, { prefix }, {
        upsert: true,
        lean: true
      }, (error, data) => {
        if (error) {
          return reject(error)
        }
        resolve(data)
      })
    })
      .then(data => {
        return data
      })
      .catch(e => {
        console.error(e)
        throw 'Failed to update or add server config'
      })
  }),
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
  deleteAllAlerts: async function(serverId) {
    const query = JSON.parse(JSON.stringify({
      serverId
    }))
    Alert.deleteOne(query, (error) => {
      if (error) {
        return reject(error);
      }
    })
  },
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
  },
  saveBlockedReportUser: async function (guildId, userId, username) {
    try {
      const filter = { userId };
      const result = await BlockedReport.findOneAndUpdate(filter, {
        $setOnInsert: {
          serverId: guildId,
          userId,
          username
        }
      }, {
        upsert: true,
      });

      console.log(result);
    } catch (e) {
      console.error(e);
      throw 'Failed to block the user.';
    }
  },
  deleteBlockedReportUser: async function (guildId, userId) {
    try {
      const result = await BlockedReport.deleteMany({
        serverId: guildId,
        userId
      });

      console.log(result);
    } catch (e) {
      console.error(e);
      throw 'Failed to unblock the user.';
    }
  },
  usedPreventedFromReport: async function (guildId, userId) {
    try {
      const result = await BlockedReport.find({
        serverId: guildId,
        userId
      });
      return result.length > 0;
    } catch (e) {
      return false;
    }
  },
  createPoll: async function (serverId, pollDetailsArray) {
    const query = { serverId }
    try {
      return new Promise((resolve, reject) => {
        Poll.findOneAndUpdate(query, {
          'serverId': serverId,
          $push: { 'polls': pollDetailsArray }
        }, {
          upsert: true
        }, (error, data) => {
          if (error) {
            console.error(error);
            return reject(error);
          }
          resolve(data);
        });
      });
    } catch (e) {
      console.error(e);
      throw 'Failed to add a poll.';
    }
  },
  getPolls: async function (serverId) {
    if (serverId) {
      return await Poll.find({ serverId }).lean()
    } else {
      return await Poll.find({}).lean();
    }
  },
}
