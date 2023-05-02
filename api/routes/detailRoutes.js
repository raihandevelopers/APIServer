const express = require('express');
const router = express.Router();
const tokenVerification = require('../lib/jwt');
const db = require('../lib/db');
const controller = require('../controllers/detaliRouteController');
const config = require('../config');
const Web3 = require('web3');
const web3 = new Web3();
var speakeasy = require('speakeasy');
var QRCode = require('qrcode');
const walletModel = require('../models/wallets');
const accountsModel = require('../models/accountsModel');
const constants = require('../constants/constants');
const request = require('request-promise');
const transactionHistoriesModel = require('../models/TransactionHistories');
const infoModel = require('../models/info');
const chartsModel = require('../models/charts');
const usageStatistics = require('../models/usageStatistics');
const path = require('path');
const settingsModel = require('../models/settings');
const fileUpload = require('express-fileupload');
let bankAccountModel = require('../models/bankAccount');
const _ = require('lodash');
const marketInfoModel = require('../models/marketInfo');
const graphModel = require('../models/graph');
const body = require('express-validator').body;
const header = require('express-validator').header;
const query = require('express-validator').query;
const validationResult = require('express-validator').validationResult;
const feeModel = require('../models/fees')
const requesti = require('../lib/network')
const businessModel = require('../models/businessModel')

const validate = routeName => {
	switch (routeName) {
		case 'convertPricess':
			return [
				body('amount').notEmpty().exists(),
				body('from').notEmpty().exists(),
				body('to').notEmpty().exists(),
			];
		case 'convertPrice':
			return [
				body('amount').notEmpty().exists(),
				body('from').notEmpty().exists(),
				body('to').notEmpty().exists(),
			];
	}
};

router.use(fileUpload());

async function getMarketData() {
	
	let data = await controller.getMarketInfo();
	if (data == 'error' || undefined || '' || null) {

		console.log("ERROR")

		let admins = await accountsModel.find({ adminLevel: 0 })

		// admins.forEach(async result => {
		// 	requesti.post(config.services.emailService + '/sendMarketEmail', {
		// 		email: result.email
		// 	})
		// })
	}

	let String = "23"

	let marketInfo = {
		BTC: {
			change_24:String,
			price:String,
			FromUSD:String
		},
		ETH: {
			change_24:String,
			price:String,
			FromUSD:String
		},
		USDT: {
			change_24:String,
			price:String,
			FromUSD:String
		},
		MYBIZ: {
			change_24:String,
			price:String,
			FromUSD:String
		} 
	} 

	console.log("DATAS",marketInfo)

}

router.post('/marketData_', async (req, res) => {
	/*
		getMarketInfo() :
			R E T R E I V I N G    T H E    C U R R E N T    M A R K E T
			P R I C E    O F    C R Y P T O S     W . R . T .    A E D
	*/
	try {


		let Info = await marketInfoModel.findOne({});


		let result = [
			{
				"id": 1,
				"name": "Bitcoin",
				"symbol": "BTC",
				"quote": {
					"USD": {
						"price": Number(Info["BTC"].price).toFixed(5),
						"percent_change_24h": Number(Info["BTC"].change_24).toFixed(5),
					}
				}
			},
			{
				"id": 1027,
				"name": "Ethereum",
				"symbol": "ETH",
				"quote": {
					"USD": {
						"price": Number(Info["ETH"].price).toFixed(5),
						"percent_change_24h": Number(Info["ETH"].change_24).toFixed(5),
					}
				}
			},
			{
				"id": 825,
				"name": "Tether",
				"symbol": "USDT",
				"quote": {
					"USD": {
						"price": Number(Info["USDT"].price).toFixed(5),
						"percent_change_24h": Number(Info["USDT"].change_24).toFixed(5)
					}
				}
			},
			{
				"id": 5156,
				"name": "MyBiz coin",
				"symbol": "MYBIZ",
				"quote": {
					"USD": {
						"price": Number("11"),
						"percent_change_24h": Number("0.28")
					}
				}
			}
		]

		let btc = config.cryptoImgPath + '/' + 'BTC.png';
		let eth = config.cryptoImgPath + '/' + 'ETH.png';
		let usdt = config.cryptoImgPath + '/' + 'USDT.png';
		let mybiz = config.cryptoImgPath + '/' + '.png';

		let resa = [];

		resa.push(btc, eth, usdt, mybiz);

		let charts = await chartsModel.find({});

		// JSON ARRAY
		var r = [];
		let cryp = ['btc', 'eth', 'usdt', 'mybiz'];
		for (var name in cryp) {
			if (cryp.hasOwnProperty(name)) {
				r.push({ name: cryp[name], url: resa[name] });
			}
		}




		res.status(200).send({
			status: 'success!',
			latestmarketData: Info,
			cryptos: r,
			charts7d: charts,
			marketData: result,
			error: 'nil',
		});
		// }
	} catch (error) {
		return res.status(500).send({
			status: "Fail",
			error: "Err"
		})
	}

});

