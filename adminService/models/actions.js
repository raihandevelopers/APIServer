var mongoose = require('mongoose')

const schema = new mongoose.Schema({
    action : Array
})

module.exports = mongoose.model('actions', schema)