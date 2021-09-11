const mongoose = require('mongoose')

module.exports = new mongoose.Schema({
    userId: Number,
    userName: String
})
