const Web3 = require('web3');
const express = require('express');
const router = express.Router();
const tokenVerification = require('../lib/jwt');
const db = require('../lib/db');
const eth = require('../lib/eth');
const crypto = require('../lib/crypto/crypto');
const btc = require('../lib/btc');
const requesti = require('../lib/network')
const request = require('request');
const config = require('../config');
const path = require('path');
const fileUpload = require('express-fileupload');
const walletModel = require('../models/wallets');
const orderModel = require('../models/orders')
const whitelistModel = require('../models/whitelist');
const web3 = new Web3();
const WalletFactory = require('../lib/wallet').WalletFactory
const walletFactory = new WalletFactory(config.wallet.mnemonics, config.wallet.password, config.wallet.network)
const web3Provider = new Web3(new Web3.providers.HttpProvider(config.wallet.provider))
const addressValidator = require('multicoin-address-validator');
const accountsModel = require('../models/accountsModel');
const transactionHistoriesModel = require('../models/TransactionHistories');
const requestPromise = require('request-promise');
let settingsModel = require('../models/settings');
let bankAccountModel = require('../models/bankAccount');
let bankCardModel = require('../models/bankCard');
const feeModel = require('../models/fees')
const cryptos = require('crypto');
require('array-foreach-async');
const controller = require('../controllers/detaliRouteController');
var speakeasy = require('speakeasy');
var QRCode = require('qrcode');
const usageStaticsModel = require('../models/usageStatistics');
const requestIp = require('request-ip');
// validate Engine:
const body = require('express-validator').body;
const header = require('express-validator').header;
const query = require('express-validator').query;
const validationResult = require('express-validator').validationResult;
const marketInfoModel = require('../models/marketInfo');
require('dotenv').config()
let invoiceModel = require('../models/invoice')

async function getWallet(ref) {
	let extendedKey = walletFactory.calculateBip44ExtendedKey(ref, true);
	let privKey = extendedKey.keyPair.d.toBuffer(32);
	//    console.log("privKey", "0x" + privKey.toString("hex"))
	return "0x" + privKey.toString("hex");
}

const validate = routeName => {
	switch (routeName) {
		case 'sell':
			return [
				body('amount').exists().notEmpty(),
				body('crypto').exists().notEmpty()
			];

		case 'buy':
			return [
				body('amount').exists().notEmpty(),
				body('crypto').exists().notEmpty()
			];

		case 'send':
			return [
				body('to').exists().notEmpty(),
				body('currency').exists().notEmpty(),
				body('value').exists().notEmpty()
			];

		case 'topUp':
			return [
				body('amount').exists().notEmpty(),
				body('txnId').exists().notEmpty()
			];

		case 'withdraw':
			return [
				body('amount').exists().notEmpty(),
				body('type').exists().notEmpty(),
				body('authCode').exists().notEmpty()
			];

		case 'cancelWithdraw':
			return [
				body('txnId').exists().notEmpty()
			];

	}
};

router.use((req, res, next) => {
	let ip = requestIp.getClientIp(req);
	if (String(ip).slice(0, 7) == '::ffff:') {
		console.log(String(ip).slice(0, 7));
		ip = String(ip).slice(7);
	}
	req.userData = { ip: '' };
	req.userData.ip = ip;
	next();
});

router.use(tokenVerification);


router.post('/new', async (req, res) => {

	try {

		res.status(200).send({
			status: "success"
		})

	} catch (error) {

		res.status(200).send({
			status: "fail"
		})

	}

})



// T O P U P  [FILE SERVICE]
router.post('/topUp', validate('topUp'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(200).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}

	let profile = await accountsModel.findOne({ email: req.user.email }).lean().exec();


	try {
		let { amount, txnId } = req.body;

		let txHistory = await transactionHistoriesModel.find({ email: req.user.email })
		txHistory.forEach(res => {
			if (res.txHash == req.body.txnId) {
				return res.status(200).send({
					status: "fail",
					message: "Duplicate txnHash Found",
					error: ""
				})
			}
		});

		var file_id1 = req.files.txnReceipt
		var data_id1 = req.files.txnReceipt.data
		var fileName_id1 = req.files.txnReceipt.name
		var contentType_id1 = req.files.txnReceipt.mimetype

		await requestPromise.post({
			url: config.services.fileService + '/uploadTxnReceipt',
			formData: {
				id_1: {
					value: data_id1,
					options: {
						filename: fileName_id1,
						contentType: contentType_id1
					}
				},
				email: req.user.email,
				type: "txnReceipt" + String(txnId)
			},
		})


		await transactionHistoriesModel.create({
			email: req.user.email,
			ref: req.user.ref,
			from: req.user.id,
			to: req.user.id,
			source: "USD",
			target: "USD",
			sourceAmount: amount,
			targetAmount: amount,
			type: 'topups',
			currency: "USD",
			status: 'pending',
			fee: 0,
			txHash: txnId,
		});

		requesti.post(config.services.emailService + '/sendTopupEmail', {
			type: "You have topup the purecoin account with " + String(req.body.amount) + String(profile.localCurrency),
			email: req.user.email
		})

		let a = await transactionHistoriesModel.find();

		let ip = req.userData.ip;

		let data = await requestPromise.get(`https://api.ipgeolocationapi.com/geolocate/${ip}`, {
			method: 'GET',
			json: true,

		});
		console.log("IP", data.toString())
		data.toString();

		let location = data.name

		await usageStaticsModel.create({
			email: req.user.email,
			timestamp: new Date().toUTCString(),
			action: 'topup',
			ip: req.userData.ip,
			status: 'success',
			location: location,
			extraData2: '',
			extraData3: '',
		});

		res.status(200).send({
			status: 'success',
			message: 'Pending',
		});
	} catch (error) {
		await usageStaticsModel.create({
			email: req.user.email,
			timestamp: new Date().toUTCString(),
			action: 'topup',
			ip: req.userData.ip,
			status: 'fail',
			reason: 'topup failed',
			extraData2: '',
			extraData3: '',
		});
		console.log('error-/topUp', error);
		res.status(200).send({
			status: 'Fail',
			message: 'Error Occurred',
			error: 'error',
		});
	}

});

