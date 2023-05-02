var mongoose = require('mongoose')

const schema = new mongoose.Schema({
    type: String,
    wallets : {
        btc : String,
        eth : String,
        usdt : String,
        xaut : String,
        // enrg : String,
        paxg : String,
        powr : String
    }
})



module.exports = mongoose.model('config', schema)