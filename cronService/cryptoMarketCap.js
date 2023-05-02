//https://min-api.cryptocompare.com/data/pricemultifull?fsyms=BTC&tsyms=USD,EUR,USD
const request = require('request-promise');
const config = require('./config');
const settingsModel = require('./models/settings')

async function getMarketConvertData(amount, from, to) {
	try {

		var settings = await settingsModel.findOne({})
		console.log("1",amount,"2",from,"3",to)

		if(Number(amount) == 0){
			let data = 0;
			return data
		}
		else{
			data = await request.get('https://pro-api.coinmarketcap.com/v1/tools/price-conversion', {
				qs: {
					amount: amount,
					symbol: from,
					convert: to
				},
				method: 'GET',
				headers: {
					'X-CMC_PRO_API_KEY': settings.marketDataKey,
				},
				json: true,
				gzip: true,
			});
	
			data.toString();
		
			return data
		}
		
	} catch (err) {
		console.log(err);
		return 'error';
	}
}


function checkPendingActions(user) {
	let pendingActions = [];

	if (user.pin == 0 || user.hasTransactionPin == false) {
		pendingActions.push('TRANSACTION_PIN_NOT_SET');
	}
	if ((user.kycStatus = constants.kyc.NO_DOCUMENTS_UPLOADED)) {
		pendingActions.push('KYC_DOCUMENTS_NOT_UPLOADED');
	}
}

module.exports = {
	// getMarketData,
	getMarketConvertData,
};

/**
 * 5 hrs historical data
 * disconnect
 */
