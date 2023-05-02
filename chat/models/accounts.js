console.log(new Date())
const mongoose = require('mongoose')
const paginatePlugin = require('mongoose-paginate-v2')
const aggregatePaginatePlugin = require('mongoose-aggregate-paginate-v2')

const schema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    firstName: {
        type: String,
        required: true,
        index: true
    },
    lastName: {type: String, index: true},
    country: String,
    phone: String,
    password: String,
    language: String,
    id: String,
    wallets: {
        personal: String,
        credit: String,
        business: String,
    },
    ref: Number,
    businessAccountStatus: {
        type: String,
        default: 'notUploaded'
    },
    businessDocumentName: String,
    messengerId: String,
    pin: String,
    kycStatus: String,
    kycLevel: {
        type: Number,
        default: 0
    },
    hasTransactionPin: Boolean,
    FCMToken: String,
    lastSeen: {
        type: Date,
        default: new Date('1990-01-01')
    },
    dialCodes: {
        "dial0": {type: String, default: ''},
        "dial1": {type: String, default: ''},
        "dial2": {type: String, default: ''},
        "dial3": {type: String, default: ''},
        "dial4": {type: String, default: ''},
        "dial5": {type: String, default: ''},
        "dial6": {type: String, default: ''},
        "dial7": {type: String, default: ''},
        "dial8": {type: String, default: ''},
        "dial9": {type: String, default: ''},
    },
    isOnline: Boolean,
	    profileImage: {
        type: String,
        default: "" 
    },
    contactCount: {
        type: Number,
        default: 250
    },
    industry: String,
    location: String,
    mood: String,
    position: String,
    status: String

})

schema.plugin(paginatePlugin)
schema.plugin(aggregatePaginatePlugin)

module.exports = mongoose.model('accounts', schema)
