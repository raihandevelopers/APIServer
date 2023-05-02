var mongoose = require('mongoose');
const schema = new mongoose.Schema({
    email: String,
    ref: Number,
    from: String,
    to: String,
    source: String,
    target: String,
    sourceAmount: String,
    targetAmount: String,
    targetAddress: String,
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
    isMoonpayTx: Boolean,
    isLpTransaction: Boolean,
    fee: Number,
    gasfee: Number,
    timestamp: {
        type: String,
        default: new Date().getTime()
    }
}, {
    collection: 'TransactionHistories'
})

module.exports = mongoose.model('TransactionHistories',schema )