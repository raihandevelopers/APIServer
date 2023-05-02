console.log(new Date())
const mongoose = require('mongoose')
const paginatePlugin = require('mongoose-paginate-v2')
const aggregatePaginatePlugin = require('mongoose-aggregate-paginate-v2')

const schema = new mongoose.Schema({
    from: String,
    to: String,
    type: String,
    maker_virtual_id: String,
    maker_name: {type: String, default:"" },
    maker_email: String,
    maker_image: String,
    receiver_virtual_id: String,
    receiver_name: {type: String, default:"" },
    receiver_email: String,
    receiver_image: String,
    channel: String,
    datetime: Date,
    call_mode: String,
    duration: String,
    call_status: String,
    call_make_time: Date,
    call_accept_time: {type: Date, default: new Date()},
    call_end_time: {type: Date, default: new Date()},
    removedBy: [],
    chatType: String,
    group_id: String,
    group_name: String,
    group_members_in_call:[],
    calling_reject_for_first_time: {type:Boolean, default:true},
    group_image: String
    
})

schema.plugin(paginatePlugin)
schema.plugin(aggregatePaginatePlugin)

module.exports = mongoose.model('calls', schema)