// W I T H D R A W
router.post('/withdraw', validate('withdraw'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(200).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}


	try {

		console.log("afsopadfgvsd", req.body)
		let { amount, type, authCode } = req.body;

		let feeInfo = await feeModel.findOne({}).lean().exec()

		let accountsInfos = await accountsModel.findOne({ email: req.user.email }).lean().exec()

		// localCurrency & check w.r.t fee
		let localCurrency = accountsInfos.localCurrency
		console.log("LOCAL:", localCurrency)

		let newFee = Number(feeInfo[localCurrency].withdrawFee)

		console.log("newFee", newFee)

		let payoutProfit = Number(amount) * Number(newFee) / 100

		amount = Number(amount) - Number(payoutProfit)

		console.log("423423432", amount)

		let profile = await accountsModel.find({ email: req.user.email });

		console.log('fsdafs', profile);

		if (Number(req.body.amount) > Number(profile[0].fiatBalance)) {
			return res.status(200).send({
				status: "Fail",
				message: "Balance Is Low"
			})
		}

		let originalAmount = Number(profile[0].fiatBalance) - (Number(req.body.amount) + payoutProfit)
		// originalAmount = Number(profile[0].fiatBalance) - Number(originalAmount)

		if (Number(originalAmount) < 0) {
			return res.status(200).send({
				status: "Fail",
				message: "Insufficient Balance"
			})
		}


		if (1) {
			// available amount to be shown


			let debitAmount = 0;
			let depositAmount = 0;
			let total = 0;
			let buyAmount = 0;
			let sellAmount = 0;
			let hash = cryptos.randomBytes(20).toString('hex');


			let acc = await accountsModel.find({ email: req.user.email });

			if (type == 'gCode' && acc[0].auth2 == true) {

				if (acc[0].auth2 == false) {
					return res.status(200).send({
						status: "Fail",
						message: "Google Authentication Not Enabled"
					})
				}
				console.log("1")
				let verified = speakeasy.totp.verify({
					secret: acc[0].secret,
					encoding: 'base32',
					token: authCode,
				});

				if (verified == false) {
					return res.status(200).send({
						status: "Fail",
						message: "Google Authentication Code Expired"
					})
				}

				console.log("2", verified)
				if (verified) {
					var set = await settingsModel.find({}).lean().exec();
					console.log("3")
					if (
						amount <= Number(acc[0].fiatBalance) &&
						amount <= Number(set[0].withdraw_limit) &&
						amount >= Number(set[0].min_withdraw)
					) {
						await transactionHistoriesModel.create({
							email: req.user.email,
							ref: req.user.ref,
							from: req.user.id,
							to: req.user.id,
							source: "USD",
							target: "USD",
							sourceAmount: req.body.amount,
							targetAmount: req.body.amount,
							type: 'withdraws',
							currency: "U",
							status: 'pending',
							payOutProfit: payoutProfit,
							txHash: hash,
						});

						let a = await transactionHistoriesModel.find();
						// console.log("HIST", a)

						let ip = req.userData.ip;

                        let data = await requestPromise.get(`https://api.ipgeolocationapi.com/geolocate/${ip}`, {
                            method: 'GET',
                            json: true,

                        });
                        console.log("IP", data.toString())
                        data.toString();

                        let location = data.name

						await usageStaticsModel.create({
							email: req.user.email,
							timestamp: new Date().toUTCString(),
							action: 'withdraw',
							ip: req.userData.ip,
							status: 'success',
							location: location,
							extraData2: '',
							extraData3: '',
						});

						return res.status(200).send({
							status: 'success',
							message: 'Pending',
						});
					} else if (amount <= Number(acc[0].fiatBalance) &&
						amount < Number(set[0].min_withdraw)) {
						return res.status(200).send({
							status: 'Fail',
							message: 'Minimum Withdraw Amount Should Be 200',
						});
					}
					else if (amount > Number(set[0].withdraw_limit)) {
						return res.status(200).send({
							status: 'Fail',
							message: 'Withdraw Limit Exceeded',
						});
					}
				}
			}
			else if (type == 'gCode' && acc[0].auth2 == false) {

				let verified = false
				let userData = cache.getAlive("otp_verify", req.user.email)
				console.log("USER_DATA:", userData, authCode)
				if (userData == null) {
					return res.status(200).send({
						status: "fail",
						message: "OTP Expired"
					})
				}
				if (authCode == userData['otp']) { // remove second condition // TODO
					delete userData['otp']
					delete userData['expired']

					delete userData.meta
					delete userData['$loki']
					verified = true
					cache.remove("otp_verify", req.user.email)
				}

				if (verified) {
					var set = await settingsModel.find({}).lean().exec();
					console.log("3")
					if (
						amount <= Number(acc[0].fiatBalance) &&
						amount <= Number(set[0].withdraw_limit) &&
						amount >= Number(set[0].min_withdraw)
					) {
						await transactionHistoriesModel.create({
							email: req.user.email,
							ref: req.user.ref,
							from: req.user.id,
							to: req.user.id,
							source: profile[0].localCurrency,
							target: profile[0].localCurrency,
							sourceAmount: req.body.amount,
							targetAmount: req.body.amount,
							type: 'withdraws',
							currency: profile[0].localCurrency,
							status: 'pending',
							payOutProfit: payoutProfit,
							txHash: hash,
						});

						let a = await transactionHistoriesModel.find();
						// console.log("HIST", a)

						let ip = req.userData.ip;

                        let data = await requestPromise.get(`https://api.ipgeolocationapi.com/geolocate/${ip}`, {
                            method: 'GET',
                            json: true,

                        });
                        console.log("IP", data.toString())
                        data.toString();

                        let location = data.name

						await usageStaticsModel.create({
							email: req.user.email,
							timestamp: new Date().toUTCString(),
							action: 'withdraw',
							ip: req.userData.ip,
							status: 'success',
							location: location,
							extraData2: '',
							extraData3: '',
						});

						return res.status(200).send({
							status: 'success',
							message: 'Pending',
						});
					} else if (amount <= Number(acc[0].fiatBalance) &&
						amount < Number(set[0].min_withdraw)) {
						return res.status(200).send({
							status: 'Fail',
							message: 'Minimum Withdraw Amount Should Be 200',
						});
					}
					else if (amount > Number(set[0].withdraw_limit)) {
						return res.status(200).send({
							status: 'Fail',
							message: 'Withdraw Limit Exceeded',
						});
					}
				}

			}
			else {

				return res.status(200).send({
					status: 'Fail',
					message: 'Authentication failed',
				});
			}
		} else {
			return res.status(200).send({
				status: 'fail',
				message: 'Profile not configured',
				error: 'err',
			});
		}


	}
	catch (error) {
		console.log("ERROR:", error)
		return res.status(200).send({
			status: 'Fail',
			message: 'Internal Server Error',
		});
	}


});