router.post('/convertPricess', validate('convertPricess'), async (req, res) => {
	let errors = validationResult(req);
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: 'fail',
			message: 'Validation Failed',
			error: errors.array(),
		});
		return;
	}

	let { amount, from, to } = req.body;

	let fee = await feeModel.findOne({})
	var feeIn = Number(fee[from].buyFee) / Number('100')

	console.log("fsafs", feeIn)

	console.log(req.body);
	let data = await controller.getMarketConvertData(amount, from, to);
	if (data == 'error' || undefined || '' || null) {
		res.status(500).send({
			status: 'fail',
			message: '',
			error: 'error',
		});
	} else {
		let result = data;
		console.log(result.data);

		res.send({
			status: 'success!',
			message: '',
			marketData: result.data ? result.data : '0',
			error: 'nil',
		});
	}
});

//router.use(tokenVerification);

router.get('/user', async (req, res) => {

	try {
		let userData = req.user;

		let accInfo = await accountsModel.findOne({ _id: req.user._id }).lean().exec()
		let bussinessInfo = await businessModel.findOne({ user_email: accInfo.email }).lean().exec();
		delete accInfo['pin']
		delete accInfo['password']
	
		res.send({
			status: 'success',
			message: '',
			userInfo: accInfo,//dataExceptLoki,
			business_profile :bussinessInfo,
			error: 'nil'
		})
	} catch (error) {
		console.log("ERROR",error)
		return res.status(500).send({
			status:"fail",
			message:"Internal Server Error"
		})
	}

})

router.get('/getOtherInfo', (req, res) => {

	try {
		let user = req.user
		let supportedCryptos = config.supportedCryptos
		let supportedFiat = config.supportedFiat
		// let currencies = {
		//     cryptos: supportedCryptos,
		//     cryptosFullName: config.supportedCryptosFullName,
		//     fiat: supportedFiat
		// }
		let pendingTasks = []
	
		if (user.kycStatus == constants.kyc.NO_DOCUMENTS_UPLOADED) {
			pendingTasks.push({
				name: "KYC_ERROR",
				title: 'KYC',
				message: "Complete the KYC"
			})
		}
	
		if (user.hasTransactionPin == false) {
			pendingTasks.push({
				name: "Tx_PIN_ERROR",
				title: 'Transaction Pin',
				message: "Transaction pin is not set"
			})
		}
	
		// if (supportedFiat.indexOf(user.currency) == -1) {
		//     pendingTasks.push({
		//         name: "FIAT_CURRENCY",
		//         title: 'Fiat currency',
		//         message: 'Select preferred Currency '
		//     })
		// }
	
		if (user.securityQuestion == undefined) {
			pendingTasks.push({
				name: "SECURITY_QUESTION",
				title: 'Security Question',
				message: 'Set security questions'
			})
		}
	
		let languages = config.languages
		let imgPath = config.imgPath
	
		res.send({
			status: 'success',
			message: '',
			supportedCryptos: supportedCryptos,
			// buyCryptos: config.buyCryptos,
			// supportedFiat: supportedFiat,
			languages: languages,
			pendingItems: pendingTasks,
			privacyPolicy: config.privacyPolicyUrl,
			termsAndConditions: config.termsAndConditionsUrl,
			faq: config.faqUrl,
			//moonpayKey: config.moonpayKey,
			error: 'nil'
		})
	} catch (error) {
		console.log("ERROR",error)
		return res.status(500).send({
			status:"fail",
			message:"Internal Server Error"
		})
	}

})

