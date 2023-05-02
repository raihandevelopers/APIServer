var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate-v2')

const schema = new mongoose.Schema({
    
    date:String,
    time:String,
    rate:String,
    type:String

},{ collection: 'graphs'})

schema.plugin(mongoosePaginate);

module.exports = mongoose.model('graphs', schema)