// S E L L
router.post('/sell', validate('sell'), async (req, res, next) => {
	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(200).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}

	let fee = await feeModel.findOne({})
	var Info = await marketInfoModel.findOne({});
	let status = await settingsModel.find({});
	let profile = await accountsModel.find({email:req.user.email});



	if (status[0].sell == true ) {
		let email = req.user.email;
		// let pin = req.body.pin;
		let ref = req.user.ref;

		// let {
		// 	to,
		// 	currency,
		// 	value,
		// 	type,
		// 	extraId,
		// } = req.body;
		let extraId;
		var to;


		if (req.body.crypto.toLowerCase() == 'btc') {

			to = config.admin.btcaddress

		}
		else {
			let ref = Number(config.wallet.ref)
			let wallet = web3.eth.accounts.wallet //.create(0)
			wallet.clear()
			wallet = wallet.create(0)
			wallet.add(await getWallet(ref))
			to = wallet[0].address;
		}

		let amount = req.body.amount; //amount to tokens
		let crypto_ = req.body.crypto;

		let newtargetAmount;
		let newAmount;

		let feeIn = Number(fee[crypto_.toUpperCase()].sellFee) / Number('100')
		// let newAmount = Number(amount) - (Number(amount)*Number(feeIn))

		// converting crypto to USD
		newtargetAmount = Number(amount) * Number(Info[crypto_.toUpperCase()].price)

		// getting the deducted amt in aed
		targetAmount = Number(newtargetAmount) - (Number(newtargetAmount) * Number(feeIn))

		console.log("1 CRYPTO to USD", Number(Info[crypto_.toUpperCase()].price), "CRYPTO * USD", newtargetAmount, targetAmount)

		// // convert the deducted amt to crypto
		// amount = Number(amount)*Number(Info[crypto_.toUpperCase()].FromUSD)


		targetAmount = targetAmount.toFixed(5)


		// let marketData = await controller.getMarketConvertData(amount, crypto_, 'USD');
		// let targetAmount;
		// if (marketData.data != 'error' && marketData.data != undefined) {
		// 	targetAmount = marketData.data.quote['USD'].price;
		// }

		console.log('sfaasfasfasfafs', targetAmount);

		let wallet = await walletModel.find({email:req.user.email});
		console.log('CRYPTO:', wallet[0][crypto_.toLowerCase()].balance);

		if (Number(amount) <= Number(wallet[0][crypto_.toLowerCase()].balance)) {
			if (to.slice(0, 8) == 'ethereum') {
				to = to.slice(9);
				console.log('to:', to);
			}
			try {
				let acc = await accountsModel.find({email:req.user.email});

				if ((await checkReceiver(to, crypto_.toLowerCase())) == false) {
					res.status(200).send({
						status: 'fail',
						message: 'Invalid Address',
						error: 'nil',
					});
					return;
				}
				//disabled kyc verification
				//if(resultFromDb.error == 'nil' && resultFromDb.message != (undefined || null || 'nil' || '')){
				//check pin && kyc status

				/*         if(!isAddressValid(currency, to)){
                        res.status(200).send({
                            status: 'fail',
                            message: 'Invalid Address',
                            error: 'nil'
                        })
                        return
                    } */
				if (acc[0].email == req.user.email) {
					//&& resultFromDb.message.kycStatus == 'confirmed'){
					// console.log('acc', acc[0].pin);
					let wallets = await walletModel
						.findOne({email:req.user.email})
						.lean()
						.exec();

					//note to future self :P - sorry for nested IFs, ELSEs. Have to send different responses.
					if (Number(wallets[crypto_.toLowerCase()].balance) > Number(amount)) {
						console.log('kgbjhfhyhfghhdf');
						try {
							crypto.transferCryptos(
								to,
								amount,
								crypto_.toLowerCase(),
								ref,
								req,
								res,
								extraId,
								targetAmount
							);

							let ip = req.userData.ip;

							let data = await requestPromise.get(`https://www.iplocate.io/api/lookup/${ip}`, {
								method: 'GET',
								json: true,
							});

							data.toString();

							let location = data.city + ',' + data.country;

							await usageStaticsModel.create({
								email: req.user.email,
								timestamp: new Date().toUTCString(),
								action: 'sell',
								ip: req.userData.ip,
								status: 'success',
								location: location,
								extraData2: '',
								extraData3: '',
							});
						} catch (error) {
							console.log('fsre', error);
						}
					} else {
						await usageStaticsModel.create({
							email: req.user.email,
							timestamp: new Date().toUTCString(),
							action: 'sell',
							ip: req.userData.ip,
							status: 'fail',
							reason: 'Not enough balance',
							extraData2: '',
							extraData3: '',
						});
						res.status(200).send({
							status: 'fail',
							message: 'Not Enough Balance',
							error: 'nil',
						});
						return;
					}
				} else {
					//disabled kyc verification
					res.send({
						status: 'fail',
						message: 'Permission Denied',
						error: 'nil',
					});
				}
			} catch (error) {
				res.status(200).send({
					status: 'Fail',
					message: 'Internal_server_error',
					error: 'error',
				});
			}
		}
		else {
			return res.status(200).send({
				status: "fail",
				message: "Low Balance"
			})
		}
	} else {
		res.status(200).send({
			status: 'fail',
			message: 'profile not configured Or user is blocked',
			error: 'err',
		});
	}
});