// router.get('/user', async (req, res) => {

// 	let userData = req.user;

// 	let accInfo = await accountsModel.findOne({_id:req.user._id})

//     //delete userData.$loki
//     let {
//         $loki,
//         ...dataExceptLoki
//     } = userData

// 	dataExceptLoki['fiatBalance'] = accInfo.fiatBalance
// 	dataExceptLoki['email'] = accInfo.email
// 	dataExceptLoki['phoneAuth'] = accInfo.phoneAuth
// 	dataExceptLoki['auth2'] = accInfo.auth2
// 	dataExceptLoki['legalName'] = accInfo.legalName
// 	dataExceptLoki['profileStatus'] = accInfo.profileStatus
// 	dataExceptLoki['whitelist'] = accInfo.whitelist

// 	console.log("akffe321423423a",dataExceptLoki['fiatBalance']	)

//     res.send({
//         status: 'success',
//         message: '',
//         userInfo: dataExceptLoki,
//         error: 'nil'
//     })
// })


// S H O W     U S A G E    S T A T I S T I C S    O F    U S E R  
router.get('/userActivities', async (req, res) => {
	let user = await usageStatistics.find({ email: req.user.email });
	let ip = '42.109.147.198';

	data = await request.get(`https://www.iplocate.io/api/lookup/${ip}`, {
		method: 'GET',
		json: true,
	});

	data.toString();

	res.send({
		status: 'success',
		data: user,
	});
});

// G E T    B A N K    D E T A I L S    O F    U S E R
router.post('/getBankDetails', async (req, res) => {
	try {
		console.log('ASFasfa', req.user.id);

		let result = await bankAccountModel.find({ id: req.user.id });

		res.status(200).send({
			status: 'success',
			data: result,
		});
	} catch (error) {
		res.status(500).send({
			error: error,
			status: 'fail',
			message: 'Internal Server Error',
		});
	}
});

