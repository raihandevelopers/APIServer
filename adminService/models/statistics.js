var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate-v2')

const schema = new mongoose.Schema({
    
    date:String,
    count:Number,
    walletCount:{
        fiatAmount:Number,
        ETH:Number,
        BTC:Number,
        USDT:Number,
        MYBIZ:Number
    },
    payOutProfit:Number,
    transferProfit:Number,
    monthly:String

},{ collection: 'statistics'})

schema.plugin(mongoosePaginate);

module.exports = mongoose.model('statistics', schema)