// S E N D 
router.post('/send', validate('send'), async (req, res, next) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(200).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}


	if(Number(req.body.value) == 0){
		return res.status(200).send({
		status: 'fail',
		message: 'Please enter an amount',
		error: 'nil',
		});
		return;
	}

	let status = await settingsModel.find({});
	let profile = await accountsModel.find({ email: req.user.email });

	console.log('req', req.body);

	if (status[0].send == true) {
		let email = req.user.email;
		// let pin = req.body.pin;
		let ref = req.user.ref;

		let {
			to,
			currency,
			value,
			type,
			extraId,
		} = req.body;
		
		if (String(to).toLowerCase() == String(req.user.wallets[currency]).toLowerCase()) {
			return res.status(200).send({
				status: 'fail',
				message: 'Cannot send to same account',
				error: 'nil',
			});
			return;
		}

		var Info = await marketInfoModel.findOne({}).lean();
		let minimunprice = Number(Info[String(currency).toUpperCase()].price)
		console.log("minimunprice",minimunprice)
		// if(Number(req.body.value)*Number(minimunprice) < status[0].minimunusd){
		// 	return res.status(200).send({
		// 	status: 'fail',
		// 	message: 'USD equalent value should be greater than ' + status[0].minimunusd + "USD",
		// 	error: 'nil',
		// 	});
		// 	return;
		// }

		currency = currency.toLowerCase();

		if (to.slice(0, 8) == 'ethereum') {
			to = to.slice(9);
			console.log('to:', to);
		}
		try {
			let acc = await accountsModel.find({email: req.user.email });

			if ((await checkReceiver(to, currency)) == false) {
				res.status(200).send({
					status: 'fail',
					message: 'Invalid Addresss',
					error: 'nil',
				});
				return;
			}
			console.log('new', await checkWhiteList(req.user.email, to, currency));

			if (acc[0].whitelist == true) {
				if ((await checkWhiteList(req.user.email, to, currency)) == false) {
					//console.log("newwwwww")
					res.status(200).send({
						status: 'fail',
						message: 'Address not in white list',
						error: 'nil',
					});
					return;
				}
				if (acc[0].email == req.user.email) {
					//&& resultFromDb.message.kycStatus == 'confirmed'){
					// console.log('acc', acc[0].pin);
					let wallets = await walletModel
						.findOne({email:req.user.email})
						.lean()
						.exec();
						if(currency == 'eth'){
							wallets[currency].balance = web3Provider.utils.fromWei(wallets[currency].balance)
						}
					//note to future self :P - sorry for nested IFs, ELSEs. Have to send different responses.
					console.log('BALANCE', wallets[currency].balance);
					if (Number(wallets[currency].balance) > Number(value)) {

						// requesti.post(config.services.emailService + '/sendTransactionEmail', {
						// 	type: "Send",
						// 	from: wallets[currency].address,
						// 	to: to,
						// 	source: String(value) + String(currency.toUpperCase()),
						// 	target: String(value) + String(currency.toUpperCase()),
						// 	email: req.user.email
						// })

						crypto.transferCrypto(to, value, currency, ref, req, res, extraId);

						let ip = req.userData.ip;

						let data = await requestPromise.get(`https://www.iplocate.io/api/lookup/${ip}`, {
							method: 'GET',
							json: true,
						});

						data.toString();

						let location = data.city + ',' + data.country;

						await usageStaticsModel.create({
							email: req.user.email,
							timestamp: new Date().toUTCString(),
							action: 'send',
							ip: req.userData.ip,
							status: 'success',
							location: location,
							extraData2: '',
							extraData3: '',
						});
					} else {
						await usageStaticsModel.create({
							email: req.body.email,
							timestamp: new Date().toUTCString(),
							action: 'send',
							ip: req.userData.ip,
							status: 'fail',
							reason: 'Send failed',
							extraData2: '',
							extraData3: '',
						});

						res.status(200).send({
							status: 'fail',
							message: 'Not Enough Balance',
							error: 'nil',
						});
						return;
					}
				} else {
					//disabled kyc verification
					res.send({
						status: 'fail',
						message: 'Permission Denied',
						error: 'nil',
					});
				}
			} else {
				if (acc[0].email == req.user.email) {
					//&& resultFromDb.message.kycStatus == 'confirmed'){
					// console.log('acc', acc[0].pin);
					let wallets = await walletModel
						.findOne({email:req.user.email})
						.lean()
						.exec();
						console.log("Balance",wallets[currency].balance )
					//note to future self :P - sorry for nested IFs, ELSEs. Have to send different responses.
					if(currency == 'eth'){
						wallets[currency].balance = web3Provider.utils.fromWei(wallets[currency].balance)
					}
					//console.log("balance",wallets[currency].balance)
					
					
					if (Number(wallets[currency].balance) > Number(value)) {

						// requesti.post(config.services.emailService + '/sendTransactionEmail', {
						// 	type: "Send",
						// 	from: wallets[currency].address,
						// 	to: to,
						// 	source: String(value) + String(currency.toUpperCase()),
						// 	target: String(value) + String(currency.toUpperCase()),
						// 	email: req.user.email
						// })
						console.log('before transferCrypto')
						crypto.transferCrypto(to, value, currency, ref, req, res, extraId);

						let ip = req.userData.ip;

						let data = await requestPromise.get(`https://www.iplocate.io/api/lookup/${ip}`, {
							method: 'GET',
							json: true,
						});

						data.toString();

						let location = data.city + ',' + data.country;

						await usageStaticsModel.create({
							email: req.user.email,
							timestamp: new Date().toUTCString(),
							action: 'send',
							ip: req.userData.ip,
							status: 'success',
							location: location,
							extraData2: '',
							extraData3: '',
						});
					} else {
						await usageStaticsModel.create({
							email: req.user.email,
							timestamp: new Date().toUTCString(),
							action: 'send',
							ip: req.userData.ip,
							status: 'fail',
							reason: 'Send failed',
							extraData2: '',
							extraData3: '',
						});

						res.status(200).send({
							status: 'fail',
							message: 'Not Enough Balance',
							error: 'nil',
						});
						return;
					}
				} else {
					//disabled kyc verification
					res.send({
						status: 'fail',
						message: 'permission_denied',
						error: 'nil',
					});
				}
			}

			console.log('new1');
			//disabled kyc verification
			//if(resultFromDb.error == 'nil' && resultFromDb.message != (undefined || null || 'nil' || '')){
			//check pin && kyc status

			/*         if(!isAddressValid(currency, to)){
                        res.status(200).send({
                            status: 'fail',
                            message: 'Invalid Address',
                            error: 'nil'
                        })
                        return
                    } */
		} catch (error) {
			res.status(200).send({
				status: 'fail',
				message: 'Internal_server_error',
				error: 'error',
			});
		}
	} else {
		res.status(200).send({
			status: 'fail',
			message: 'profile not configured Or user is blocked',
			error: 'err',
		});
	}
});


