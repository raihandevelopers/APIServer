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
let requestbtc = require('../lib/network')
const request = require('request-promise');
const transactionHistoriesModel = require('../models/TransactionHistories');
const businessModel = require('../models/businessModel')
const infoModel = require('../models/info');
const chartsModel = require('../models/charts');
const usageStatistics = require('../models/usageStatistics');
const groupsModel = require('../models/group')
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
let invoiceModel = require('../models/invoice')


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




		res.send({
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
			error: "Internal Server Error"
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
		res.status(412).send({
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

router.use(tokenVerification);

router.get('/user', async (req, res) => {

	let userData = req.user;

	let accInfo = await accountsModel.findOne({ _id: req.user._id }).lean().exec()
	let bussinessInfo = await businessModel.findOne({ user_email: accInfo.email }).lean().exec();
	delete accInfo['pin']
	delete accInfo['password']

	let email = accInfo.email

	let emailInfo = email.split('@');

	console.log("Email Info",emailInfo)

	if(accInfo.kycStatus == "not_uploaded"){
		accInfo.driving_licence_front_image = null 
		accInfo.driving_licence_rear_image = null
		accInfo.passport_front_image = null
		accInfo.passport_front_image = null
		accInfo.passport_front_image = null
		accInfo.passport_front_image = null
		accInfo.creditcard_front_image = null
		accInfo.creditcard_rear_image = null
		accInfo.insurancecard_front_image = null
		accInfo.insurancecard_rear_image = null
		accInfo.miscellaneous_front_image = null
		accInfo.miscellaneous_rear_image = null
		accInfo.first_dose_image = null
		accInfo.second_dose_image = null
	}

	if(accInfo.kycStatus == "rejected"){
			await accountsModel.updateOne({email:req.user.email},{
				$set:{
					passport: false,
					passportExpirationDate: null,
					idcard: false,
					license: false
				}
			},{
				upsert:true
			})

			// cache.update(cache.collectionName.session, req.user.id, {
			// 	passport: false,
			// 	passportExpirationDate: null,
			// 	idcard: false,
			// 	license: false,
			// });

		
		}

	if(accInfo.license == true && accInfo.kycStatus == "pending"){
		accInfo.driving_licence_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_Driver%20License_id_1.jpg'
		accInfo.driving_licence_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_Driver%20License_id_2.jpg'
	}
	else{
			accInfo.driving_licence_front_image = null 
			accInfo.driving_licence_rear_image = null
		}
	if(accInfo.license == true && accInfo.kycStatus == "approved"){
		accInfo.driving_licence_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_Driver%20License_id_1.jpg'
		accInfo.driving_licence_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_Driver%20License_id_2.jpg'
	}
	
	if(accInfo.license == true && accInfo.kycStatus == "rejected"){
		accInfo.driving_licence_front_image = null,
		accInfo.driving_licence_rear_image = null
	}
	// else{
	// 	accInfo.driving_licence_front_image = null 
	// 	accInfo.driving_licence_rear_image = null
	// }

	// if(accInfo.creditcard == true && accInfo.kycStatus == "pending"){
	// 	accInfo.credit_card_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_Credit%20Card_id_1.jpg'
	// 	accInfo.credit_card_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_Credit%20Card_id_2.jpg'
	// }else{
	// 	accInfo.credit_card_front_image = null 
	// 	accInfo.credit_card_rear_image = null
	// }
	// if(accInfo.insurance == true && accInfo.kycStatus == "pending"){
	// 	accInfo.insurance_card_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_Insurance%20Card_id_1.jpg'
	// 	accInfo.insurance_card_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_Insurance%20Card_id_2.jpg'
	// }else{
	// 	accInfo.insurance_card_front_image = null 
	// 	accInfo.insurance_card_rear_image = null
	// }
	// if(accInfo.miscellaneous == true && accInfo.kycStatus == "pending"){
	// 	accInfo.miscellaneous_card_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_Insurance%20Card_id_1.jpg'
	// 	accInfo.miscellaneous_card_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_Insurance%20Card_id_2.jpg'
	// }else{
	// 	accInfo.miscellaneous_card_front_image = null 
	// 	accInfo.miscellaneous_card_rear_image = null
	// }

	if(accInfo.passport == true && accInfo.kycStatus == "pending"){
		accInfo.passport_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_Passport_id_1.jpg',
		accInfo.passport_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_Passport_id_2.jpg'
	}
	// else{
	// 	accInfo.passport_front_image = null
	// 	accInfo.passport_rear_image = null
	// }
	if(accInfo.passport == true && accInfo.kycStatus == "approved"){
		accInfo.passport_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_Passport_id_1.jpg',
		accInfo.passport_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_Passport_id_2.jpg'
	}
	if(accInfo.passport == true && accInfo.kycStatus == "rejected"){
		accInfo.passport_front_image = null,
		accInfo.passport_rear_image = null
		
	}
	
	// else{
	// 	accInfo.passport_front_image = null
	// 	accInfo.passport_rear_image = null
	// }

	if(accInfo.creditcard == true && accInfo.kycStatus == "pending"){
		accInfo.creditcard_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_creditcard_id_1.jpg',
		accInfo.creditcard_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_creditcard_id_2.jpg'
	}
	// else{
	// 	accInfo.creditcard_front_image = null
	// 	accInfo.creditcard_rear_image = null
	// }

	if(accInfo.creditcard == true && accInfo.kycStatus == "not_uploaded"){
		accInfo.creditcard_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_creditcard_id_1.jpg',
		accInfo.creditcard_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_creditcard_id_2.jpg'
	}
	if(accInfo.creditcard == true && accInfo.kycStatus == "approved"){
		accInfo.creditcard_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_creditcard_id_1.jpg',
		accInfo.creditcard_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_creditcard_id_2.jpg'
	}
	if(accInfo.creditcard == true && accInfo.kycStatus == "rejected"){
		accInfo.creditcard_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_creditcard_id_1.jpg',
		accInfo.creditcard_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_creditcard_id_2.jpg'
	}
	// else{
	// 	accInfo.creditcard_front_image = null
	// 	accInfo.creditcard_rear_image = null
	// }

	if(accInfo.insurance == true && accInfo.kycStatus == "pending"){
		accInfo.insurancecard_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_insurance_id_1.jpg',
		accInfo.insurancecard_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_insurance_id_2.jpg'
	}
	// else{
	// 	accInfo.insurancecard_front_image = null
	// 	accInfo.insurancecard_rear_image = null
	// }

	if(accInfo.insurance == true && accInfo.kycStatus == "not_uploaded"){
		accInfo.insurancecard_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_insurance_id_1.jpg',
		accInfo.insurancecard_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_insurance_id_2.jpg'
	}
	if(accInfo.insurance == true && accInfo.kycStatus == "approved"){
		accInfo.insurancecard_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_insurance_id_1.jpg',
		accInfo.insurancecard_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_insurance_id_2.jpg'
	}
	if(accInfo.insurance == true && accInfo.kycStatus == "rejected"){
		accInfo.insurancecard_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_insurance_id_1.jpg',
		accInfo.insurancecard_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_insurance_id_2.jpg'
	}
	

	if(accInfo.miscellaneous == true && accInfo.kycStatus == "pending"){
		accInfo.miscellaneous_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_miscellaneous_id_1.jpg',
		accInfo.miscellaneous_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_miscellaneous_id_2.jpg'
	}

	if(accInfo.miscellaneous == true && accInfo.kycStatus == "not_uploaded"){
		accInfo.miscellaneous_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_miscellaneous_id_1.jpg',
		accInfo.miscellaneous_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_miscellaneous_id_2.jpg'
	}

	if(accInfo.miscellaneous == true && accInfo.kycStatus == "approved"){
		accInfo.miscellaneous_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_miscellaneous_id_1.jpg',
		accInfo.miscellaneous_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_miscellaneous_id_2.jpg'
	}
	if(accInfo.miscellaneous == true && accInfo.kycStatus == "rejected"){
		accInfo.miscellaneous_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_miscellaneous_id_1.jpg',
		accInfo.miscellaneous_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_miscellaneous_id_2.jpg'
	}

	
	if(accInfo.healthPassport == true && accInfo.kycStatus == "pending"){
		accInfo.first_dose_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_healthPassport_id_1.jpg',
		accInfo.second_dose_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_healthPassport_id_2.jpg'
	}

	if(accInfo.healthPassport == true && accInfo.kycStatus == "not_uploaded"){
		accInfo.first_dose_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_healthPassport_id_1.jpg',
		accInfo.second_dose_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_healthPassport_id_2.jpg'
	}

	if(accInfo.healthPassport == true && accInfo.kycStatus == "approved"){
		accInfo.first_dose_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_healthPassport_id_1.jpg',
		accInfo.second_dose_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_healthPassport_id_2.jpg'
	}
	if(accInfo.healthPassport == true && accInfo.kycStatus == "rejected"){
		accInfo.first_dose_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_healthPassport_id_1.jpg',
		accInfo.second_dose_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_healthPassport_id_2.jpg'
	}
	

	if(accInfo.idcard == true && accInfo.kycStatus == "pending"){
		accInfo.id_card_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_National%20Id%20Card_id_1.jpg'
		accInfo.id_card_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_National%20Id%20Card_id_2.jpg'
	}
	else{
		accInfo.id_card_front_image = null
		accInfo.id_card_rear_image = null
	}

	if(accInfo.idcard == true && accInfo.kycStatus == "approved"){
		accInfo.id_card_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_National%20Id%20Card_id_1.jpg'
		accInfo.id_card_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_National%20Id%20Card_id_2.jpg'
	}
	if(accInfo.idcard == true && accInfo.kycStatus == "rejected"){
		accInfo.id_card_front_image = null,
		accInfo.id_card_rear_image = null
	}
	// else{
	// 	accInfo.id_card_front_image = null
	// 	accInfo.id_card_rear_image = null
	// }
	accInfo.business_profile = bussinessInfo


	res.send({
		status: 'success',
		message: '',
		userInfo: accInfo ,//dataExceptLoki,
		error: 'nil'
	})
})

router.get('/getOtherInfo', (req, res) => {
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
});

//W A L L E T
router.post('/wallet', async (req, res) => {
	
	try {

		// var ObjectId = require('mongoose').Types.ObjectId; 
		
		let wallet = [];
		let walletAddresses = req.user.wallets;
		let wallets = await walletModel
			.findOne({ email: req.user.email })
			.lean()
			.exec();
			console.log(wallets)

		// console.log("req.user",req.user)
		// console.log("req.user._id",req.user._id)
		// let wallets = await walletModel
		// .find({"_id":new ObjectId(req.user._id)})
		// .lean()
		// .exec();

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
					wallets['eth'].balance = Number(balanceWithoutFee); // - Number(wallets['eth'].fee)
					//wallets['eth'].balance = web3.utils.fromWei(wallets['eth'].balance) //(web3.utils.fromWei(String(wallets['eth'].balance)))
				}
				let response = {
					wallet: key,
					address: walletAddresses[key],
					balance: String(Number(wallets[key].balance) - Number(wallets[key].fee)),
					isEnabled: wallets[key].isEnabled,
					extraId: '',
				};
				balanceInCrypto += Number(String(Number(wallets[key].balance)))// - Number(wallets[key].fee)))

				wallet.push(response);
			});


			var Info = await marketInfoModel.findOne({});
			totalAssetBalance += (Number(wallets['btc'].balance) * Number(Info["BTC"].price))
			// totalAssetBalance += (Number(wallets['bnb'].balance) * Number(Info["BNB"].price))
			// totalAssetBalance += (Number(wallets['busd'].balance) * Number(Info["BUSD"].price))
			totalAssetBalance += (Number(wallets['mybiz'].balance)*Number(Info["MYBIZ"].price))
			let totalAssetBalanceMyBiz = 0
			
			if(Number(totalAssetBalance) != 0){
				totalAssetBalanceMyBiz = Number(totalAssetBalance)/Number(Info["MYBIZ"].price)
			}
			

			let btc_ = config.cryptoImgPath + '/' + 'BTC.png';
			// let bnb_ = config.cryptoImgPath + '/' + 'BNB.png';
			// let busd_ = config.cryptoImgPath + '/' + 'BUSD.png';
			let mybiz_ = config.cryptoImgPath + '/' + 'MYBIZ.png';


			let resa = [];

			resa.push(btc_, mybiz_);// paxg_, powr_, usdt_, xaut_);



			let cr = [];
			if (Number(wallets['btc'].balance != 0)) {
				btc = (Number(wallets['btc'].balance) * Number(Info["BTC"].price)).toFixed(5)
			} else {
				btc = 0;
			}

			// if (Number(wallets['bnb'].balance != 0)) {
			// 	eth = (Number(wallets['bnb'].balance) * Number(Info["BNB"].price)).toFixed(5)
			// } else {
			// 	eth = 0;
			// }

			// if (Number(wallets['busd'].balance != 0)) {
			// 	usdt = (Number(wallets['busd'].balance) * Number(Info["BUSD"].price)).toFixed(5)
			// } else {
			// 	usdt = 0;
			// }

			if (Number(wallets['mybiz'].balance != 0)) {
				mybiz = (Number(wallets['mybiz'].balance)*Number(Info["MYBIZ"].price)).toFixed(5)
			} else {
				mybiz = 0;
			}

			cr.push(btc, eth, usdt, mybiz);

			let list = ['btc', 'bnb', 'busd', 'mybiz'];
			let walletB = [
				Number(wallets['btc'].balance).toFixed(5),
				// Number(wallets['bnb'].balance).toFixed(5),
				// Number(wallets['busd'].balance).toFixed(5),
				Number(wallets['mybiz'].balance).toFixed(5),
			];

			var r = [];
			let cryp = ['Bitcoin', 'Ethereum', 'Tether', 'MyBiz coin'];
			for (var name in cryp) {
				if (cryp.hasOwnProperty(name)) {
					console.log("walletB[name]",walletB[name])
					console.log("balanceInCrypto",balanceInCrypto)
					r.push({
						name: cryp[name],
						url: resa[name],
						price: cr[name],
						symbol: list[name],
						wallet: walletB[name],
						percent: (Number(walletB[name]) / Number(balanceInCrypto)) * 100
					});
				}
			}

			console.log('asdasdasdASD', r);

			return res.status(200).send({
				status: 'success',
				message: '',
				walletInfo: wallet,
				totalAssetBalance: Number(totalAssetBalance).toFixed(5),
				totalAssetBalanceMyBiz: totalAssetBalanceMyBiz,
				crypto: r,
				error: 'nil',
			});
		}
		// res.status(200).send({
		// 	status:"success"
		// })
	} 
	catch (error) {
		console.log("error",error.message);
		res.status(500).send({
			status: 'fail',
			message: 'Internal_server_error',
			walletInfo: '',
			error: error,
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
		Info["BTC"].url = config.cryptoImgPath + '/' + 'BTC.png'
		Info["ETH"].url = config.cryptoImgPath + '/' + 'ETH.png'
		Info["USDT"].url = config.cryptoImgPath + '/' + 'USDT.png'
		Info["MYBIZ"].url = config.cryptoImgPath + '/' + 'MYBIZ.png'
		console.log("Info",Info)
		console.log("Info",Info["BTC"].url)
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
						"price": Number(settings["coin"].price).toFixed(5),
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
		
		// try{

		// 	let watest = await walletModel.findOne({ email: req.user.email }).lean();

			
		// 	let btcqr = await QRCode.toDataURL(watest.btc.address)
		// 	console.log("watest",watest,btcqr)
		// }catch{
		// 	let btcWallet = await getWallets()
		// 	let btcadd = btcWallet.btc
		// 	await accountsModel.updateOne(
		// 		{ email: req.user.email },
		// 		{
		// 			$set: {
		// 				"wallets.btc": btcadd
		// 			},
		// 		},
		// 		{
		// 			multi: true,
		// 		}
		// 	);
		// 	await walletModel.updateOne({
		// 		email: req.user.email
		// 	}, {
		// 		$set: {
		// 			"btc.address" : btcadd
		// 		}
		// 	})
		// }

		let wa = await walletModel.findOne({ email: req.user.email }).lean();

		console.log("wa",wa)

		var qr = await Promise.all([
			// QRCode.toDataURL(wa.btc.address),
			// QRCode.toDataURL(wa.eth.address),
			// QRCode.toDataURL(wa.usdt.address),
			// QRCode.toDataURL(wa.mybiz.address)
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
		// let eth = config.cryptoImgPath + '/' + 'ETH.png';
		// let usdt = config.cryptoImgPath + '/' + 'USDT.png';
		let mybiz = config.cryptoImgPath + '/' + 'MYBIZ.png';

		let resa = [];
		let ad = [];

		ad.push(wa.btc.address, wa.mybiz.address)
		resa.push(btc, mybiz);


		let charts = await chartsModel.find({});

		// JSON ARRAY
		var r = [];
		let cryp = ['btc', 'eth', 'usdt', 'mybiz'];
		for (var name in cryp) {
			if (cryp.hasOwnProperty(name)) {
				console.log("Info",Info, cryp[name].toUpperCase())
				r.push({ name: cryp[name], url: resa[name], qrcode: qr[name], address: ad[name], 
					price: Number(Info[cryp[name].toUpperCase()].price).toFixed(5), FromUSD: Number(Info[cryp[name].toUpperCase()].FromUSD).toFixed(5) });
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
	console.log(error)	
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

async function getWallets() {
    let btcWallet = await requestbtc.get(config.services.btcService + "/getNewAddress")
    // let bchWallet = (await request.get(config.services.bchService + "/getNewAddress"))

    let wallets = {
        btc: ''
    }
    if (btcWallet.status == 'success') {
        wallets.btc = JSON.parse(btcWallet.message).address
    }
    // if (bchWallet.status == 'success') {
    //     wallets.bch = JSON.parse(bchWallet.message).address
    // }
    console.log(wallets)
    return wallets

}

router.post("/getInvoices", async(req,res) => {
	try{

		let receiverEmail = req.body.receiverEmail
		let invoiceFromDb = await invoiceModel.find({receiverEmail:receiverEmail})

		res.send({
			status:"success",
			message:"true",
			data:invoiceFromDb
		})
	}
	catch(err){
		console.log(err.message)

		res.send({
			status:"fail",
			message:"false"
		})
	}
})

//function to get the list of industries
router.get('/getIndustries', async (req, res) => {
	try {
		let industries = ["Blockchain","Mergers & Acquisition","Marketing","Cryptocurrency","Social Influencer","Social Media","Stock Trader","Investments","Real Estate Commerical","Real Estate Residential","Coding","Oil","Gas","biotech","Pharmaceutical","Retail","Ecommerce","Mobile Commerce","Computer","Insurance","Farming & Agriculture","Entertainment","Virtual Reality","Gaming","Design","Art, physical ARt","NFT art","Finance","Transportation","Hotels & hospitality","Medicine","Construction","Media","Energy","Healthcare","Technology","Aerospace","Engineers","Software Engineers","Aesthetician & Skincare","Jewelry","Restuarant","Rental","Party, Planning, Clubbing","Nursing Home","Cleaning","Apartments","Fish","Organic","Shipping","Graphic Design","Food & Desserts","Telecommunication","Government","Non profit","Education","Industrial","Writer, Novels","Project Manager","Dental","Math & statistics","Financial Manager","Wind Power","Electric Vehicle"]
		res.status(200).send({
			status: 'success',
			industries: industries,
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			error: '',
		});
	}
});

//Api name : profileIndustryUpdate  Params: position, industry, location, status/mood  User can add this information to their profile
router.post('/profileIndustryUpdate', async (req, res) => {
	try {
		let acc = await accountsModel.findOne({_id:req.user._id});
		acc.industry = req.body.industry;
		acc.location = req.body.location;
		acc.status = req.body.status;
		acc.mood = req.body.mood;
		acc.position = req.body.position;

		// let profile = {
		// 	industry: industry,
		// 	location: location,
		// 	status: status,
		// 	mood: mood,
		// 	position: position
		// };

		// acc.profile = profile;
		await acc.save();

		res.status(200).send({
			status: 'success',

		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			error: '',
		});
	}
});

// list of status provided by client
router.get('/listStatus',async(req,res) => {
	try{
let status = [
	'Married',
	'Married to Work',
	'Single & searching',
	'Open Relationship',
	'Single & Skeptical',
	'Lord Status'
]

res.send({
	status:"success",
	message:status
})
	}
	catch(err){
		console.log(err.message)
		res.send({
			status:"fail",
			message:"Internal server error"
		})
	}
})

//list of mood provided by client
router.get('/listMood',async(req,res) => {
	try{
let status = [
	'Narcisstic',
	'Happy',
	'Melancholic',
	'Sad',
	'Fabulous',
	'Powerful',
	'Introverted',
	'Romantic',
	'Idyllic',
	'Bubbly',
	'Lonely',
	'Mentally Abused',
	'Courageous',
	'Sleepy',
	'Russian Roullette',
	'Insomniac',
	'Contemplative',
	'Clueless',
	'Social Butterfly',
	'Work-social butterfly',
	'Spontaneous',
	'Anxious',
	'Deal-Maker',
	'Rain-Maker',
	'Paradoxical',
	'At Peak Performance',
	'Humorous',
	'Cheerful',
	'Calm',
	'Fearful',
	'Optimistic',
	'Sexy',
	'Hypochondriac',
	'Content',
	'Disgusted',
	'Gambling Mood',
	'Unstoppable',
	'Cocky',
	'Self-Reliant',
]

res.send({
	status:"success",
	message:status
})
	}
	catch(err){
		console.log(err.message)
		res.send({
			status:"fail",
			message:"Internal server error"
		})
	}
})

//Fetch Group list with  member details (include business details) of  the user
router.get('/listGroup', async(req,res) => {
	try{
		let { id } = req.query
		// let group = await groupsModel.find({_id : id})
		// console.log("group", group)

		let user = await accountsModel.find({_id:id})
		// console.log("user", user)
		
		let group = await groupsModel.find({group_members: {"$in": [id]}})
		console.log("group", group[0].group_image)
 
		let detail = []
		let businessData
		let userData
		let arrs = []

		await group.forEachAsync(async key => {
			groupId_test = key._id
            let arr = []
			await key.group_members.forEachAsync(async _key => {
				memberId_test = _key

				let userMember = await accountsModel.find({_id:_key})

				businessData = await businessModel.find({user_email:userMember[0].email})
				 userData = { 
					// group:groupId_test,
					 memberId:userMember[0]._id,
					 memberName:userMember[0].name,
					 memberImage:userMember[0].profileImage,
					 member_businessDetails: businessData[0]  ?businessData[0]: null
				 }
				//  console.log("userData",userData)
				  detail.push(userData)
				  arr.push(userData)
				//  console.log("detail----------",detail)
			})
           const testJSON = {
			   group:key,
			   member_details:arr 	
		   }
		   arrs.push(testJSON)
		})
		res.send({
			status:"success",
			groups:arrs
			// groupMemberDetails: detail
		})
	}
	catch(err){
		console.log(err.message)
		res.send({
			status:"fail",
			message:"Internal server error"
		})
	}
})



module.exports = router;

