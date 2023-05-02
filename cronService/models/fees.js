var mongoose = require('mongoose')

const schema = new mongoose.Schema({

    BTC:{
        buyFee:String,
        sellFee:String,
        sendFee:String
    },
    ETH:{
        buyFee:String,
        sellFee:String,
        sendFee:String
    },
    PAXG:{
        buyFee:String,
        sellFee:String,
        sendFee:String
    },
    POWR:{
        buyFee:String,
        sellFee:String,
        sendFee:String
    },
    USDT:{
        buyFee:String,
        sellFee:String,
        sendFee:String
    },
    XAUT:{
        buyFee:String,
        sellFee:String,
        sendFee:String
    },
    USD:{
        withdrawFee : String
    }
})

module.exports = mongoose.model('fees', schema)