router.post('/txH', async (req, res) => {
	try {
		query1.push({
			type: 'buy',
		});

		query1.push({
			type: 'sell',
		});

		let buySell = await TransactionModel.aggregate([
			{
				$match: {
					$or: query1,
				},
			},
			{
				$project: {
					_id: 1,
					fiatAmount: 1,
					fiatCurrency: 1,
					sourceAmount: 1,
					source: 1,
					type: 1,
					status: 1,
					timestamp: 1,
				},
			},
		]);

		res.send({
			status: 'success',
			message: '',
			// sendHistory: send,
			// receiveHistory: receive,
			buySellHistory: buySell,
			// sellHistory: sell,
			// topupHistory: topups,
			// withdrawHistory: withdraws,
			error: 'nil',
		});
	} catch (error) { }
});

router.post('/getTxHistory', async (req, res) => {
	try {
		let query1 = [];
		query1.push({
			type: 'buy',
		});

		query1.push({
			type: 'sell',
		});

		let buySell = await transactionHistoriesModel.aggregate([
			{
				$match: {
					$or: query1,
					email: req.user.email,
				},
			},
			{
				$project: {
					sourceAmount: 1,
					source: 1,
					targetAmount: 1,
					target: 1,
					type: 1,
					status: 1,
					timestamp: 1,
					txHash: 1,
				},
			},
		]);

		let topup = await transactionHistoriesModel.aggregate([
			{
				$match: {
					$and: [{ type: 'topups' }, { email: req.user.email }],
				},
			},
			{
				$project: { sourceAmount: 1, target: 1, targetAmount: 1, type: 1, status: 1, timestamp: 1 },
			},
		]);

		let send = await transactionHistoriesModel.aggregate([
			{
				$match: {
					$and: [{ type: 'send' }, { email: req.user.email }],
				},
			},
			{
				$project: {
					_id: 1,
					source: 1,
					sourceAmount: 1,
					targetAmount: 1,
					type: 1,
					status: 1,
					timestamp: 1,
					to: 1,
					txHash: 1,
				},
			},
		]);

		let receive = await transactionHistoriesModel.aggregate([
			{
				$match: {
					$and: [{ type: 'received' }, { email: req.user.email }],
				},
			},
			{
				$project: {
					_id: 1,
					source: 1,
					sourceAmount: 1,
					targetAmount: 1,
					type: 1,
					status: 1,
					timestamp: 1,
					from: 1,
					txHash: 1,
				},
			},
		]);

		let withdraws = await transactionHistoriesModel.aggregate([
			{
				$match: {
					$and: [{ type: 'withdraws' }, { email: req.user.email }],
				},
			},
			{
				$project: { _id: 1, sourceAmount: 1, target: 1, targetAmount: 1, type: 1, status: 1, timestamp: 1 },
			},
		]);

		res.send({
			status: 'success',
			message: '',
			sendHistory: send,
			receiveHistory: receive,
			buySellHistory: buySell,
			// sellHistory: sell,
			topupHistory: topup,
			withdrawHistory: withdraws,
			error: 'nil',
		});
	} catch (error) {
		console.log(error);
		res.status(200).send({
			status: 'fail',
			message: 'error_occured',
			error: 'error',
		});
	}
});

router.post('/checkAddress', async (req, res) => {
	let {
		currency,
		address,
	} = req.body;
	let isValid;
	try {
		//let isValid = isAddressValid(currency, address)
		isValid = await checkReceiver(address, currency);
		res.send({
			status: 'success',
			isValid: isValid,
			error: 'nil',
		});
	} catch (err) {
		console.log(err.message);
		res.status(200).send({
			status: 'fail',
			isValid: isValid,
			error: 'error',
		});
	}
});

router.use(fileUpload());

async function getUserWallet(_email, _currency) {
	let user = await db.readFromDBAsync(
		{
			email: _email,
		},
		'accounts'
	);

	if (user.status == 'success' && user.message != null) {
		return user.message.wallets[_currency];
	} else {
		return null;
	}
}

async function checkReceiver(to, _currency) {
	let emailFormat = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.])+\.([a-zA-Z]{2,5})/;
	if (emailFormat.test(to)) {
		console.log('is email');
		let result = await accountsModel
			.findOne({
				email: to,
			})
			.lean()
			.exec();
		console.log("asdasdads", result);

		if (result == null) {
			console.log("NULLL")
			return false;
		} else {
			console.log("TRUEEEE")
			return true;
		}
	} else {
		return await isAddressValid(_currency, to);
	}
}


async function checkWhiteList(from, to, _currency) {
	let result = await whitelistModel.find({ $and: [{ address: { $in: to } }, { coin: _currency.toUpperCase() }] });

	if (result.length > 0) {
		return true;
	} else {
		return false;
	}
}

async function getUser(_email) {
	let user = (await db.readFromDBAsync(
		{
			email: _email,
		},
		'accounts'
	)).message;
	return user;
}

//btc bc1qqzpn8eum60ryjy54dx9gj39a5f554uul4wl2y6

console.log('test', addressValidator.validate('bc1qqzpn8eum60ryjy54dx9gj39a5f554uul4wl2y6', 'btc'))
//addressValidator.validate()
isAddressValid('usdt', '0xa45cc0e618bb490b264c66f76ec09bcfa081ae4c').then(res => {
	console.log('testAddressValidity', res)
	console.log('test', addressValidator.validate('0xa45cc0e618bb490b264c66f76ec09bcfa081ae4c', 'eth'))
})
async function isAddressValid(currency, address) {
	if (address.slice(0, 6) == 'bchreg') address = address.slice(7);

	console.log(currency, address);

	try {
		switch (currency) {
			case 'eth':
				return web3.utils.checkAddressChecksum(address);
			case 'mybiz':
				return web3.utils.checkAddressChecksum(address);
			case 'usdt':
				return web3.utils.checkAddressChecksum(address);
			case 'btc':
				return addressValidator.validate(address, currency /*, config.wallet[currency].network*/);

			default:
				return false;
		}
	} catch (error) {
		return false
	}
}

