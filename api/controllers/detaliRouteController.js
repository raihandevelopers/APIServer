//https://min-api.cryptocompare.com/data/pricemultifull?fsyms=BTC&tsyms=USD,EUR,USD
const request = require('request-promise');
const config = require('../config');
const db = require('../lib/db');
let cache = require('../lib/cache');
const settingsModel = require('../models/settings')
const requesti = require('../lib/network')
const accountsModel = require('../models/accountsModel')
const ccxt = require('ccxt')

async function getMarketInfoold() {
	try {
		var settings = await settingsModel.findOne({})
		let data = cache.getAlive(cache.collectionName.marketData, 'data');
		//if (data == undefined || data == null) {
			data = await request.get(config.marketData.apiUrl, {
				qs: {
					// 'id': '1',
					symbol: config.marketData.symbols,
					convert: config.marketData.currency,
				},
				method: 'GET',
				headers: {
					'X-CMC_PRO_API_KEY': settings.marketDataKey,
				},
				json: true,
				gzip: true,
			});

			data.toString();
			// data = JSON.parse(data)
			cache.create(cache.collectionName.marketData, 'data', data);
		//}
		//let lastmailsend = 0
		if (data == 'error' || undefined || '' || null) {


			//let admins = await accountsModel.find({adminLevel:0})

			// admins.forEach(async result=>{
			// 	requesti.post(config.services.emailService + '/sendMarketEmail', {			
			// 		email: result.email
			// 	})
			// })

			return res.status(500).send({
				status: 'Fail',
				message: 'API Key Limit Exceeded',
				error: 'error',
			});
		}else{
			return data;
		}


	} catch (err) {
		console.log("Error",err);
		return 'error';
	}
}

async function getMarketInfo() {
	try {
		var settings = await settingsModel.findOne({})
		let data = cache.getAlive(cache.collectionName.marketData, 'data');
		//if (data == undefined || data == null) {
			let binance = new ccxt.binance({ enableRateLimit: true })
        	let ethData = await binance.fetchTickers("ETH/BUSD")

			//console.log("ethData",await binance.fetchTicker("BTC/USD"))
			//console.log("btcData",await binance.fetchTickers("BTC/BUSD"))
			//console.log("ethData",await binance.fetchTickers("ETH/BUSD"))
			//console.log("usdtData",await binance.fetchTickers("BUSD/USDT"))

        	let btcData = await binance.fetchTickers("BTC/BUSD")
        	let usdtData = await binance.fetchTickers("BUSD/USDT")

			//console.log("usdtData",usdtData)
			//console.log("btcData.last",btcData['BTC/BUSD'].last)

        	let ethChange = ethData['ETH/BUSD'].percentage
        	let btcChange = btcData['BTC/BUSD'].percentage
        	let usdtChange = usdtData['BUSD/USDT'].percentage

		data = {
			data: {
				BTC: {
					symbol: "BTC",
					quote: {
						USD: {
							price: btcData['BTC/BUSD'].last,
							percent_change_24h: btcChange
						}
					}
				},
				ETH: {
					symbol: "ETH",
					quote: {
						USD: {
							price: ethData['ETH/BUSD'].last,
							percent_change_24h: ethChange
						}
					}
				},
				USDT: {
					symbol: "USDT",
					quote: {
						USD: {
							price: 1 / Number(usdtData['BUSD/USDT'].last).toFixed(10),
							percent_change_24h: usdtChange
						}
					}
				}
			}
		}

			data.toString();
			// data = JSON.parse(data)
			cache.create(cache.collectionName.marketData, 'data', data);
		//}
		//let lastmailsend = 0
		if (data == 'error' || undefined || '' || null) {


			//let admins = await accountsModel.find({adminLevel:0})

			// admins.forEach(async result=>{
			// 	requesti.post(config.services.emailService + '/sendMarketEmail', {			
			// 		email: result.email
			// 	})
			// })

			return res.status(500).send({
				status: 'Fail',
				message: 'API Key Limit Exceeded',
				error: 'error',
			});
		}else{
			return data;
		}


	} catch (err) {
		console.log("Error",err);
		return 'error';
	}
}



async function getMarketConvertDataold(amount, from, to) {
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
		
			if (data == 'error' || undefined || '' || null) {

				let admins = await accountsModel.find({adminLevel:0})
	
				admins.forEach(async result=>{
					requesti.post(config.services.emailService + '/sendMarketEmail', {			
						email: result.email
					})
				})
	
				return
			}else{
				return data;
			}
		}
		
	} catch (err) {
		console.log("Error",err);
		return;
	}
}

async function getMarketConvertData(amount, from, to) {
	try {

		var settings = await settingsModel.findOne({})
		console.log("1",amount,"2",from,"3",to)

		if(Number(amount) == 0){
			let data = 0;
			return data
		}
		else{
			let binance = new ccxt.binance({ enableRateLimit: true })
        	let ethData = await binance.fetchTickers("ETH/BUSD")

			//console.log("ethData",await binance.fetchTicker("BTC/USD"))
			//console.log("btcData",await binance.fetchTickers("BTC/BUSD"))
			//console.log("ethData",await binance.fetchTickers("ETH/BUSD"))
			//console.log("usdtData",await binance.fetchTickers("BUSD/USDT"))

        	let btcData = await binance.fetchTickers("BTC/BUSD")
        	let usdtData = await binance.fetchTickers("BUSD/USDT")

        	let ethChange = ethData.percentage
        	let btcChange = btcData.percentage
        	let usdtChange = usdtData.percentage
			
			data = {
				data: {
					quote: {
						BTC: {
							price: btcData['BTC/BUSD'].last * amount,
							percent_change_24h: btcChange
						},
						ETH: {
							price: ethData['ETH/BUSD'].last * amount,
							percent_change_24h: ethChange
						},
						USDT: {
							price: (1 / Number(usdtData['BUSD/USDT'].last) * amount).toFixed(10),
							percent_change_24h: usdtChange
						}
					}
				}
			}

			data.toString();
		
			if (data == 'error' || undefined || '' || null) {

				let admins = await accountsModel.find({adminLevel:0})
	
				admins.forEach(async result=>{
					requesti.post(config.services.emailService + '/sendMarketEmail', {			
						email: result.email
					})
				})
	
				return
			}else{
				return data;
			}
		}
		
	} catch (err) {
		console.log("Error",err);
		return;
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
	getMarketInfo,
	getMarketConvertData,
	//getMarketInfoold
};

/**
 * 5 hrs historical data
 * disconnect
 */
