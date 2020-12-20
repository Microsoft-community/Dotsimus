const mongoose = require('mongoose')

module.exports = new mongoose.Schema({
  serverId: String,
  roleId: String
})
