var mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const schema = new mongoose.Schema({
    email : {
        type: String,
        
    },
    kycData: {
       name: String,
       passport: String
    }
});
schema.plugin(mongoosePaginate);

module.exports = mongoose.model('kycData', schema);