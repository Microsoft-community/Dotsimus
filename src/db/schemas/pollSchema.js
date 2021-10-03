const mongoose = require('mongoose')

module.exports = new mongoose.Schema({
    serverId: String,
    polls: { pollId: String, pollTitle: String, pollCreatorId: String }
})