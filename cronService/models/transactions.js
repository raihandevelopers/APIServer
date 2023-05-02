const mongoose = require('mongoose')

const schema = new mongoose.Schema({
    user: String,
    providerId: String,
    source: String,
    target: String,
    fromAddress: String,
    withdrawlAddress: String,
    depositAddress: String,
    depositExtraId: String,
    withdrawExtraId: String,
    refundExtraId: String,
    incomingHash: String,
    outgoingHash: String,
    status: String,
    rate: String,
    fee: String,
    createdOn: Date,
    gasfee: Number,
    updatedOn: {
        type: Date,
        default: new Date().toUTCString()
    }

})

module.exports = mongoose.model('transactions', schema)