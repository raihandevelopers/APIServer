var mongoose = require('mongoose');

module.exports = mongoose.model('accounts', {
    email: {
        type: String
        // required: true
    },
    name: {
        type: String
        // required: true
    },
    // last_name: String,
    country: String,
    phone: String,
    password: String,
    language: String,
    id: String,
    wallets: {
        btc: String,
        eth: String,
        usdt: String,
        mybiz: String,
    },
    ref: Number,
    pin: String,
    kycStatus: String,
    kycLevel: {
        type: Number,
        default: 0
    },
    hasTransactionPin: Boolean,
    FCMToken: String,
    dob:String,
    streetAddress:String,
    unit:String,
    city:String,
    state:String,
    postalCode:Number,
    localCurrency:String,
    timeZone: String,
    secret:String,
    auth2:Boolean,
    fiatBalance: {
        type: String,
        default: 0
    }
})