const mongoose = require('mongoose')

module.exports = new mongoose.Schema({
    timestamp: Number,
    userId: Number,
    user: String,
    message: String,
    toxicity: Number
})