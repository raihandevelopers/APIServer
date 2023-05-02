var mongoose = require('mongoose');

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
    PAXG: {
        change_24:String,
        price:String,
        FromUSD:String
    },
    POWR: {
        change_24:String,
        price:String,
        FromUSD:String
    },
    USDT: {
        change_24:String,
        price:String,
        FromUSD:String
    },
    XAUT: {
        change_24:String,
        price:String,
        FromUSD:String
    }
    
},{ collection: 'marketinfos'})


module.exports = mongoose.model('marketinfos', schema)