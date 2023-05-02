var mongoose = require('mongoose');

module.exports = mongoose.model('wallet', {
    email: {
        type: String
        // required: true
    },
    id:{
        type:String
    },
    btc: {
        balance: {
            type: String,
            default: '0'
        },
        address: String,
        isEnabled: {
            type: Boolean,
            default: false
        },
        fee: Number
    },
    eth: {
        balance: {
            type: String,
            default: '0'
        },
        address: String,
        isEnabled: {
            type: Boolean,
            default: false
        },
        fee: Number
    },
    usdt: {
        balance: {
            type: String,
            default: '0'
        },
        address: String,
        isEnabled: {
            type: Boolean,
            default: false
        },
        fee: Number
    },
    bnb: {
        balance: {
            type: String,
            default: '0'
        },
        address: String,
        isEnabled: {
            type: Boolean,
            default: false
        },
        fee: Number
    },
    mybiz: {
        balance: {
            type: String,
            default: '0'
        },
        address: String,
        isEnabled: {
            type: Boolean,
            default: false
        },
        fee: Number
    }
});