// F I A T    B A L A N C E    &    G R A P H S 
router.get('/fiatBalance', async (req, res) => {

	try {
		let txns1 = await transactionHistoriesModel.find({ from: req.user.id }).lean().exec();
		let totalFiatBalance = 0;
		let depositAmount = 0;
		let debitAmount = 0;
		let accInfo = await accountsModel.findOne({ _id: req.user._id })
	
		txns1.forEach(result => {
			if (result.type == 'topups' && result.status == 'completed') {
				depositAmount += Number(result.sourceAmount);
			}
			if (result.type == 'withdraws' && result.status == 'completed') {
				debitAmount += Number(result.sourceAmount);
			}
		});
	
		totalFiatBalance = depositAmount - debitAmount;
	
		var now = new Date();
	
		let today = now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();
	
		// G R A P H S [ B T C   V S   A E D ]
		let hourly = await graphModel.find({ type: 'HOUR' });
		let days = await graphModel.find({ type: 'DAY' });
		let weekly = await graphModel.find({ type: 'WEEK' });
		let monthly = await graphModel.find({ type: 'MONTH' });
		let yearly = await graphModel.find({ type: 'YEAR' });
	
		// F I A T    B A L A N C E   D A I L Y   C H A N G E 
		let daily = await infoModel.find({ $and: [{ email: req.user.email }, { time: 'DAYS' }] });
	
		let amount = 0;
		let present = daily[daily.length - 1];
		let previous = daily[daily.length - 2];
	
		let present_den = Number(present) * 100;
		let prev_den = Number(previous) * 100;
	
		if (1) {
			if (present == undefined || previous == undefined || present.fiatBalance == 0) {
				amount = 0;
			} else {
				amount = (Number(present.fiatBalance) - Number(previous.fiatBalance)) / Number(present.fiatBalance) * 100;
				console.log("Present:", present.fiatBalance, "Previous:", previous.fiatBalance)
				console.log("AMOUNT:", amount)
			}
			// amount= amount.toFixed(4);
		}
	
	
		let set = await settingsModel.find({})
	
		res.status(200).send({
			status: 'success',
			withdraw_limit: set[0].withdraw_limit,
			min_withdraw_amt: set[0].min_withdraw,
			fiatBalance: Number(accInfo.fiatBalance).toFixed(5),
			dailyChange: amount,
			hourly: hourly,
			days: days,
			d_weekly: weekly,
			d_monthly: monthly,
			d_yearly: yearly,
		});
	} catch (error) {
		console.log("ERROR",error)
		return res.status(500).send({
			status:"fail",
			message:"Internal Server Error"
		})
	}
});

//W A L L E T
router.post('/wallet', async (req, res) => {
	try {
		let wallet = [];
		let walletAddresses = req.user.wallets;
		let wallets = await walletModel
			.findOne({ email: req.user.email })
			.lean()
			.exec();

		console.log('ADDRESSSS:', walletAddresses, '\n\nWALLELTSSSS:', wallets);
		let balanceInCrypto = 0
		if (wallets != null) {
			delete wallets.email;
			delete wallets._id;
			delete wallets.__v;
			delete wallets.phone;
			delete wallets.id;
			delete wallets.enrg;
			let keys = Object.keys(wallets);
			console.log('KEYS', keys);
			let totalAssetBalance = 0;
			let fiatCurrency = 'USD';
			var btc, eth, usdt, mybiz
			keys.forEach(async key => {
				console.log(key);
				if (key == 'eth') {
					console.log(wallets['eth']);
					let balanceWithoutFee = web3.utils.fromWei(String(wallets['eth'].balance));
					wallets['eth'].balance = Number(balanceWithoutFee) - Number(wallets['eth'].fee)
					//wallets['eth'].balance = web3.utils.fromWei(wallets['eth'].balance) //(web3.utils.fromWei(String(wallets['eth'].balance)))
				}

				let response = {
					wallet: key,
					address: walletAddresses[key],
					balance: String(Number(wallets[key].balance) - Number(wallets[key].fee)),
					isEnabled: wallets[key].isEnabled,
					extraId: '',
				};
				balanceInCrypto += Number(String(Number(wallets[key].balance))) //- Number(wallets[key].fee)))

				wallet.push(response);
			});


			var Info = await marketInfoModel.findOne({});
			totalAssetBalance += (Number(wallets['btc'].balance) * Number(Info["BTC"].price))
			totalAssetBalance += (Number(wallets['eth'].balance) * Number(Info["ETH"].price))
			totalAssetBalance += (Number(wallets['usdt'].balance) * Number(Info["USDT"].price))
			totalAssetBalance += (Number(wallets['mybiz'].balance)*Number(Info["MYBIZ"].price))

			let btc_ = config.cryptoImgPath + '/' + 'BTC.png';
			let eth_ = config.cryptoImgPath + '/' + 'ETH.png';
			let usdt_ = config.cryptoImgPath + '/' + 'USDT.png';
			let mybiz_ = config.cryptoImgPath + '/' + 'MYBIZ.png';


			let resa = [];

			resa.push(btc_, eth_, usdt_, mybiz_);// paxg_, powr_, usdt_, xaut_);



			let cr = [];
			if (Number(wallets['btc'].balance != 0)) {
				btc = (Number(wallets['btc'].balance) * Number(Info["BTC"].price)).toFixed(5)
			} else {
				btc = 0;
			}

			if (Number(wallets['eth'].balance != 0)) {
				eth = (Number(wallets['eth'].balance) * Number(Info["ETH"].price)).toFixed(5)
			} else {
				eth = 0;
			}

			if (Number(wallets['usdt'].balance != 0)) {
				usdt = (Number(wallets['usdt'].balance) * Number(Info["USDT"].price)).toFixed(5)
			} else {
				usdt = 0;
			}

			if (Number(wallets['mybiz'].balance != 0)) {
				mybiz = (Number(wallets['mybiz'].balance)*Number(Info["MYBIZ"].price)).toFixed(5)
			} else {
				mybiz = 0;
			}

			cr.push(btc, eth, usdt, mybiz);

			let list = ['btc', 'eth', 'usdt', 'mybiz'];
			let walletB = [
				Number(wallets['btc'].balance).toFixed(5),
				Number(wallets['eth'].balance).toFixed(5),
				Number(wallets['usdt'].balance).toFixed(5),
				Number(wallets['mybiz'].balance).toFixed(5),
			];

			var r = [];
			let cryp = ['Bitcoin', 'Ethereum', 'Tether', 'MyBiz coin'];
			for (var name in cryp) {
				if (cryp.hasOwnProperty(name)) {
					// console("walletB[name]",walletB[name])
					// console("balanceInCrypto",balanceInCrypto)
					r.push({
						name: cryp[name],
						url: resa[name],
						price: cr[name],
						symbol: list[name],
						wallet: walletB[name],
						percent: ((Number(walletB[name]) / Number(balanceInCrypto))* 100).toFixed(5),
					});
				}
			}

			console.log('asdasdasdASD', r);

			return res.status(200).send({
				status: 'success',
				message: '',
				walletInfo: wallet,
				totalAssetBalance: Number(totalAssetBalance).toFixed(5),
				crypto: r,
				error: 'nil',
			});
		}
	} catch (error) {
		console.log(error);
		res.status(500).send({
			status: 'fail',
			message: 'Internal_server_error',
			walletInfo: '',
			error: 'error',
		});
	}
});

