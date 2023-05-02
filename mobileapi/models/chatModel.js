var mongoose = require('mongoose');

module.exports = mongoose.model('chat', {
  fromUserId: String,
  toUserId: String,
  message: String,
  channelId: String,
  readAt: { type: Date, default: null },
  sentAt: { type: Date, default: Date.now }
})