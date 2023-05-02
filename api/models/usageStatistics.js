const mongoose = require('mongoose')
const paginationPlugin = require('mongoose-paginate-v2')

const schema = new mongoose.Schema({
    email: String,
    phone: String,
    timestamp: Date,
    action: String,
    ip: String,
    status: String,
    reason: String,
    location:String,
    extraData2: String,
    extraData3: String,
})

schema.plugin(paginationPlugin)

module.exports = mongoose.model('usageStatistics', schema)