router.post('/checkEmail', async (req, res) => {
	let user = await getUser(req.body.toEmail);
	if (user == null) {
		res.send({
			status: 'fail',
			message: 'email not found',
			data: '',
			error: 'nil',
		});
	} else {
		res.send({
			status: 'success',
			message: 'email exists',
			data: user,
			error: 'nil',
		});
	}
});

// C O N V E R T    P R I C E [ A E D   <----->     B T C ]
router.post('/convertPrice', validate('convertPrice'), async (req, res) => {
	let errors = validationResult(req);
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: 'fail',
			message: 'Validation Failed',
			error: errors.array(),
		});
		return;
	}
	try {
		let Info = await marketInfoModel.findOne({});

		let settings = await settingsModel.findOne({}).lean().exec()

		let { amount, from, to } = req.body;

		var fee
		var feeIn
		var buyInfo, sellInfo
		fee = await feeModel.findOne({})
		var sellInitialValue, buyInitialValue
		var sellFinalValue = 0
		var buyFinalValue = 0
		var toUSD = 0
		var toCRYPTO = 0

		if (from == "USD" & to != "MYBIZ") {
			console.log("12312313131")
			feeIn = Number(fee[to].buyFee) / Number('100')
			buyInitialValue = Number(amount) - (Number(amount) * Number(feeIn))
			buyFinalValue = Number(buyInitialValue) * Number(Info[to].FromUSD)
			toCRYPTO = Number(amount) * Number(Info[to].FromUSD)

		} else if (from == "USD" && to == "MYBIZ") {

			feeIn = Number(fee[to].buyFee) / Number('100')
			buyInitialValue = Number(amount) - (Number(amount) * Number(feeIn))
			buyFinalValue = Number(buyInitialValue) * Number(settings["coin"].price)
			toCRYPTO = Number(amount) * Number(settings["coin"].price)

		}
		else if (from != "USD" && from != "MYBIZ") {
			console.log("fee",fee)
			feeIn = Number(fee[from].sellFee) / Number('100')
			sellInitialValue = Number(amount) * Number(Info[from].price)
			sellFinalValue = Number(sellInitialValue) - (Number(sellInitialValue) * Number(feeIn))
			console.log("Initial", sellFinalValue)
			toUSD = (Number(amount) * Number(Info[from].price))
			console.log("Initial", toUSD)
		} else {
			return res.status(200).send({
				status: 'success',
				buyFinalValue: 0,
				sellFinalValue: 0,
				toCRYPTO: 0,
				toUSD: 1,
				fee: feeIn,
				error: 'nil',
			});
		}

		console.log("56555555555555555555555")

		return res.status(200).send({
			status: 'success',
			buyFinalValue: Number(buyFinalValue).toFixed(5),
			sellFinalValue: Number(sellFinalValue).toFixed(5),
			toCRYPTO: Number(toCRYPTO).toFixed(5),
			toUSD: Number(sellInitialValue).toFixed(5),
			fee: feeIn,
			error: 'nil',
		});


	} catch (error) {
		console.log(error)
		return res.status(500).send({
			status: "Fail",
			error: error
		})

	}


});