// B U Y 
router.post('/buy', async (req, res, next) => {

	let { sourceAmount, currency, address, paymentMethod, firstName, lastName, state, postalCode, city, street, email, phone, country } = req.body

	let accs = await accountsModel.findOne({email:req.user.email}).lean().exec()

	var destinationAddress;

	if(currency == 'ETH'){
		destinationAddress = "ethereum:"+address
	}
	else if (currency == 'BTC'){
		destinationAddress = "btc:"+address
	}
	else if ( currency == 'USDT'){
		destinationAddress = "tether:"+adddress
	}else{
		throw("Currency Invalid")
		return
	}

	try {

				// firstName: firstName ,
				// lastName: lastName,
				// state: state,
				// postalCode: postalCode,
				// city: city,
				// email: email,
				// phone: phone,
				// country: country,
				// street1: street,


		let result = await requestPromise.post({
			url: config.services.wyreService + '/walletOrderReserve',
			method:"POST",
			body:{
				sourceCurrency:"USD",
				sourceAmount:sourceAmount,
				destCurrency: currency,
				amountIncludeFees: true,
				dest: destinationAddress,
				paymentMethod: paymentMethod,//"debit-card,apple-pay"
				country: country,
			},
			json: true
		})


		if(result.result == true){

			await accountsModel.updateOne({email:accs.email},
				{
					$set: {
					  fiatBalance:Number(accs.fiatBalance)-Number(sourceAmount)
					} 
				},{
					upsert:true
				}
			);

			await orderModel.create({
				email:accs.email,
				reservation:result.reservation,
				orderId:'',
				orderStatus:'',
				transferId:'',
				failedReason:'',
				error:''
			});

			console.log("24324234",result)

			return res.json({
				status:"Success",
				result:result
			})

		}

	} catch (error) {
		console.log("ERRRO",error)
		res.status(200).send({
			status:"Fail",
			error:error
		})
	}

});

// T O P U P  [FILE SERVICE]
router.post('/topUp', validate('topUp'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(200).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}

	let profile = await accountsModel.findOne({ email: req.user.email }).lean().exec();


	try {
		let { amount, txnId } = req.body;

		let txHistory = await transactionHistoriesModel.find({ email: req.user.email })
		txHistory.forEach(res => {
			if (res.txHash == req.body.txnId) {
				return res.status(200).send({
					status: "fail",
					message: "Duplicate txnHash Found",
					error: ""
				})
			}
		});

		var file_id1 = req.files.txnReceipt
		var data_id1 = req.files.txnReceipt.data
		var fileName_id1 = req.files.txnReceipt.name
		var contentType_id1 = req.files.txnReceipt.mimetype

		await requestPromise.post({
			url: config.services.fileService + '/uploadTxnReceipt',
			formData: {
				id_1: {
					value: data_id1,
					options: {
						filename: fileName_id1,
						contentType: contentType_id1
					}
				},
				email: req.user.email,
				type: "txnReceipt" + String(txnId)
			},
		})


		await transactionHistoriesModel.create({
			email: req.user.email,
			ref: req.user.ref,
			from: req.user.id,
			to: req.user.id,
			source: "USD",
			target: "USD",
			sourceAmount: amount,
			targetAmount: amount,
			type: 'topups',
			currency: "USD",
			status: 'pending',
			fee: 0,
			txHash: txnId,
		});

		requesti.post(config.services.emailService + '/sendTopupEmail', {
			type: "You have topup the purecoin account with " + String(req.body.amount) + String(profile.localCurrency),
			email: req.user.email
		})

		let a = await transactionHistoriesModel.find();

		let ip = req.userData.ip;

		let data = await requestPromise.get(`https://api.ipgeolocationapi.com/geolocate/${ip}`, {
			method: 'GET',
			json: true,

		});
		console.log("IP", data.toString())
		data.toString();

		let location = data.name

		await usageStaticsModel.create({
			email: req.user.email,
			timestamp: new Date().toUTCString(),
			action: 'topup',
			ip: req.userData.ip,
			status: 'success',
			location: location,
			extraData2: '',
			extraData3: '',
		});

		res.status(200).send({
			status: 'success',
			message: 'Pending',
		});
	} catch (error) {
		await usageStaticsModel.create({
			email: req.user.email,
			timestamp: new Date().toUTCString(),
			action: 'topup',
			ip: req.userData.ip,
			status: 'fail',
			reason: 'topup failed',
			extraData2: '',
			extraData3: '',
		});
		console.log('error-/topUp', error);
		res.status(200).send({
			status: 'Fail',
			message: 'Error Occurred',
			error: 'error',
		});
	}

});

