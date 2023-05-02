var mongoose = require('mongoose')

const schema = new mongoose.Schema({
    accountName : String,
    accountNumber : Number,
    bankCode : String,
    codeValue : String
})

module.exports = mongoose.model('bankinfo', schema)