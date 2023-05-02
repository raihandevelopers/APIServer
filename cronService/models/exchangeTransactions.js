const mongoose = require('mongoose')
const schema = new mongoose.Schema({
    email: String,
    ref: Number,
    from: String,
    to: String,
    source: String,
    target: String,
    sourceAmount: String,
    targetAmount: String,
    dbId: String,
    type: String,
    data: String,
    value: String,
    currency: String,
    sourceTxHash: String,
    txHash: String,
    status: String,
    error: String,
    reason: String,
    isExchange: Boolean,
    destinationTag: Number,
    confirmations: Number,
    timestamp: {
        type: String,
        default: new Date().getTime()
    }
}, {
    collection: 'exchangeTransactions'
})

module.exports = mongoose.model('exchangeTransactions',schema )