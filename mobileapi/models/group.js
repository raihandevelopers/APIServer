const mongoose = require('mongoose')
const paginatePlugin = require('mongoose-paginate-v2')
const aggregatePaginatePlugin = require('mongoose-aggregate-paginate-v2')

const schema = new mongoose.Schema({
    group_id: String,
    group_name: String,
    //group_image: String,
    group_image: {
        fileName: String,
        extension: String,
        base64String: String,
      },
    channel: String,
    creator_id: String,
    creator_name: String,
/*    group_members: [{
        _id: String,
        email: String,
        phone: String,
        dateOfBirth: Date,
        firstName : String,
        lastName: String,
        lastSeen: Date
    }],*/
    group_members: [{
		type: mongoose.Schema.Types.ObjectId,
    ref: 'accounts',
    // autopopulate: true,
    // select: 'name email profileImage'
	}],
    isRemoved: {type: Boolean, default: false},
    createdAt: Date,
    chatType: String
})

schema.plugin(paginatePlugin)
schema.plugin(aggregatePaginatePlugin)
schema.plugin(require('mongoose-autopopulate'))
module.exports = mongoose.model('groups', schema)