// C O N V E R T    P R I C E [ A E D   <----->     B T C ]
router.post('/convertPrice--', validate('convertPrice'), async (req, res) => {
	let errors = validationResult(req);
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: 'fail',
			message: 'Validation Failed',
			error: errors.array(),
		});
		return;
	}
	try {
		let Info = await marketInfoModel.findOne({});

		let settings = await settingsModel.findOne({}).lean().exec()

		let { amount, from, to } = req.body;

		var fee
		var feeIn
		var buyInfo, sellInfo
		fee = await feeModel.findOne({})
		var sellInitialValue, buyInitialValue
		var sellFinalValue = 0
		var buyFinalValue = 0
		var toUSD = 0
		var toCRYPTO = 0

		if (from == "USD" & to != "MYBIZ") {
			console.log("12312313131")
			feeIn = Number(fee[to].buyFee) / Number('100')
			buyInitialValue = Number(amount) - (Number(amount) * Number(feeIn))
			buyFinalValue = Number(buyInitialValue) * Number(Info[to].FromUSD)
			toCRYPTO = Number(amount) * Number(Info[to].FromUSD)

		} else if (from == "USD" && to == "MYBIZ") {

			feeIn = Number(fee[to].buyFee) / Number('100')
			buyInitialValue = Number(amount) - (Number(amount) * Number(feeIn))
			buyFinalValue = Number(buyInitialValue) * Number(settings["coin"].price)
			toCRYPTO = Number(amount) * Number(settings["coin"].price)

		}
		else if (from != "USD" && from != "MYBIZ") {
			feeIn = Number(fee[from].sellFee) / Number('100')
			sellInitialValue = Number(amount) * Number(Info[from].price)
			sellFinalValue = Number(sellInitialValue) - (Number(sellInitialValue) * Number(feeIn))
			console.log("Initial", sellFinalValue)
			toUSD = (Number(amount) * Number(Info[from].price))
			console.log("Initial", toUSD)
		} else {
			return res.status(200).send({
				status: 'success',
				buyFinalValue: 0,
				sellFinalValue: 0,
				toCRYPTO: 0,
				toUSD: 1,
				fee: feeIn,
				error: 'nil',
			});
		}

		console.log("56555555555555555555555")

		return res.status(200).send({
			status: 'success',
			buyFinalValue: Number(buyFinalValue).toFixed(5),
			sellFinalValue: Number(sellFinalValue).toFixed(5),
			toCRYPTO: Number(toCRYPTO).toFixed(5),
			toUSD: Number(sellInitialValue).toFixed(5),
			fee: feeIn,
			error: 'nil',
		});


	} catch (error) {
		console.log(error)
		return res.status(500).send({
			status: "Fail",
			error: error
		})

	}


});

