const mongoose = require('mongoose')

module.exports = new mongoose.Schema({
    userId: String,
    serverId: String,
    polls: String
})