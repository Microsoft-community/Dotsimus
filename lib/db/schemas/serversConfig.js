const mongoose = require('mongoose')

module.exports = new mongoose.Schema({
    joinDate: Number,
    serverId: String,
    serverName: String,
    prefix: String,
    isSubscribed: Boolean,
    memberCount: Number
})
