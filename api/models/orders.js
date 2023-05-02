var mongoose = require('mongoose')

const schema = new mongoose.Schema({
    email:String,
    reservation:String,
    orderId:String,
    orderStatus:String,
    transferId:String,
    failedReason:String,
    error:String
})

module.exports = mongoose.model('orders', schema)