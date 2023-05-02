var mongoose = require('mongoose')

const schema = new mongoose.Schema({
    id:String,
    bankName: String,
    accountNumber: String,
    accountHolderName: String,
    accountType: String,
    homeAddress: String,
    branch: String,
    city: String,
    zipCode: String,
    swiftCode: String,
    country: String
})

module.exports = mongoose.model('bankDetails', schema)