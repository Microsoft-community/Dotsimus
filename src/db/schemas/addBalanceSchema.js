const mongoose = require('mongoose')

module.exports = new mongoose.Schema({
    userId: String,
    balance: Number
})