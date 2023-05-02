const { ObjectId } = require('mongodb');
var mongoose = require('mongoose');

module.exports = mongoose.model('wallets', {
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