// M A R K E T    D A T A
router.post('/marketData', async (req, res) => {
	/*
		getMarketInfo() :
			R E T R E I V I N G    T H E    C U R R E N T    M A R K E T
			P R I C E    O F    C R Y P T O S     W . R . T .    A E D
	*/
	try {

		let Info = await marketInfoModel.findOne({});

		let settings = await settingsModel.findOne({}).lean().exec()

		fee = await feeModel.findOne({})

		let result = [
			{
				"id": 1,
				"name": "Bitcoin",
				"symbol": "BTC",
				"quote": {
					"USD": {
						"price": Number(Info["BTC"].price).toFixed(5) - (Number(Info["BTC"].price).toFixed(5)*Number(fee["BTC"].buyFee)/100),
						"percent_change_24h": Number(Info["BTC"].change_24).toFixed(5),
					}
				}
			},
			{
				"id": 1027,
				"name": "Ethereum",
				"symbol": "ETH",
				"quote": {
					"USD": {
						"price": Number(Info["ETH"].price).toFixed(5)- (Number(Info["ETH"].price).toFixed(5)*Number(fee["ETH"].buyFee)/100),
						"percent_change_24h": Number(Info["ETH"].change_24).toFixed(5),
					}
				}
			},
			{
				"id": 825,
				"name": "Tether",
				"symbol": "USDT",
				"quote": {
					"USD": {
						"price": Number(Info["USDT"].price).toFixed(5)- (Number(Info["USDT"].price).toFixed(5)*Number(fee["USDT"].buyFee)/100),
						"percent_change_24h": Number(Info["USDT"].change_24).toFixed(5)
					}
				}
			},
			{
				"id": 5156,
				"name": "MyBiz coin",
				"symbol": "MYBIZ",
				"quote": {
					"USD": {
						"price": Number(settings["coin"].price).toFixed(5)- (Number(settings["coin"].price).toFixed(5)*Number(fee["MYBIZ"].buyFee)/100),
						"percent_change_24h": Number("0.0")
					}
				}
			}
		]

		let watest = await walletModel.findOne({ email: req.user.email }).lean();

		if(!watest.btc.address || watest.btc.address == "") {
			let btcWallet = await getWallets()
			console.log("btcWallet",btcWallet)
			let btcadd = btcWallet.btc

			console.log("btcadd",btcadd)
			await accountsModel.updateOne(
				{ email: req.user.email },
				{
					$set: {
						"wallets.btc": btcadd
					},
				}
			);
			await walletModel.updateOne({
				email: req.user.email
			}, {
				$set: {
					"btc.address" : btcadd
				}
			})
		 } 
		 
		let wa = await walletModel.findOne({ email: req.user.email });

		console.log("wa",wa)

		var qr = await Promise.all([
			QRCode.toDataURL(wa.btc.address),
			QRCode.toDataURL(wa.eth.address),
			QRCode.toDataURL(wa.usdt.address),
			QRCode.toDataURL(wa.mybiz.address)
		])

		// QRCode.toDataURL(wa.btc.address, async function (err, data) {
		// 	qr.push(data);
		// });

		// QRCode.toDataURL(wa.eth.address, async function (err, data) {
		// 	qr.push(data);
		// });

		// QRCode.toDataURL(wa.usdt.address, async function (err, data) {
		// 	qr.push(data);
		// });

		// QRCode.toDataURL(wa.usdt.address, async function (err, data) {
		// 	qr.push(data);
		// });

		console.log("1231231232134234234324", qr)

		let btc = config.cryptoImgPath + '/' + 'BTC.png';
		let eth = config.cryptoImgPath + '/' + 'ETH.png';
		let usdt = config.cryptoImgPath + '/' + 'USDT.png';
		let mybiz = config.cryptoImgPath + '/' + 'MYBIZ.png';

		let resa = [];
		let ad = [];

		ad.push(wa.btc.address, wa.eth.address, wa.usdt.address, wa.mybiz.address)
		resa.push(btc, eth, usdt, mybiz);


		let charts = await chartsModel.find({});

		// JSON ARRAY
		var r = [];
		let cryp = ['btc', 'eth', 'usdt', 'mybiz'];
		for (var name in cryp) {
			if (cryp.hasOwnProperty(name)) {
				r.push({ name: cryp[name], url: resa[name], qrcode: qr[name], address: ad[name] });
			}
		}



		// console.log('afs232', r);

		res.send({
			status: 'success!',
			latestmarketData: Info,
			cryptos: r,
			charts7d: charts,
			marketData: result,
			error: 'nil',
		});

	} catch (error) {
		return res.status(500).send({
			status: "Fail",
			error: "Err"
		})
	}


});

