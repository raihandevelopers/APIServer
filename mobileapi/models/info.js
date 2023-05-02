var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate-v2')

const schema = new mongoose.Schema({
    
    email:String,
    phone:String,
    date:String,
    time:String,
    fiatBalance:String

},{ collection: 'infos'})

schema.plugin(mongoosePaginate);

module.exports = mongoose.model('infos', schema)