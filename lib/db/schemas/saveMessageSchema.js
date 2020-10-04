const mongoose = require('mongoose')

module.exports = new mongoose.Schema({
    serverId: Number,
    userId: Number,
    userName: String,
    isUserNew: Boolean,
    message: [{ timestamp: Number, message: String, toxicity: Number }]
})