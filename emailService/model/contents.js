var mongoose = require('mongoose')

const schema = new mongoose.Schema({
    
    registration:String,
    forgetPassword:String

})

module.exports = mongoose.model('contents', schema)