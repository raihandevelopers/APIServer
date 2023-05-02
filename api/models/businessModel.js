var mongoose = require('mongoose');

module.exports = mongoose.model('business', {
    user_email: {
        type: String
        // required: true
    },
    email:{
        type:String
    },
    countrycode: String,
    phone: String,
	website: String,
	unit: String,
	streetAddress:  String,
	city: String,
	country:  String,
	postalCode:  String,
    logo: String

})

