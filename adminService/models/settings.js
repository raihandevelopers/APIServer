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
    topUpAddress: {
        btc: String,
        eth: String,
        usdt: String,
        paxg: String,
        powr: String,
        xaut: String
    },
    withdraw_limit:String,
    min_withdraw:String,
    minimunusd: Number,
    type: String,
    infuraKey: String,
    infuraNetwork: Boolean,
    adminRef: Number,
    contractAddress :{
        usdr: String,
        paxg: String,
        powr: String,
        xaut: String
    },
    coin:{
        price:String,
        symbol:String
    }
    // appTimeZone : String,
    // currencyConversionFee : String,
    // exchangesName : String,
    // fiatWithdrawalFee : String,
    // minOrderAmt: String,
    // minOrderPrice: String,
    // passwordHashKey: String,
    // passwordPermittedRegex : String,
    // passwordMinChars : String
})

module.exports = mongoose.model('settings', schema)