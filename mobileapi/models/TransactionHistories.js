var mongoose = require('mongoose');
const schema = new mongoose.Schema({
    email: String,
    phone: String,
    ref: Number,
    from: String,
    to: String,
    Source:String,//don't delete
    source: String,
    target: String,
    sourceAmount: String,
    fiatCurrency:String,
    toType:String,
    fiatAmount:String,
    targetAmount: String,
    targetAddress: String,
    type: String,
    data: String,
    value: String,
    gasfee: Number,
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
    payOutProfit:String,
    timestamp: {
        type: String,
        default: new Date().getTime()
    },
    BTCconfirmations: Number
}, {
    collection: 'TransactionHistories'
})

module.exports = mongoose.model('TransactionHistories',schema )