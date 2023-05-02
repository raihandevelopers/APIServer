var mongoose = require('mongoose');

module.exports = mongoose.model('accounts-DONTUSE', {
	firstName: {
		type: String,
	},
	lastName: {
		type: String,
	},
	email: {
		type: String,
	},
	password: {
		type: String,
	},
	type: {
		type: String,
	},
	phone: {
		type: Number,
	},
	setting: {
		language: String,
	},
	wallets: {
		btc: {
			type: Number,
			default: 0,
		},
		eth: {
			type: Number,
			default: 0,
		},
		usdt: {
			type: Number,
			default: 0,
		},
		mybiz: {
			type: Number,
			default: 0,
		}
	},
});
