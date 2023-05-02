var mongoose = require('mongoose')

const schema = new mongoose.Schema({
    register : Boolean,
    login : Boolean,
    send : Boolean,
    buy : Boolean,
    sell : Boolean,
    marketDataKey:String,
    email: {
        host: String,
        port: String,
        user: String,
        password: String,
        audience: String
    },
    withdraw_limit:String,
    min_withdraw:String,
    minimunusd: Number
})

module.exports = mongoose.model('settings', schema)