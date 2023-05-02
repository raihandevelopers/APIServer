var mongoose = require('mongoose')

const schema = new mongoose.Schema({
    id: String,
    name: String,
    cardNumber: String,
    address: String,
    cardHolderName: String,
    city: String,
    zipCode: String,
    expireDate: String,
    country: String,
    cvv: String
})

module.exports = mongoose.model('bankcards', schema)