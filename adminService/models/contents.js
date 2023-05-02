var mongoose = require('mongoose')

const schema = new mongoose.Schema({
    
    registration:JSON,
    forgetPassword:JSON

})

module.exports = mongoose.model('contents', schema)