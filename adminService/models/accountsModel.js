var mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const schema = new mongoose.Schema({
    email : {
        type: String,
    },
    name : {
        type: String,
    },
    country : String,
    phone : String,
    password : String,
    language : String,
    id : String,
    // wallets : {
    //     btc : String,
    //     eth : String,
    //     usdt : String,
    //     xaut : String,
    //     // enrg : String,
    //     paxg : String,
    //     powr : String
    // },
    ref : Number,
    pin : String,
    kycStatus : String,
    kycLevel: {
        type: Number,
        default: 0
    },
    hasTransactionPin: Boolean,
    adminLevel : Number,
    secret: String,
    authenticator: Boolean,
    fiatBalance: {
        type: String,
        default: 0
    },
    accountStatus:{
        type:String,
        default:"active"
    },
    auth2:Boolean,
    payOutProfit:{
        type:String,
        default:0
    },
    transferProfit:{
        type:String,
        default:0
    },
    firstName:String,
    lastName: String

})

schema.plugin(mongoosePaginate);

module.exports = mongoose.model('accounts', schema)

// active,suspended, inactive