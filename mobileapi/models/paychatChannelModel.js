var mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  channelName: String,
  channelDescription: String,
  userId: {type: mongoose.Schema.Types.ObjectId, ref: 'accounts', autopopulate: true},
  channelId: String,
  channelLogo: String,
  channelBanner: String,
  channel_members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'accounts', autopopulate: true }]
})
channelSchema.plugin(require('mongoose-autopopulate'))
module.exports = mongoose.model('paychatchannel', channelSchema)