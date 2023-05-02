var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate-v2')

const schema = new mongoose.Schema({
    ref: Number,
    from: String,
    to: String,
    value: String,
    currency: String,
    txHash: String,
    status: String,
    type:String,
    // transactions:Array,
    timestamp:{
        type:String
    }
},{ collection: 'transactions'})

schema.plugin(mongoosePaginate);

module.exports = mongoose.model('transactions', schema)