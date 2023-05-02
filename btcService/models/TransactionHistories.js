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
    BTCconfirmations: Number,	
    txHash: String,
    status: String,
    error: String,
    isMoonpayTx : Boolean,
    reason: String,
    isExchange: Boolean,
    destinationTag: Number,
    fee: Number,
    timestamp: {
        type: String,
        default: new Date().getTime()
    },
    BTCconfirmations: Number
}, {
    collection: 'TransactionHistories'
})

module.exports = mongoose.model('TransactionHistories',schema )
