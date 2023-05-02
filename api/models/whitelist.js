var mongoose = require('mongoose')

const schema = new mongoose.Schema({
    email:String,
    coin: String,
    label : String,
    address : String
})

module.exports = mongoose.model('whitelists', schema)