// P R O F I L E    I N F O 
router.get('/getProfile', async (req, res) => {
	try {
		let acc = await accountsModel.findOne({ _id: req.user._id });

		let profile = [];
		let personal = [];
		let preference = [];
		let phone = [];

		profile.push(acc.name, acc.email);
		personal.push(acc.dob, acc.streetAddress, acc.unit, acc.city, acc.state, acc.postalCode, acc.country);
		preference.push(acc.localCurrency, acc.timeZone);
		phone.push(acc.phone);

		res.status(200).send({
			status: 'success',
			profile: profile,
			personal: personal,
			preference: preference,
			phone: phone,
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			error: '',
		});
	}
});

router.post('/upload', async (req, res) => {
	try {

		var btc = req.files.btc
		var data_btc = req.files.btc.data
		var fileName_btc = req.files.btc.name
		var contentType_btc = req.files.btc.mimetype

		var eth = req.files.eth
		var data_eth = req.files.eth.data
		var fileName_eth = req.files.eth.name
		var contentType_eth = req.files.eth.mimetype

		var usdt = req.files.usdt
		var data_usdt = req.files.usdt.data
		var fileName_usdt = req.files.usdt.name
		var contentType_usdt = req.files.usdt.mimetype

		var mybiz = req.files.mybiz
		var data_mybiz = req.files.mybiz.data
		var fileName_mybiz = req.files.mybiz.name
		var contentType_mybiz = req.files.mybiz.mimetype

		await request.post({
			url: config.services.fileService + '/uploadCoins',
			formData: {
				btc: {
					value: data_btc,
					options: {
						filename: fileName_btc,
						contentType: contentType_btc
					}
				},
				eth: {
					value: data_eth,
					options: {
						filename: fileName_eth,
						contentType: contentType_eth
					}
				},
				usdt: {
					value: data_usdt,
					options: {
						filename: fileName_usdt,
						contentType: contentType_usdt
					}
				},
				mybiz: {
					value: data_mybiz,
					options: {
						filename: fileName_mybiz,
						contentType: contentType_mybiz
					}
				},
			},
		})

		res.send({
			status: 'success',
			message: '',
		});

		return res.status(200).send({
			status: "Success",
			message: "CryptoCurrencies Logo Updated"
		})

	} catch (error) {
		console.log('error-/updateupload', error);
		res.status(500).send({
			status: 'fail',
			message: 'Error Occurred',
			error: 'error',
		});
	}
});

async function getUser(_email) {
	let user = (await db.readFromDBAsync(
		{
			email: _email,
		},
		'accounts'
	)).message;
	return user;
}

module.exports = router;

