const mongoose = require('mongoose')

module.exports = new mongoose.Schema({
    serverId: String,
    userId: String,
    userName: String
})
