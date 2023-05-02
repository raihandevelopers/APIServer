var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate-v2')

const schema = new mongoose.Schema({
    
    BTC: {
        change_24:String,
        price:String,
        FromUSD:String
    },
    ETH: {
        change_24:String,
        price:String,
        FromUSD:String
    },
    USDT: {
        change_24:String,
        price:String,
        FromUSD:String
    },
    MYBIZ: {
        change_24:String,
        price:String,
        FromUSD:String
    }     
},{ collection: 'marketinfos'})

schema.plugin(mongoosePaginate);

module.exports = mongoose.model('marketinfos', schema)