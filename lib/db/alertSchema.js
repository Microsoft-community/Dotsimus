const mongoose = require('mongoose')

module.exports = new mongoose.Schema({
  serverId: String,
  threshold: { type: Number, min: 0, max: 1 },
  channelId: String,
  mention: {
    type: { type: String, enum: ['role', 'user'] },
    id: String
  }
})
