var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate-v2')

const schema = new mongoose.Schema({
    email: String,
    ref: Number,
    from: String,
    to: String,
    source: String,
    target: String,
    sourceAmount: String,
    targetAmount:String,
    targetAddress: String,
    type: String,
    data: String,
    value: String,
    currency: String,
    txHash: String,
    status: String,
    error: String,
    admin:String,
    transactions:Array,
    timestamp: {
        type: String,
        //default: new Date().getTime()
    },
    payOutProfit:String,
    reason: String,
    fee: Number

},{ collection: 'TransactionHistories'})

schema.plugin(mongoosePaginate);

module.exports = mongoose.model('TransactionHistories', schema)