// W I T H D R A W
router.post('/withdraw', validate('withdraw'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(200).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}


	try {

		console.log("afsopadfgvsd", req.body)
		let { amount, type, authCode } = req.body;

		let feeInfo = await feeModel.findOne({}).lean().exec()

		let accountsInfos = await accountsModel.findOne({ email: req.user.email }).lean().exec()

		// localCurrency & check w.r.t fee
		let localCurrency = accountsInfos.localCurrency
		console.log("LOCAL:", localCurrency)

		let newFee = Number(feeInfo[localCurrency].withdrawFee)

		console.log("newFee", newFee)

		let payoutProfit = Number(amount) * Number(newFee) / 100

		amount = Number(amount) - Number(payoutProfit)

		console.log("423423432", amount)

		let profile = await accountsModel.find({ email: req.user.email });

		console.log('fsdafs', profile);

		if (Number(req.body.amount) > Number(profile[0].fiatBalance)) {
			return res.status(200).send({
				status: "Fail",
				message: "Balance Is Low"
			})
		}

		let originalAmount = Number(profile[0].fiatBalance) - (Number(req.body.amount) + payoutProfit)
		// originalAmount = Number(profile[0].fiatBalance) - Number(originalAmount)

		if (Number(originalAmount) < 0) {
			return res.status(200).send({
				status: "Fail",
				message: "Insufficient Balance"
			})
		}


		if (1) {
			// available amount to be shown


			let debitAmount = 0;
			let depositAmount = 0;
			let total = 0;
			let buyAmount = 0;
			let sellAmount = 0;
			let hash = cryptos.randomBytes(20).toString('hex');


			let acc = await accountsModel.find({ email: req.user.email });

			if (type == 'gCode' && acc[0].auth2 == true) {

				if (acc[0].auth2 == false) {
					return res.status(200).send({
						status: "Fail",
						message: "Google Authentication Not Enabled"
					})
				}
				console.log("1")
				let verified = speakeasy.totp.verify({
					secret: acc[0].secret,
					encoding: 'base32',
					token: authCode,
				});

				if (verified == false) {
					return res.status(200).send({
						status: "Fail",
						message: "Google Authentication Code Expired"
					})
				}

				console.log("2", verified)
				if (verified) {
					var set = await settingsModel.find({}).lean().exec();
					console.log("3")
					if (
						amount <= Number(acc[0].fiatBalance) &&
						amount <= Number(set[0].withdraw_limit) &&
						amount >= Number(set[0].min_withdraw)
					) {
						await transactionHistoriesModel.create({
							email: req.user.email,
							ref: req.user.ref,
							from: req.user.id,
							to: req.user.id,
							source: "USD",
							target: "USD",
							sourceAmount: req.body.amount,
							targetAmount: req.body.amount,
							type: 'withdraws',
							currency: "USD",
							status: 'pending',
							payOutProfit: payoutProfit,
							txHash: hash,
						});

						let a = await transactionHistoriesModel.find();
						// console.log("HIST", a)

						let ip = req.userData.ip;

                        let data = await requestPromise.get(`https://api.ipgeolocationapi.com/geolocate/${ip}`, {
                            method: 'GET',
                            json: true,

                        });
                        console.log("IP", data.toString())
                        data.toString();

                        let location = data.name

						await usageStaticsModel.create({
							email: req.user.email,
							timestamp: new Date().toUTCString(),
							action: 'withdraw',
							ip: req.userData.ip,
							status: 'success',
							location: location,
							extraData2: '',
							extraData3: '',
						});

						return res.status(200).send({
							status: 'success',
							message: 'Pending',
						});
					} else if (amount <= Number(acc[0].fiatBalance) &&
						amount < Number(set[0].min_withdraw)) {
						return res.status(200).send({
							status: 'Fail',
							message: 'Minimum Withdraw Amount Should Be 200',
						});
					}
					else if (amount > Number(set[0].withdraw_limit)) {
						return res.status(200).send({
							status: 'Fail',
							message: 'Withdraw Limit Exceeded',
						});
					}
				}
			}
			else if (type == 'gCode' && acc[0].auth2 == false) {

				let verified = false
				let userData = cache.getAlive("otp_verify", req.user.email)
				console.log("USER_DATA:", userData, authCode)
				if (userData == null) {
					return res.status(200).send({
						status: "fail",
						message: "OTP Expired"
					})
				}
				if (authCode == userData['otp']) { // remove second condition // TODO
					delete userData['otp']
					delete userData['expired']

					delete userData.meta
					delete userData['$loki']
					verified = true
					cache.remove("otp_verify", req.user.email)
				}

				if (verified) {
					var set = await settingsModel.find({}).lean().exec();
					console.log("3")
					if (
						amount <= Number(acc[0].fiatBalance) &&
						amount <= Number(set[0].withdraw_limit) &&
						amount >= Number(set[0].min_withdraw)
					) {
						await transactionHistoriesModel.create({
							email: req.user.email,
							ref: req.user.ref,
							from: req.user.id,
							to: req.user.id,
							source: profile[0].localCurrency,
							target: profile[0].localCurrency,
							sourceAmount: req.body.amount,
							targetAmount: req.body.amount,
							type: 'withdraws',
							currency: profile[0].localCurrency,
							status: 'pending',
							payOutProfit: payoutProfit,
							txHash: hash,
						});

						let a = await transactionHistoriesModel.find();
						// console.log("HIST", a)

						let ip = req.userData.ip;

                        let data = await requestPromise.get(`https://api.ipgeolocationapi.com/geolocate/${ip}`, {
                            method: 'GET',
                            json: true,

                        });
                        console.log("IP", data.toString())
                        data.toString();

                        let location = data.name

						await usageStaticsModel.create({
							email: req.user.email,
							timestamp: new Date().toUTCString(),
							action: 'withdraw',
							ip: req.userData.ip,
							status: 'success',
							location: location,
							extraData2: '',
							extraData3: '',
						});

						return res.status(200).send({
							status: 'success',
							message: 'Pending',
						});
					} else if (amount <= Number(acc[0].fiatBalance) &&
						amount < Number(set[0].min_withdraw)) {
						return res.status(200).send({
							status: 'Fail',
							message: 'Minimum Withdraw Amount Should Be 200',
						});
					}
					else if (amount > Number(set[0].withdraw_limit)) {
						return res.status(200).send({
							status: 'Fail',
							message: 'Withdraw Limit Exceeded',
						});
					}
				}

			}
			else {

				return res.status(200).send({
					status: 'Fail',
					message: 'Authentication failed',
				});
			}
		} else {
			return res.status(200).send({
				status: 'fail',
				message: 'Profile not configured',
				error: 'err',
			});
		}


	}
	catch (error) {
		console.log("ERROR:", error)
		return res.status(200).send({
			status: 'Fail',
			message: 'Internal Server Error',
		});
	}


});

