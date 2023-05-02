console.log(new Date())
const mongoose = require('mongoose')
const paginatePlugin = require('mongoose-paginate-v2')
const aggregatePaginatePlugin = require('mongoose-aggregate-paginate-v2')

const schema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    initiator: String,
    receiver: String,
    status: String,
    type: String,
    timeStamp: Date
})

schema.plugin(paginatePlugin)
schema.plugin(aggregatePaginatePlugin)

module.exports = mongoose.model('call_old', schema)