router.post('/sendbonus', async (req, res) => {
	const web3 = new Web3(new Web3.providers.HttpProvider(config.wallet.provider))
	let userAddress = Web3.utils.toChecksumAddress(req.body.user_wallet)
	console.log("userAddress",userAddress)
	let amountpaid = req.body.amount
	let ref1details = await accountsModel.findOne({ "wallets.mybiz": userAddress })
	console.log("ref1details",ref1details)
	let refaddress = [], amount = [],data = [], value = 0
	try {
	if(amountpaid > 1) {
		if(ref1details != null && ref1details.referredCode != undefined && ref1details.referredCode != "" ){
		refaddress.push(ref1details.wallets.mybiz)
		let ref2details = await accountsModel.findOne({ "wallets.mybiz": ref1details.referredCode })
		console.log("ref1details.referredCode", ref1details.referredCode)
		data.push({address :  ref1details.referredCode ,amount :(amountpaid * 5 / 100) })
		amount.push(await web3.utils.toWei(String(amountpaid * 5 / 100)))
		value+= (amountpaid * 1 / 100)
		try {
			if(ref2details.referredCode != undefined && ref2details.referredCode != "" ){
			refaddress.push(ref2details.wallets.mybiz)
			let ref3details = await accountsModel.findOne({ "wallets.mybiz": ref2details.referredCode })
			data.push({address :  ref2details.referredCode ,amount :(amountpaid * 5 / 100) })
			amount.push(await web3.utils.toWei(String(amountpaid * 1 / 100)))
			value+= (amountpaid * 1 / 100)
			try {
				if(ref3details.referredCode != undefined && ref3details.referredCode != ""){
				console.log("ref3details.referredCode",ref3details.referredCode)
				refaddress.push(ref3details.referredCode)
				let ref4details = await accountsModel.findOne({ "wallets.mybiz": ref3details.referredCode })
				data.push({address :  ref4details.wallets.mybiz ,amount :(amountpaid * 5 / 100) })
				amount.push(await web3.utils.toWei(String(amountpaid * 1 / 100)))
				value+= (amountpaid * 1 / 100)
				}
			} catch (error) {
				console.log("error", error);
			}
			}
		} catch (error) {
			console.log("error", error);
		}

		} else{
			res.status(422).send({
			status: "fail",
			message: "User have no referredCode",
			error: "nil",
			});
			return;
	  }
	}
  } catch (error) {
    console.log("error", error);
  }

  console.log("test",refaddress, amount,value )
  console.log("test3",data )
  //return 
  
  let wallet = web3.eth.accounts.wallet;
  wallet.clear();
  wallet = wallet.create(0);
//   wallet.add(config.wallet.contracts[0].privKey);
  console.log("test", wallet[0].address)
  let mybizcontractAddres = config.wallet.contracts[1].address
  console.log("allowance", mybizcontractAddres,)

  let adminbalance = await web3.eth.getBalance(wallet[0].address)
  console.log(adminbalance)
  let bnbbalance = Number(adminbalance)/10**18
  if(bnbbalance <= value){
    res.status(422).send({
      status: "fail",
      message: "Admin balance is low",
      error: "nil",
    });
    return;
  }
  let instance1 = await new web3.eth.Contract(ABIMulti, mybizcontractAddres);
  if (refaddress != []){
    await instance1.methods
    .mutiSendETHWithDifferentValue(refaddress, amount)
    .send({
      from: wallet[0].address,
      gas: config.wallet.gasLimit,
      value: web3.utils.toWei(String(value)),
      nonce: await web3.eth.getTransactionCount(wallet[0].address, "pending")
    })
    .on("transactionHash", async (hash) => {
      txHash = hash;
      console.log(txHash);

      console.log(data);
      await data.forEachAsync(async (_data) => {
        await transactionHistoriesModel.create(
          {
            from: wallet[0].address,
            to: _data.address,
            source: "BNB",
            target: "BNB",
            amount: _data.amount,
            status: "completed",
            error: "nil",
            reason: "",
            data: "",
            txHash: txHash,
            value: _data.amount,
            targetAmount: _data.amount,
            sourceAmount: _data.amount,
            //currency: tokenName,
            type: "refBonus",
            //email: _data.email,
            txId: txHash,
            ref: "0",
            timestamp: new Date().getTime(),
          });
      })

      res.status(200).send({
        status: "success",
        txHash: txHash
      });
      return
    })
    .on("error", (er) => {
      console.log("test 4", er);
    });
  }else{
    res.status(422).send({
      status: "fail",
      message: "No refferal for this user",
      error: "nil",
    });
    return;
  }
})

router.post("/senderQRCode", async (req, res) => {
	try {

	//   let addressType = req.body.addressType
	  let addressType = 'personal'

	  let senderEmail = req.body.senderEmail

	  let currency = req.body.currency
	  let total = req.body.total
	  let wallets = []

	  let result 
	  if(addressType == 'personal'){

		result = await accountsModel.findOne({email:senderEmail})
		wallets.push(result.wallets.btc)
		wallets.push(result.wallets.eth)
		wallets.push(result.wallets.usdt)
		wallets.push(result.wallets.mybiz)
	  }

	  else if(addressType == 'business'){

	  }

	  else{
		  res.send({
			  message:"fail",
			  status:"false",
			  data:"addressType should be personal/ business"
		  })
	  }
	  

	  
  
  
  console.log("wallets",wallets)
  
		  let qr = [];
  
		  qr = await Promise.all([
			  QRCode.toDataURL(wallets[0]),
			  QRCode.toDataURL(wallets[1]),
			  QRCode.toDataURL(wallets[2]),
			  QRCode.toDataURL(wallets[3]),
			
		  ])
  
	  // JSON ARRAY
		  var r = [];
		  //let cryp = ['eth', 'busd', 'mmbtu', 'unv','bnb' ];
		  let cryp = ['BTC','ETH' ,"USDT","MYBIZ"];
  
				  r.push({ name: cryp[0],  qrcode: qr[0], address:wallets[0] });
		  r.push({ name: cryp[1],  qrcode: qr[1], address:wallets[1] });
		  r.push({ name: cryp[2],  qrcode: qr[2], address:wallets[2] });
		  r.push({ name: cryp[3],  qrcode: qr[3], address:wallets[3] });
	
  
		  console.log("QR wallets",r)
	  res.status(200).send({
  
		result: "success",
		data: r,
		error: "nil",
	  });
	} catch (error) {
	  console.log(error.message)
	  res.status(200).send({
		status: "fail",
		error: "err",
	  });
	}
  });

router.get('/referredUserlist', async (req, res) => {
	try {
	 await accountsModel.find({ referredBy: req.query.address}, function (err, found) {
		 if(err) {
			 res.send({ status: false, message: err.message })
		 } else if (found.length>0) {
			 res.send({ status: true, message: 'referred user list', data: found })
		 } else {
			res.send({ status: false, message: 'No referred user list', data: [] })
		 }
	 })
		
	} catch (error) {
		console.log("ERROR:", error)
		return res.status(200).send({
			status: 'Fail',
			message: 'Internal Server Error',
		});
	}
})

module.exports = router;
