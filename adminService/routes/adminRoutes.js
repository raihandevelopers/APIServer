const app = require('express');
const router = app.Router();
const dataRoutes = require('express').Router();
const accountsModel = require('../models/accountsModel');
const walletModel = require('../models/wallets');
const actionsModel = require('../models/actions');
var json2htmls = require('json2html');
const json2html = require('node-json2html');
const configModel = require('../models/configModel');
const dataRoutesController = require('../controller/dataRoutesController');
const tokenVerification = require('../lib/jwt');
const TransactionModel = require('../models/TransactionHistories');
const kycModel = require('../models/kyc');
const fs = require('fs');
const path = require('path');
const fileUpload = require('express-fileupload');
const config = require('../config');
const WalletFactory = require('../lib/wallet').WalletFactory;
const walletFactory = new WalletFactory(config.wallet.mnemonics, config.wallet.password, config.wallet.network);
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(config.wallet.provider));
const ABI = require('../static/erc20abi').abi;
const jwt = require('jsonwebtoken');
let cache = require('../lib/cache');
var QRCode = require('qrcode');
const cryptoC = require('../config');
const request = require('../lib/network');
let db = require('../lib/db');
let transactionRoutes = require('./transactionRoutes.js');
let statisticsModel = require('../models/statistics');
let transactions = require('../models/transactions');
const rpc = require('../lib/rpc');
const promise = require('request');
const requestPromise = require('request-promise');
const transactionHistoriesModel = require('../models/TransactionHistories');
let settingsModel = require('../models/settings');
let bankAccountModel = require('../models/bankAccount');
const usageStatisticsModel = require('../models/usageStatistics');
const contentsModel = require('../models/contents');
const feeModel = require('../models/fees');
const marketInfo = require('../models/marketInfo')
require('array-foreach-async');
var passwordValidator = require('password-validator');
var schema = new passwordValidator();
const c_s = require('country-state-picker');

const body = require('express-validator').body;
const header = require('express-validator').header;
const query = require('express-validator').query;
const param = require('express-validator').param;
const validationResult = require('express-validator').validationResult;

// PASSWORD VALIDATION REQUIREMENTS
schema.is().min(8).is().max(16).has().uppercase().has().lowercase().has().digits().has().symbols().has().not().spaces(); // Minimum length 8 // Maximum length 16 // Must have uppercase letters // Must have lowercase letters // Must have digits // Must have symbols // Should not have spaces

async function getWallet(ref) {
	let extendedKey = walletFactory.calculateBip44ExtendedKey(ref, true);
	let privKey = extendedKey.keyPair.d.toBuffer(32);
	//    console.log("privKey", "0x" + privKey.toString("hex"))
	return '0x' + privKey.toString('hex');
}

const validate = routeName => {
	switch (routeName) {
		case 'authentication':
			return [body('email').isString().exists(), body('password').isString().exists()];

		case 'verifyOtp':
			return [body('email').exists().notEmpty(), body('otp').exists().notEmpty()];

		case 'updateContents':
			return [body('registration').exists().notEmpty(), body('forgetPassword').exists().notEmpty()];

		case 'setStatus':
			return [param('key').isString().exists()];

		case 'getOneTx':
			return [body('_id').isString().exists()];

		case 'getOneMember':
			return [body('_id').exists().notEmpty()];

		case 'updateEmailSettings':
			return [
				body('settings.host').exists().notEmpty(),
				body('settings.port').exists().notEmpty(),
				body('settings.user').exists().notEmpty(),
				body('settings.password').exists().notEmpty(),
				body('settings.audience').exists().notEmpty(),
			];

		case 'withdrawlLimit':
			return [
				body('withdrawlLimit').exists().notEmpty(),
				body('min_withdraw').exists().notEmpty(),
			]

		case 'updateAccountSettings':
			return [
				body('ref').exists().notEmpty()
			]

		case 'updateInfuraSettings':
			return [
				body('key').exists().notEmpty(),
				body('network').exists().notEmpty()
			]

		case 'contractAddress':
			return [
				body('usdt').exists().notEmpty(),
				body('mybiz').exists().notEmpty(),
			]

		case 'updateContent':
			return [body('registration').exists().notEmpty(), body('forgetPassword').exists().notEmpty()];

		case 'FilterOrders':
			return [
				body('type').exists().isString().notEmpty(),
				body('currency').exists().isString().notEmpty(),
				body('user').exists().isString().notEmpty(),
			];

		case 'FilterTransactions':
			return [body('currency').exists().isString().notEmpty(), body('user').exists().isString().notEmpty()];

		case 'FilterOrderLogs':
			return [
				body('status').exists().notEmpty(),
				body('currency').exists().isString().notEmpty(),
				body('user').exists().isString().notEmpty(),
			];

		case 'FilterGetRequests':
			return [
				body('type').exists().notEmpty(),
				body('status').exists().notEmpty(),
				body('user').exists().notEmpty(),
			];

		case 'filterWalletBalances':
			return [body('user').exists().isString().notEmpty()];

		case 'filterWalletBalancesById':
			return [body('id').exists().isString().notEmpty()];

		case 'FilterAddressess':
			return [body('currency').exists().isString().notEmpty(), body('user').exists().isString().notEmpty()];

		case 'filterUserHistory':
			return [
				body('user').exists().notEmpty(),
				body('action').exists().notEmpty(),
				body('from').exists().notEmpty(),
				body('to').exists().notEmpty(),
			];

		case 'updateAccountStatus':
			return [body('status').exists().isString().notEmpty(), body('id').exists().isString().notEmpty()];

		case 'MonthTransaction':
			return [body('month').exists().isString().notEmpty()];

		case 'updatefee':
			return [
				body('buyFee').exists().notEmpty(),
				body('sellFee').exists().isString().notEmpty(),
				body('crypto').exists().isString().notEmpty(),
			];

		case 'addUser':
			return [
				body('user.email').exists().notEmpty(),
				body('user.name').exists().notEmpty(),
				body('user.phone').exists().notEmpty(),
				body('user.password').exists().notEmpty(),
				body('user.adminLevel').exists().notEmpty(),
				body('user.auth2').exists().notEmpty(),
			];

		case 'getOneMember':
			return [body('_id').exists().isString().notEmpty()];

		case 'getWalletBalance':
			return [body('email').exists().isString().notEmpty()];

		case 'getBankInfoById':
			return [body('id').exists().isString().notEmpty()];
		case 'getOneKyc':
			return [body('id').exists().isString().notEmpty()];

		case 'approveKYC':
			return [body('status').exists().isString().notEmpty(), body('email').exists().isString().notEmpty()];

		case 'approveTopUp':
			return [body('status').exists().isString().notEmpty(), body('txnId').exists().isString().notEmpty()];

		case 'approveWithdraw':
			return [body('status').exists().isString().notEmpty(), body('txnId').exists().isString().notEmpty()];

		case 'changePaassword':
			return [body('password').exists().isString().notEmpty()];

		case 'setActions':
			return [body('action').exists().isString().notEmpty()];

		case 'removeActions':
			return [body('action').exists().isString().notEmpty()];

		case 'topUp':
			return [body('amount').exists().isString().notEmpty(), body('txnId').exists().isString().notEmpty()];

		case 'withdraw':
			return [body('amount').exists().notEmpty(), body('transactionId').exists().notEmpty()];

		case 'addBankDetail':
			return [
				body('bankName').exists().notEmpty(),
				body('accountNumber').exists().notEmpty(),
				body('accountHolderName').exists().notEmpty(),
				body('accountType').exists().notEmpty(),
				body('homeAddress').exists().notEmpty(),
				body('branch').exists().notEmpty(),
				body('city').exists().notEmpty(),
				body('zipCode').exists().notEmpty(),
				body('swiftCode').exists().notEmpty(),
				body('country').exists().notEmpty(),
			];

		case 'getOneTxHistory':
			return [body('email').exists().isString().notEmpty()];

	}
};

router.post('/auth/authentication', validate('authentication'), async (req, res) => {
	// console.log('data');

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}

	let {
		email,
		password,
	} = req.body;
	/*   let userData = await db.readFromDBAsync({
      "email": email
    }, "accounts") */
	console.log(email, password);
	let user = await accountsModel
		.findOne({
			email: email,
		})
		.lean()
		.exec();

	// console.log("accountsModel", accountsModel)
	if (user) {
		let auth2Status = true;
		console.log('user', user);

		//let user = userData['message']
		// console.log(userData);
		if (user['password'] == password) {
			delete user['password'];
			console.log('user', user);
			auth2Status = user.auth2 != undefined || null ? user.auth2 : false;

			if (auth2Status) {
				let otp = Math.floor(100000 + Math.random() * 900000);
console.log('otp', otp)
				cache.create(
					cache.collectionName.auth2Login,
					email,
					{
						otp: otp,
					},
					600 * 1000
				); //expires in 10 mins
				//emailService.send2faCode(user.email, otp)
				request.post(config.services.emailService + '/sendAuth2Email', {
					email: email,
					otp: otp,
				});

				res.send({
					status: 'success',
					message: 'true',
					token: '',
					auth2: auth2Status,
					error: 'nil',
				});

				return;
			}

			let sessionId = jwt.sign(
				{
					//generate sessionId
					email: user['email'],
				},
				config.tokenAuth.password,
				{
					expiresIn: '5d',
				}
			);
			user['sessionId'] = sessionId;

			console.log('USER', user);
			//save the userData to memcache
			cache.create(cache.collectionName.session, email, user, 432000 * 1000); //expire after 5days
			// res.header('Authorization', sessionId)
			res.send({
				status: 'success',
				message: 'true',
				auth2: false,
				token: sessionId,
				error: 'nil',
				user: user,
				userId: user.message,
			});
		} else {
			res.status(422).send({
				status: 'fail',
				message: 'incorrect password',
				error: 'nil',
			});
		}
	} else {
		//email not exists in db
		res.status(400).send({
			status: 'fail',
			message: 'email not found',
			error: 'nil',
		});
	}
});

router.post('/verifyOtp', validate('verifyOtp'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}

	let {
		email,
		otp,
	} = req.body;
	try {
		let userData = cache.getAlive(cache.collectionName.auth2Login, email);

		if (userData == null) {
			res.status(400).send({
				status: 'fail',
				message: 'otp expired',
				error: 'error',
			});
			return;
		}

		let otpFromCache = userData.otp;

		if (otp == otpFromCache) {
			let user = (await db.readFromDBAsync(
				{
					email: email,
				},
				'accounts'
			)).message;

			request.post(config.services.emailService + '/sendLoginEmail', {
				type: "You have successfully logged in to pinksurfing",		
				email: email
			})


			console.log(user);
			delete user['password'];
			let sessionId = jwt.sign(
				{
					//generate sessionId
					email: user['email'],
				},
				config.tokenAuth.password,
				{
					expiresIn: '5d',
				}
			);
			user['sessionId'] = sessionId;

			//save the userData to memcache
			cache.create(cache.collectionName.session, email, user, 432000 * 1000); //expire after 5days
			res.header('Authorization', sessionId);

			cache.remove(cache.collectionName.auth2Login, email);
			res.send({
				status: 'success',
				message: 'true',
				token: sessionId,
				user: user,
				error: 'nil',
			});
		} else {
			res.status(400).send({
				status: 'fail',
				message: 'otp expired',
				error: 'error',
			});
			return;
		}
	} catch (err) {
		console.log(err);
		res.status(500).send({
			status: 'fail',
			message: 'server error',
			error: 'error',
		});
	}
});

router.get('/getContents', async (req, res) => {
	try {
		let result = await contentsModel.findOne({}).lean().exec();

		let aa = json2html.transform(result.registration, { '@lang': 'lang', html: '${result.registartion}' });

		let js = JSON.stringify(result.registration);

		let bb = json2htmls.render(js, { plainHtml: true });

		console.log('sadfasfdASFD', bb);

		res.status(200).send({
			status: 'success',
			result: bb,
			// message:bb,
			// data:aa,
			// js:js,
			error: 'nil',
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			error: 'err',
		});
	}
});

router.post('/updateContents', validate('updateContents'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}


	try {
		let { registration, forgetPassword } = req.body;

		if (registration != '') {
			await contentsModel.updateOne(
				{},
				{
					$set: {
						registration: registration,
					},
				},
				{
					upsert: true,
				}
			);

			res.status(200).send(JSON.stringify(req.body));
		} else if (forgetPassword != '') {
			await contentsModel.updateOne(
				{},
				{
					$set: {
						forgetPassword: forgetPassword,
					},
				},
				{
					upsert: true,
				}
			);

			res.status(200).send({
				status: 'success',
				message: 'content updated',
				error: 'nil',
			});
		}
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			error: 'err',
		});
	}
});

router.use(tokenVerification);
router.use('/data', dataRoutes);
router.use('/transaction', transactionRoutes);

router.post('/setStatus/:key', validate('setStatus'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}

	try {
		console.log('PARAMS:', req.params.key);
	//	console.log('VALUE:', req.query);

		// TRUE / FALSE
		let value = req.body.value;

		// ENABLE / DISABLE
		await settingsModel.updateOne(
			{},
			{
				$set: {
					[`${req.params.key}`]: value,
				},
			},
			{
				upsert: true,
			}
		);
		let result = await settingsModel.findOne({}).lean().exec();
		//console.log(result[0].register == false);

		res.status(200).send({
			status: 'success',
			data: {
				buy: result.buy,
				sell: result.sell,
				send: result.send,
				login: result.login,
				register: result.register
			},
		});
/*		let result = await settingsModel.find({});
		console.log(result[0].register == false);

		res.status(200).send({
			status: 'success',
			data: result,
		}); */
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			message: 'Internal Server Error',
		});
	}
});

router.post('/changeCoinPrice', async (req, res) => {

  try {
      // ADDING PAYMENT DETAILS
	  await settingsModel.updateOne({}, {
		$set: {
			coin: {
				price: req.body.price,
				symbol: req.body.symbol
			},
		}
	})

      res.status(200).send({
          status: "success",
          message: "Coin Price Updated"
      })

  } catch (error) {
      res.status(500).send({
          status: 'fail',
          message: 'Internal Server Error'
      })
  }

})

// router.get('/getCoinPrice', async (req, res) => {
  
//   try {
//       let result = await settingsModel.find({})

//       res.status(200).send({
//           status: "success",
//           data: result
//       })

//   } catch (error) {
//       res.status(500).send({
//           status: 'fail',
//           message: 'Internal Server Error'
//       })
//   }

// })


router.post('/getOneTx', validate('getOneTx'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}

	try {
		let re = await TransactionModel.find({
			$and: [
				{
					isAdmin: {
						$ne: true,
					},
					$or: [
						{
							_id: req.body._id,
						},
					],
				},
			],
		});

		res.status(200).send({
			status: 'success',
			data: re,
		});
	} catch (e) {
		console.log(e);
		res.status(500).send({ status: 'error', message: 'Error occured', error: 'e' });
	}
});

router.post('/getOneMember', validate('getOneMember'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}

	try {

		let re = await TransactionModel.find({
			$and: [
				{
					isAdmin: {
						$ne: true,
					},
					$or: [
						{
							_id: req.body._id,
						},
					],
				},
			],
		});

		res.status(200).send({
			status: 'success',
			data: re,

		});
	} catch (e) {
		console.log(e);
		res.status(500).send({ status: 'error', message: 'Error occured', error: 'e' });
	}
});

router.post('/updateInfuraSettings', validate('updateInfuraSettings'), async (req, res) => {
	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(422).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	} else {
		try {
			let { network, key } = req.body

			let allowedNetworks = ['mainnet', 'ropsten']

			if (allowedNetworks.indexOf(network) == -1) {
				return res.status(422).send({
					status: 'fail',
					message: 'invalid network'
				})
			}

			await settingsModel.updateOne({}, {
				$set: {
					infuraKey: key,
					network: network == 'mainnet' ? 'mainnet' : 'ropsten'
				}
			})

			res.send({
				status: 'success',
				message: 'updated '
			})
		} catch (error) {
			res.status(500).send({
				status: 'fail',
				message: 'internal server error'
			})
			console.log(error.name, error.message)
		}
	}
})

router.post('/updateAccountSettings', validate('updateAccountSettings'), async (req, res) => {
	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(422).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	} else {
		try {

			let { ref } = req.body

			await settingsModel.updateOne({}, {
				$set: {
					adminRef: ref,
				}
			})

			res.send({
				status: 'success',
				message: 'updated '
			})
		} catch (error) {
			res.status(500).send({
				status: 'fail',
				message: 'internal server error'
			})
			console.log(error.name, error.message)
		}
	}
})

router.post('/updateEmailSettings', validate('updateEmailSettings'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}

	try {
		let settings = req.body;

		let exisitingSettings = await settingsModel.findOne({}).lean().exec();

		let dataToInsert = {
			email: {
				host: settings.settings.host,
				port: settings.settings.port,
				user: settings.settings.user,
				password: settings.settings.password,
				audience: settings.settings.audience,
			},
		};

		await settingsModel
			.updateOne(
				{},
				{ $set: dataToInsert },
				{
					multi: true,
				}
			)
			.exec();

		res.send({
			status: 'success',
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
		});
	}
});


router.post('/withdrawlLimit', validate('withdrawlLimit'), async (req, res) => {
	try {
		let { maxAmount, minAmount } = req.body

		await settingsModel.updateOne({}, {
			$set: {
				withdraw_limit: maxAmount,
				min_withdraw: minAmount
			}
		}).exec()

		res.send({
			status: 'success',
			message: 'updated'
		})

	} catch (error) {
		res.status(500).send({
			status: 'success',
			message: 'Error occurred'
		})

		console.log(error.name, error.message)
	}
})

router.post('/contractAddress', validate('contractAddress'), async (req, res) => {
	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(422).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}
	try {
		let { usdt, mybiz } = req.body

		await settingsModel.updateOne({}, {
			$set: {
				usdt: usdt,
				mybiz: mybiz
			}
		})

		res.send({
			status: 'success',
			message: 'updated'
		})

	} catch (error) {
		res.status(500).send({
			status: 'success',
			message: 'Error occurred'
		})

		console.log(error.name, error.message)
	}
})

router.get('/settings', async (req, res) => {
	try {
		let data = await Promise.all([
			settingsModel.findOne({}).lean().exec(),
			feeModel.findOne({}).lean().exec()
		])
		let address 
		let privateKey 
		
		let ref = data[0].adminRef

		let extendedKey = walletFactory.calculateBip44ExtendedKey(ref, true);
		let privKey = extendedKey.keyPair.d.toBuffer(32);
		//    console.log("privKey", "0x" + privKey.toString("hex"))
		privateKey =  "0x" + privKey.toString("hex");

		address = walletFactory.generateEthereumWallet(privateKey)

		data[0].privateKey = privateKey
		data[0].address = address
		res.send({
			status: 'success',
			settings: data[0],
			fee: data[1]
		})

	} catch (error) {
		res.status(500).send({
			status: 'fail',
			message: 'error occurred'
		})

		console.log(error.name, error.message)
	}
})


// CONTENT  => email

router.post('/updateContent', validate('updateContent'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}

	try {
		let { registration, forgetPassword } = req.body;

		if (registration != '') {
			await contentsModel.updateOne(
				{},
				{
					$set: {
						registration: registration,
					},
				},
				{
					upsert: true,
				}
			);

			res.status(200).send(JSON.stringify(req.body));
		} else if (forgetPassword != '') {
			await contentsModel.updateOne(
				{},
				{
					$set: {
						forgetPassword: forgetPassword,
					},
				},
				{
					upsert: true,
				}
			);

			res.status(200).send({
				status: 'success',
				message: 'content updated',
				error: 'nil',
			});
		}
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			error: 'err',
		});
	}
});

// CONTENT

router.get('/getContent', async (req, res) => {
	try {
		let result = await contentsModel.findOne({}).lean().exec();

		res.status(200).send({
			status: 'success',
			message: result,
			error: 'nil',
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			error: 'err',
		});
	}
});

dataRoutes.post('/notify', async (req, res) => {
	try {
		let userWallets = await walletModel.find();
		let adminBalances = await configModel.find();

		let btcBalance = 0,
			ethBalance = 0,
			usdtBalance = 0,
			bchBalance = 0,
			paxBalance = 0,
			trxBalance = 0,
			xrpBalance = 0;

		userWallets.forEach(_wallet => {
			btcBalance += Number(_wallet.btc.balance);
			ethBalance += Number(_wallet.eth.balance);
			usdtBalance += Number(_wallet.usdt.balance);
			bchBalance += Number(_wallet.bch.balance);
			paxBalance += Number(_wallet.pax.balance);
			trxBalance += Number(_wallet.trx.balance);
			xrpBalance += Number(_wallet.xrp.balance);
		});

		if (btcBalance < 10) {
			console.log('LESS Balance');

			res.status(200).send({
				status: 'success',
				data: userWallets,
				config: adminBalances,
			});
		}

		// console.log("A D M  I N N N N:\n",config[0].wallets)
	} catch (error) { }
});

dataRoutes.post('/topUpList', async (req, res) => {
	try {
		// Need to change type to 'topup'

		let topUp = await TransactionModel.find({ type: 'send' });

		res.status(200).send({
			status: 'success',
			data: topUp,
		});
	} catch (error) {
		status: ('fail');
	}
});

dataRoutes.post('/topup', async (req, res) => {
	try {
		res.status(200).send({
			status: 'success',
			topUpAddress: {
				btc: config.topUpAddress.btc,
				bch: config.topUpAddress.bch,
				eth: config.topUpAddress.eth,
				usdt: config.topUpAddress.usdt,
				pax: config.topUpAddress.pax,
				trx: config.topUpAddress.trx,
				xrp: config.topUpAddress.xrp,
			},
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			error: error,
		});
	}
});

function trimDecimals(targetAmount) {
	if (String(targetAmount).indexOf('.') != -1) {
		targetAmount = Number(targetAmount) * 10 ** 6;
		targetAmount = Math.trunc(targetAmount);
		targetAmount = targetAmount / 10 ** 6;
		return targetAmount;
	} else {
		return targetAmount;
	}
}

async function sendEthTx(currency, total, address, ref) {
	let wallet = web3.eth.accounts.wallet; //.create(0)
	wallet.clear();
	wallet = wallet.create(0);
	console.log('wallet[0]', wallet);
	// wallet.add(await getWallet(req.user.ref));

	wallet.add(await getWallet(ref));
	console.log(wallet[0]);
	gasPrice = await web3.eth.getGasPrice();
	availableBalance = 21000 * gasPrice - total;
	let amountToTransferr = await web3.utils.fromWei(String(availableBalance));

	new_amount = Number(amountToTransferr) * 10 ** 8;
	new_amountToTransfer = Math.trunc(new_amount);
	new_amount = new_amountToTransfer / 10 ** 8;

	console.log('amount', amountToTransferr);
	console.log('from', wallet[0].address);
	console.log('Gas price', gasPrice);
	console.log('Total', total);
	await web3.eth
		.sendTransaction({
			from: wallet[0].address,
			to: web3.utils.toChecksumAddress(address),
			value: web3.utils.toWei(String(new_amount)),
			nonce: await web3.eth.getTransactionCount(wallet[0].address, 'pending'),
			gasPrice: await web3.eth.getGasPrice(), //'0x1DCD65000',
			gasLimit: config.wallet.gasLimit,
		})
		.on('transactionHash', async hash => {
			console.log(hash);

			await transactions.updateMany(
				{
					txHash: {
						$in: true,
					},
				},
				{
					$set: {
						ref: req.user.ref,
						from: wallet[0].address,
						to: address,
						value: amount,
						currency: currency,
						txHash: hash,
						status: 'pending',
						timestamp: new Date().getTime(),
					},
				},
				{
					upsert: true,
				}
			);

			let txn = await transactions.find({});
			console.log('TXN initiated:', txn);

			res.status(200).send({
				status: 'success',
				txns: txn,
			});
		})
		.on('receipt', async function (receipt) {
			let txn = await transactions.find({});
			console.log('receipt', receipt);

			let serverTime = Date.now();

			// if ((serverTime > currTimestamp) && (serverTime < nextTimestamp)) {

			// }
			let withdrawTx = [];
			txn.forEach(_hash => {
				withdrawTx.push(_hash.txHash);
			});

			await transactions.findOneAndUpdate(
				{
					txHash: receipt.transactionHash,
				},
				{
					$set: {
						status: 'success',
					},
				},
				{
					upsert: true,
				}
			);

			console.log('dsfbfvmtyrbgkih\n\n\n', withdrawTx);

			// await TransactionModel.updateMany(
			//   {
			//     email: req.user.email
			//   },
			//   {
			//     $set: {
			//       type: "withdraw",
			//       transactions: withdrawTx
			//     }
			//   },
			//   {
			//     upsert: true
			//   })
		});
}

dataRoutes.post('/ga2Factor', async (req, res) => {
	let { secret, authenticator } = req.body;

	try {
		let secretInfo = await accountsModel.updateMany(
			{ email: req.user.email },
			{
				$set: {
					secret: secret,
					authenticator: authenticator,
				},
			},
			{ multi: true }
		);
		res.status(200).send({
			secret: secret,
			authenticator: true,
		});
	} catch (error) {
		res.status(200).send({
			secret: '',
			authenticator: false,
		});
	}
});

dataRoutes.post('/adminBalance', async (req, res) => {
	try {
		let userWallets = await walletModel.find();

		let btcBalance = 0,
			ethBalance = 0,
			usdtBalance = 0,
			bchBalance = 0,
			paxBalance = 0,
			trxBalance = 0,
			xrpBalance = 0;

		userWallets.forEach(_wallet => {
			btcBalance += Number(_wallet.btc.fee);
			ethBalance += Number(_wallet.eth.fee);
			usdtBalance += Number(_wallet.usdt.fee);
			bchBalance += Number(_wallet.bch.fee);
			paxBalance += Number(_wallet.pax.fee);
			trxBalance += Number(_wallet.trx.fee);
			xrpBalance += Number(_wallet.xrp.fee);
		});

		res.status(200).send({
			status: 'success',
			btc: btcBalance,
			eth: ethBalance,
			usdt: usdtBalance,
			bch: bchBalance,
			pax: paxBalance,
			trx: trxBalance,
			xrp: xrpBalance,
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			error: 'error',
		});
	}
});

dataRoutes.get('/accountActivities', async (req, res) => {
	try {
		let user = await usageStatisticsModel.find({});

		res.status(200).send({
			status: 'success',
			message: user,
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			message: 'error',
		});
	}
});

dataRoutes.get('/userActivities', async (req, res) => {
	try {
		let user = await transactionHistoriesModel.find({});

		res.status(200).send({
			status: 'success',
			message: user,
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			message: 'error',
		});
	}
});

// ORDERS -> ORDERS

dataRoutes.get('/FilterOrders', async (req, res) => {

	try {
		let { currency, user, type } = req.body;

		let query = [];

		if (user != '') {
			query.push({
				from: user,
			});
		}

		if (currency != '') {
			query.push({
				currency: currency,
			});
		}

		if (type != '') {
			query.push({
				type: type,
			});
		}

		let query1 = [];

		query1.push({
			type: 'buy',
		});

		query1.push({
			type: 'sell',
		});
		let c = Object.keys(req.body).length;

		if (query.length == 0 || c == '0') {
			let result = await TransactionModel.aggregate([
				{
					$match: {
						$or: query1,
					},
				},
				{
					$project: {
						_id: 0,
						source: 1,
						fiatCurrency: 1,
						from: 1,
						type: 1,
						to: 1,
						sourceAmount: 1,
						fiatAmount: 1,
						fee: 1,
						timestamp: 1,
						toType: 1,
					},
				},
			]).exec(function (err, user) {
				user.forEach(result => {
					result.timestamp = new Date(Number(result.timestamp)).toUTCString();
				});

				res.status(200).send({
					status: 'success',
					result: user,
					// data:transactions,
					error: 'nil',
				});
			});
		} else if (query.length > 0) {
			let result = await TransactionModel.aggregate([
				{
					$match: {
						$and: query,
					},
				},
				{
					$project: {
						_id: 0,
						source: 1,
						fiatCurrency: 1,
						from: 1,
						type: 1,
						to: 1,
						sourceAmount: 1,
						fiatAmount: 1,
						fee: 1,
						timestamp: 1,
						toType: 1,
					},
				},
			]).exec(function (err, user) {
				user.forEach(result => {
					result.timestamp = new Date(Number(result.timestamp)).toUTCString();
				});

				res.status(200).send({
					status: 'success',
					result: user,
					// data:transactions,
					error: 'nil',
				});
			});
		}
	} catch (error) {
		res.status(500).send({
			status: 'fails',
			error: error,
		});
	}
});

// ORDERS -> TRANSACTIONS

dataRoutes.get('/FilterTransactions', async (req, res) => {

	try {
		let { currency, user } = req.body;

		let query = [];

		if (user != '') {
			query.push({
				from: user,
			});
		}

		if (currency != '') {
			query.push({
				currency: currency,
			});
		}

		let query1 = [];

		query1.push({
			type: 'buy',
		});

		query1.push({
			type: 'sell',
		});

		let c = Object.keys(req.body).length;

		if (query.length == 0 || c == '0') {
			let result = await TransactionModel.aggregate([
				{
					$match: {
						$or: query1,
					},
				},
				{
					$project: {
						_id: 0,
						source: 1,
						fiatCurrency: 1,
						from: 1,
						type: 1,
						to: 1,
						sourceAmount: 1,
						fiatAmount: 1,
						fee: 1,
						timestamp: 1,
						toType: 1,
					},
				},
			]).exec(function (err, user) {
				user.forEach(result => {
					result.timestamp = new Date(Number(result.timestamp)).toUTCString();
				});

				res.status(200).send({
					status: 'success',
					result: user,
					// data:transactions,
					error: 'nil',
				});
			});
		} else if (query.length > 0) {
			let result = await TransactionModel.aggregate([
				{
					$match: {
						$and: query,
						$or: query1,
					},
				},
				{
					$project: {
						_id: 0,
						source: 1,
						fiatCurrency: 1,
						from: 1,
						type: 1,
						to: 1,
						sourceAmount: 1,
						fiatAmount: 1,
						fee: 1,
						timestamp: 1,
						toType: 1,
					},
				},
			]).exec(function (err, user) {
				user.forEach(result => {
					result.timestamp = new Date(Number(result.timestamp)).toUTCString();
				});

				res.status(200).send({
					status: 'success',
					result: user,
					// data:transactions,
					error: 'nil',
				});
			});
		}
	} catch (error) {
		res.status(500).send({
			status: 'fails',
			error: error,
		});
	}
});

// ORDERS -> ORDER LOGS

dataRoutes.get('/FilterOrderLogs', async (req, res) => {

	try {
		let { user, currency, status } = req.body;

		let query = [];

		if (user != '') {
			query.push({
				from: user,
			});
		}

		if (currency != '') {
			query.push({
				source: currency,
			});
		}

		if (status != '') {
			query.push({
				status: status,
			});
		}

		let query1 = [];

		query1.push({
			type: 'send',
		});

		query1.push({
			type: 'received',
		});

		let c = Object.keys(req.body).length;

		if (query.length == 0 || c == '0') {
			let result = await TransactionModel.aggregate([
				{
					$match: {
						$or: query1,
					},
				},
				{
					$project: {
						_id: 0,
						source: 1,
						fiatCurrency: 1,
						status: 1,
						from: 1,
						type: 1,
						to: 1,
						sourceAmount: 1,
						fiatAmount: 1,
						fee: 1,
						timestamp: 1,
						toType: 1,
					},
				},
			]).exec(function (err, user) {
				user.forEach(result => {
					result.timestamp = new Date(Number(result.timestamp)).toUTCString();
				});

				res.status(200).send({
					status: 'success',
					result: user,
					// data:transactions,
					error: 'nil',
				});
			});
		} else if (query.length > 0) {
			let result = await TransactionModel.aggregate([
				{
					$match: {
						$and: query,
						$or: query1,
					},
				},
				{
					$project: {
						_id: 0,
						source: 1,
						fiatCurrency: 1,
						status: 1,
						from: 1,
						type: 1,
						to: 1,
						sourceAmount: 1,
						fiatAmount: 1,
						fee: 1,
						timestamp: 1,
						toType: 1,
					},
				},
			]).exec(function (err, user) {
				user.forEach(result => {
					result.timestamp = new Date(Number(result.timestamp)).toUTCString();
				});

				res.status(200).send({
					status: 'success',
					result: user,
					// data:transactions,
					error: 'nil',
				});
			});
		}
	} catch (error) {
		res.status(500).send({
			status: 'fails',
			error: error,
		});
	}
});

// REQUESTS -> WITHDRAWS/TOPUPS

dataRoutes.get('/FilterGetRequests', async (req, res) => {

	try {
		let { user, type, status } = req.body;

		let c = Object.keys(req.body).length;

		let query = [];

		if (user != '') {
			query.push({
				from: user,
			});
		}

		if (type != '') {
			query.push({
				type: type,
			});
		}

		if (status != '') {
			query.push({
				status: status,
			});
		}

		let query1 = [];

		query1.push({
			type: 'withdraws',
		});

		query1.push({
			type: 'topups',
		});

		if (query.length == 0 || c == '0') {
			let result = await TransactionModel.aggregate([
				{
					$match: {
						$or: query1,
					},
				},
				{
					$project: { _id: 1, source: 1, from: 1, type: 1, sourceAmount: 1, timestamp: 1, status: 1 },
				},
			]).exec(function (err, user) {
				user.forEach(result => {
					result.timestamp = new Date(Number(result.timestamp)).toUTCString();
				});

				res.status(200).send({
					status: 'success',
					result: user,
					// data:transactions,
					error: 'nil',
				});
			});
		} else if (query.length > 0) {
			let result = await TransactionModel.aggregate([
				{
					$match: {
						$and: query,
					},
				},
				{
					$project: { _id: 1, source: 1, from: 1, type: 1, sourceAmount: 1, timestamp: 1, status: 1 },
				},
			]).exec(function (err, user) {
				user.forEach(result => {
					result.timestamp = new Date(Number(result.timestamp)).toUTCString();
				});

				res.status(200).send({
					status: 'success',
					result: user,
					// data:transactions,
					error: 'nil',
				});
			});
		}
	} catch (error) {
		res.status(500).send({
			status: 'fails',
			error: error,
		});
	}
});

// USERS => USERS BALANCES

dataRoutes.get('/filterWalletBalances', async (req, res) => {

	try {
		let { user } = req.body;
		let c = Object.keys(req.body).length;

		if (req.body.user == '' || c == '0') {
			let wallets = await walletModel.find({}).lean().exec(function (err, user) {
				user.forEach(result => {
					result.eth.balance = Number(result.eth.balance / (10 ** 18));
				});

				res.status(200).send({
					status: 'success',
					wallet: user,
					// data:transactions,
					error: 'nil',
				});
			});

			// return res.send({
			// 	status: true,
			// 	messsage: 'List Found',
			// 	wallet: wallets,
			// });
		} else {
			let wallets = await walletModel.findOne({ email: user }).lean().exec(function (err, user) {
				user.forEach(result => {
					result.eth.balance = Number(result.eth.balance / (10 ** 18));
				});

				res.status(200).send({
					status: 'success',
					wallet: user,
					// data:transactions,
					error: 'nil',
				});
			});

			return res.send({
				status: true,
				messsage: 'List Found',
				wallet: wallets,
			});
		}
	} catch (e) {
		console.log(e);
		res.status(500).send({
			status: 'fail',
			message: 'Internal_server_error',
			error: 'error',
		});
	}
});

// By ID
dataRoutes.post('/filterWalletBalancesById', validate('filterWalletBalancesById'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}

	try {
		let { id } = req.body;
		let c = Object.keys(req.body).length;
		let wallets = await walletModel.findOne({ _id: id }).lean().exec(function (err, user) {
			// user.forEach(result => {
			user.eth.balance = Number(user.eth.balance / (10 ** 18));
			// });

			res.status(200).send({
				status: 'success',
				wallet: user,
				// data:transactions,
				error: 'nil',
			});
		});

		// return res.send({
		// 	status: true,
		// 	messsage: 'List Found',
		// 	wallet: wallets,
		// });
	} catch (e) {
		console.log(e);
		res.status(500).send({
			status: 'fail',
			message: 'Internal_server_error',
			error: 'error',
		});
	}
});

// USERS =>  COIN ADDRESSES

dataRoutes.get('/FilterAddressess', async (req, res) => {

	try {
		let { currency, user } = req.body;

		let flag = 0;

		if (user == '') {
			flag = 1;
		} else {
			flag = 0;
		}

		let flag1 = 0;

		if (currency == '') {
			flag1 = 1;
		} else {
			flag = 0;
		}

		let cryp = ['BTC', 'ETH', 'USDT', 'MYBIZ'];

		console.log('AFasgf', Object.keys(req.body).length);

		let c = Object.keys(req.body).length;

		if (flag == 1 && cryp.includes(currency)) {
			let wallets = await walletModel.find({}).exec(function (err, result) {
				let user = [];
				let id = [];

				result.forEach(re => {
					if (re.email) {
						user.push(re.email);
					}
				});

				result.forEach(re => {
					if (re.id) {
						id.push(re.id);
					}
				});

				let data = [];

				var details = [];

				result.forEach(re => {
					if (re[currency.toLowerCase()]) {
						data.push(re[currency.toLowerCase()].address);
					}
				});

				for (var name in user) {
					if (user.hasOwnProperty(name)) {
						details.push({ email: user[name], coin: currency, address: data[name], id: id[name] });
					}
				}

				res.status(200).send({
					status: 'success',
					data: details,
				});
			});
		} else if (flag == 0 && flag1 == 1) {
			let wallets = await walletModel.findOne({ email: user }).exec(function (err, result) {
				console.log(result.length);
				let data = [];

				var details = [];

				details.push({ email: result.email, coin: 'ETH', address: result.eth.address, id: result.id });
				details.push({ email: result.email, coin: 'BTC', address: result.btc.address, id: result.id });
				details.push({ email: result.email, coin: 'USDT', address: result.usdt.address, id: result.id });
				details.push({ email: result.email, coin: 'MYBIZ', address: result.mybiz.address, id: result.id });
				res.status(200).send({
					status: 'success',
					data: details,
				});
			});
		} else if ((flag == 1 && flag1 == 1) || c == '0') {
			let wallets = await walletModel.find({}).exec(function (err, result) {
				let user = [];
				let id = [];

				result.forEach(re => {
					if (re.email) {
						user.push(re.email);
					}
				});

				result.forEach(re => {
					if (re.id) {
						id.push(re.id);
					}
				});

				let btc = [];
				let eth = [];
				let usdt = [];
				let mybiz = [];;

				var details = [];

				result.forEach(re => {
					if (re.btc) {
						btc.push(re.btc.address);
					}
					if (re.eth) {
						eth.push(re.eth.address);
					}
					if (re.usdt) {
						usdt.push(re.usdt.address);
					}
					if (re.mybiz) {
						mybiz.push(re.mybiz.address);
					}
				});

				for (var name in user) {
					if (user.hasOwnProperty(name)) {
						details.push({ email: user[name], coin: 'BTC', address: btc[name], id: id[name] });
						details.push({ email: user[name], coin: 'ETH', address: eth[name], id: id[name] });
						details.push({ email: user[name], coin: 'USDT', address: usdt[name], id: id[name] });
						details.push({ email: user[name], coin: 'mybiz', address: mybiz[name], id: id[name] });
					}
				}

				res.status(200).send({
					status: 'success',
					data: details,
				});
			});
		} else {
			res.status(500).send({
				status: 'fail',
				error: '',
			});
		}
	} catch (error) { }
});

// USER => USER HISTORY

dataRoutes.get('/filterUserHistory', async (req, res) => {

	try {
		let { user, from, to, action } = req.body;

		//   let use = await usageStatisticsModel.find({$and:[{email:user},{action:action},{timestamp:"7/15/2020"}]})
		//   var da = "2020-07-13"
		//   console.log("sdaasdasdasd",new Date(da))
		//   // let flag=0;
		//   // let flag1 = 0;

		//   console.log("USE:",use)

		//   use.forEach(_info => {
		//     var s = new Date(_info.timestamp).toLocaleDateString()
		//     if(String(s).includes(da)){
		//       console.log("Timestamp OK",s)
		//     }
		//     else{
		//       console.log("42dfs324534",s)
		//     }
		//   })

		//   var st = from.substring(0,10)
		//   if(st.includes(da)){
		//     console.log("yes",from.substring(0,10))
		//   }
		//   else{
		//     console.log("nope",from.substring(0,10))
		//   }

		//   var x = new Date(from)
		//   var y = new Date(to)
		//   console.log("afjh332af",from<to)

		// let aa = await usageStatisticsModel.find({$and:[{email:"pinksurfing@yopmail.com"},{timestamp:{$gte:from,$lte:to}}]})

		// console.log("asdfahmfljkm",aa)

		let query = [];
		let query1 = [];
		if (user != '') {
			query.push({
				email: user,
			});
		}

		if (to != '') {
			query.push({
				timestamp: {
					$lte: new Date(to),
				},
			});
		}

		if (from != '') {
			query.push({
				timestamp: {
					$gte: new Date(from),
				},
			});
		}

		if (action != '') {
			query.push({
				action: action,
			});
		}
		console.log('Fasasfasf', query.length);

		let c = Object.keys(req.body).length;

		if (query.length == 0 || c == '0') {
			let result = await usageStatisticsModel.find({});

			res.status(200).send({
				status: 'success',
				result: result,
				error: 'nil',
			});
		} else if (query.length > 0) {
			console.log('QUERY', query);
			let user = await usageStatisticsModel.find({ $and: query });

			res.status(200).send({
				status: 'success',
				result: user,
				error: 'nil1',
			});
		}
	} catch (error) {
		res.status(500).send({
			status: 'fails',
			error: error,
		});
	}
});

dataRoutes.get('/dailyTransactions', async (req, res) => {
	let statistics_info = await statisticsModel.find({});

	res.send({
		status: 'success',
		data: statistics_info,
	});
});

dataRoutes.get('/MonthlyTransactions', async (req, res) => {
	let statistics_info = await statisticsModel.find({ monthly: 'monthly' });

	res.send({
		status: 'success',
		data: statistics_info,
	});
});

router.post('/updateAccountStatus', validate('updateAccountStatus'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}


	let {
		status,
		id,
		//kycData
	} = req.body;
	try {
		if (id.includes('.com')) {
			await accountsModel.updateOne(
				{
					email: id,
				},
				{
					$set: {
						accountStatus: status,
					},
				},
				{
					upsert: true,
				}
			);

			res.send({
				status: 'success',
				message: 'status_updated',
				error: 'nil',
			});
		} 
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			message: 'error_occured',
			error: 'error',
		});
	}
});

dataRoutes.get('/MonthTransaction', validate('MonthTransaction'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}

	let statistics_info = await statisticsModel.find({});
	let month = req.body.month;

	let result = [];
	statistics_info.forEach(_info => {
		if (_info.date.split('/')[1] == month) {
			result.push(_info.date);
		}
	});

	res.send({
		status: 'success',
		data: result,
	});
});

dataRoutes.get('/fee', async (req, res) => {
	let result = await feeModel.find({});

	console.log(result);

	res.status(200).send({
		status: 'success',
		data: result,
	});
});

dataRoutes.post('/updatefee', async (req, res) => {

	try {

		let { buyFee, sellFee, withdrawFee, sendFee, crypto } = req.body;

		if (crypto == 'USD') {

			let dataToInsert = {
				[`${req.body.crypto}`]: {
					withdrawFee: withdrawFee,
				},
			};

			let result = await feeModel.updateOne(
				{},
				{
					$set: dataToInsert,
				},
				{
					upsert: true,
				}
			);

			return res.status(200).send({
				status: 'Success',
				message: "Fee Updated"
			});

		}

		if (crypto != 'USD') {

			let dataToInsert = {
				[`${req.body.crypto}`]: {
					buyFee: buyFee,
					sellFee: sellFee,
					sendFee: sendFee
				},
			};

			let result = await feeModel.updateOne(
				{},
				{
					$set: dataToInsert,
				},
				{
					multi: true,
				}
			);

			return res.status(200).send({
				status: 'Success',
				message: "Fee Updated"
			});

		}


	} catch (error) {

		return res.status(500).send({
			status: "Success",
			error: "Err"
		})

	}


});

router.get('/globalSettings', async (req, res) => {
	try {
		let global = await settingsModel.find({});

		res.status(200).send({
			status: 'success',
			data: global,
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			data: '',
		});
	}
});

router.post('/addUser', validate('addUser'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}

	try {
		let User = req.body.user;
		User.country = 'India';
		User.language = 'English';
		User.id = User.email;
		User.ref = '1234';
		User.pin = '0000';
		User.kycStatus = 'pending';
		User.hasTransactionPin = true;

		let user = await accountsModel.find({ email: User.email }).lean().exec();

		if (user.length >= 1) {
			return res.send({
				message: 'Email exists',
			});
		} else {
			if (schema.validate(User.password)) {
				accountsModel.create(User, function (err, user) {
					if (err) {
						return res.send({
							status: false,
							message: 'An error has occured',
							data: User,
						});
					} else {
						return res.send({
							status: true,
							message: 'Saved successfully',
							data: User,
						});
					}
				});
			} else {
				res.status(500).send({
					status: 'fail',
					message: 'Password validation failed',
					error: 'error',
				});
			}
		}
	} catch (error) {
		console.log('DADas', error);
		return res.status(500).send({
			status: 'error',
			message: 'Error occured',
			error: 'error',
		});
	}
});

// KYC APPROVED LIST
dataRoutes.get('/getMemberList', async (req, res) => {
	accountsModel
		.find({
			$and: [
				{
					admin: {
						$ne: true,
					},
					$or: [{ kycStatus: 'approved' }],
				},
			],
		})
		.exec(function (err, user) {
			console.log(user);
			if (user.length > 0) {
				return res.send({ status: true, messsage: 'List Found', data: user });
			} else {
				return res.send({ status: false, messsage: 'List Not Found', data: user });
			}
		});
});


// KYC APPROVED LIST
dataRoutes.get('/getRegisterList', async (req, res) => {
	accountsModel
		.find({
			$and: [
				{
					admin: {
						$ne: true,
					},
					$or: [{ kycStatus: 'not_uploaded' }],
				},
			],
		})
		.exec(function (err, user) {
			console.log(user);
			if (user.length > 0) {
				return res.send({ status: true, messsage: 'List Found', data: user });
			} else {
				return res.send({ status: false, messsage: 'List Not Found', data: user });
			}
		});
});


dataRoutes.post('/getOneRegistered', async (req, res) => {


	let info = await accountsModel.findOne({ _id: req.body._id })
	console.log("Asdrwqrwqawq", info)

	accountsModel
		.find({
			$and: [
				{
					admin: {
						$ne: true,
					},
					_id: req.body._id,
				},
			],
		})
		.exec(function (err, user) {
			console.log(user);
			if (user.length > 0) {
				return res.send({
					status: true, messsage: 'List Found', data: user
				});
			} else {
				return res.send({ status: false, messsage: 'List Not Found', data: user });
			}
		});
});

dataRoutes.post('/getOneMember', validate('getOneMember'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}



	let info = await accountsModel.findOne({ _id: req.body._id })
	console.log("Asdrwqrwqawq", info)

	accountsModel
		.find({
			$and: [
				{
					admin: {
						$ne: true,
					},
					_id: req.body._id,
				},
			],
		})
		.exec(function (err, user) {
			console.log(user);
			if (user.length > 0) {
				return res.send({
					status: true, messsage: 'List Found', data: user, kyc: {
						license_front: config.kycImgPath + '/' + info.email + '_Driver License_id_1.jpg',
						license_back: config.kycImgPath + '/' + info.email + '_Driver License_id_2.jpg',
						idcard_front: config.kycImgPath + '/' + info.email + '_National Id Card_id_1.jpg',
						idcard_back: config.kycImgPath + '/' + info.email + '_National Id Card_id_2.jpg',
						passport_front: config.kycImgPath + '/' + info.email + '_Passport_id_1.jpg',
						passport_back: config.kycImgPath + '/' + info.email + '_Passport_id_1.jpg',
						legal_front: config.kycImgPath + '/' + info.email + '_legalName.jpg',
					}
				});
			} else {
				return res.send({ status: false, messsage: 'List Not Found', data: user });
			}
		});
});

dataRoutes.post('/getWalletBalance', validate('getWalletBalance'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}

	try {
		let wallet = [];
		let wallets = await walletModel
			.findOne({
				$and: [
					{
						admin: {
							$ne: true,
						},
						$or: [{ email: req.body.email }],
					},
				],
			})
			.lean()
			.exec();
		if (wallets != null) console.log('wallets', wallets.eth);
		if (wallets != null) {
			console.log('wallets', wallets);
			wallets.eth.balance = web3.utils.fromWei(wallets.eth.balance);
			let temp = Number(wallets.eth.balance) * 10 ** 8;
			temp = Math.trunc(temp);
			temp = Number(wallets.eth.balance) / 10 ** 8;
			temp = wallets.eth.balance.slice(0, 10);
			console.log('data');
			wallets.eth.balance = temp;
			console.log(temp);
			console.log('eth', wallets.eth.balance.slice(0, 10));

			return res.send({
				status: true,
				messsage: 'List Found',
				wallet: wallets,
				//  kyc: {
				//   docs: 'http://stsblockchain.cf:8083' + req.body.email + "_"+ 'undefined' +"_"+ "id_1.jpg",
				//   docs2: 'http://stsblockchain.cf:8083' + req.body.email + "_"+ 'TYPE' + "_"+ "id_1.jpg",
				//   // addressproof: 'http://5.189.141.68:8080/' + req.body.email + 'addressProof.jpg'
				// }
			});
		} else {
			return res.send({
				status: true,
				messsage: 'List Not Found',
				wallet: wallets,
			});
		}
	} catch (e) {
		console.log(e);
		res.status(500).send({
			status: 'fail',
			message: 'Internal_server_error',
			error: 'error',
		});
	}
});

dataRoutes.get('/getBankInfo', async (req, res) => {
	let result = await bankAccountModel.find({});

	res.status(200).send({
		status: 'success',
		data: result,
		error: 'nil',
	});
});

dataRoutes.post('/getBankInfoById', validate('getBankInfoById'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}

	let result = await bankAccountModel.find({ _id: req.body.id });

	res.status(200).send({
		status: 'success',
		data: result,
		error: 'nil',
	});
});

dataRoutes.get('/getKycStatus', async (req, res) => {
	accountsModel
		.find({
			$and: [
				{
					admin: {
						$ne: true,
					},
					$or: [{ kycStatus: 'pending' }, { kycStatus: 'rejected' }],
					adminLevel: {
						$ne: 1,
					},
					adminLevel: {
						$ne: 0,
					},
				},
			],
		})
		.exec(function (err, user) {
			if (accountsModel.length > 0) {
				return res.send({ status: true, messsage: 'List Found', data: user });
			} else {
				return res.send({ status: false, messsage: 'List Not Found', data: user });
			}
		});
});

dataRoutes.post('/getOneKyc', validate('getOneKyc'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}

	accountsModel
		.find({
			$and: [
				{
					admin: {
						$ne: true,
					},
					_id: req.body.id,
				},
			],
		})
		.exec(function (err, user) {
			if (accountsModel.length > 0) {
				return res.send({ status: true, messsage: 'List Found', data: user });
			} else {
				return res.send({ status: false, messsage: 'List Not Found', data: user });
			}
		});
});

dataRoutes.get('/getWithdraws', async (req, res) => {
	TransactionModel.find({
		$and: [
			{
				admin: {
					$ne: true,
				},
				$or: [{ type: 'withdraws' }],
			},
		],
	}).exec(function (err, user) {
		if (TransactionModel.length > 0) {
			return res.send({ status: true, messsage: 'List Found', data: user });
		} else {
			return res.send({ status: false, messsage: 'List Not Found', data: user });
		}
	});
});

dataRoutes.get('/getSend', async (req, res) => {
	TransactionModel.find({
		$and: [
			{
				admin: {
					$ne: true,
				},
				$or: [{ type: 'send' }],
			},
		],
	}).exec(function (err, user) {
		if (TransactionModel.length > 0) {
			return res.send({ status: true, messsage: 'List Found', data: user });
		} else {
			return res.send({ status: false, messsage: 'List Not Found', data: user });
		}
	});
});

dataRoutes.get('/getReceived', async (req, res) => {
	TransactionModel.find({
		$and: [
			{
				admin: {
					$ne: true,
				},
				$or: [{ type: 'received' }],
			},
		],
	}).exec(function (err, user) {
		if (TransactionModel.length > 0) {
			return res.send({ status: true, messsage: 'List Found', data: user });
		} else {
			return res.send({ status: false, messsage: 'List Not Found', data: user });
		}
	});
});

dataRoutes.get('/getTopups', async (req, res) => {
	TransactionModel.find({
		$and: [
			{
				admin: {
					$ne: true,
				},
				$or: [{ type: 'topups' }],
			},
		],
	}).exec(function (err, user) {
		if (TransactionModel.length > 0) {
			return res.send({ status: true, messsage: 'List Found', data: user });
		} else {
			return res.send({ status: false, messsage: 'List Not Found', data: user });
		}
	});
});

dataRoutes.post('/setMinimumBalance', async (req, res) => {
	let { btc, bch, eth, usdt, pax, trx, xrp } = req.body;

	try {
		data = await configModel.findOneAndUpdate(
			{ type: 'minBalance' },
			{
				$set: {
					type: 'minBalance',
					wallets: {
						btc: btc,
						bch: bch,
						eth: eth,
						usdt: usdt,
						pax: pax,
						trx: trx,
						xrp: xrp,
					},
				},
			},
			{ upsert: true }
		);

		res.status(200).send({
			status: 'success',
			message: 'Minimum Balance Found',
			data: data,
			Error: 'nil',
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			message: 'Minimum Balance Not Found',
			data: {},
			Error: 'Error',
		});
	}
});

dataRoutes.get('/getMinimumBalance', async (req, res) => {
	try {
		configModel.find({ type: 'minBalance' }).exec(function (err, result) {
			if (result.length > 0) {
				return res.status(200).send({
					status: 'success',
					message: 'Minimum Balance Found',
					result: result,
					error: 'nil',
				});
			} else {
				return res.send({
					status: 'fail',
					message: 'Minimum Balance Not Found',
					result: {},
					error: 'nil',
				});
			}
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			message: 'Error Occured',
			result: {},
			error: 'Error',
		});
	}
});

router.post('/updateSettings', async (req, res) => {
	try {
		let settings = req.body;

		let dataToInsert = {
			email: {
				host: settings.host,
				port: settings.port,
				user: settings.port,
				password: settings.password,
				audience: settings.audience,
			},
			//  adminAddress: settings.adminAddress,
			//  adminKey: settings.adminKey,
		};

		await settingsModel
			.updateOne(
				{},
				{ $set: dataToInsert },
				{
					upsert: true,
				}
			)
			.exec();

		res.send({
			status: 'success',
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
		});
	}
});

router.post('/auth/authentication', async (req, res) => {
	console.log('data');
	let { email, password } = req.body;
	console.log(req.body, email);
	let userData = await db.readFromDBAsync({ email: email }, 'accounts');
	console.log(userData);
	if (userData.message) {
		let user = userData['message'];
		// console.log(userData);
		if (user['password'] == password) {
			delete user['password'];

			let sessionId = jwt.sign(
				{
					//generate sessionId
					email: user['email'],
				},
				config.tokenAuth.password,
				{ expiresIn: '5d' }
			);
			user['sessionId'] = sessionId;

			//save the userData to memcache
			cache.create(cache.collectionName.session, email, user, 432000 * 1000); //expire after 5days
			// res.header('Authorization', sessionId)
			res.send({
				status: 'success',
				message: 'true',
				token: sessionId,
				error: 'nil',
				user: userData,
				userId: userData.message._id,
				authenticator: true,
			});
		} else {
			res.status(422).send({
				status: 'fail',
				message: 'incorrect password',
				error: 'nil',
			});
		}
	} else {
		//email not exists in db
		res.status(400).send({
			status: 'fail',
			message: 'email not found',
			error: 'nil',
		});
	}
});

router.post('/approveKYC', validate('approveKYC'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}

	let { status, email, kycData } = req.body;

	let supportedStatus = ['approved', 'rejected'];

	if (req.user.adminLevel != 0) {
		res.status(403).send({ status: 'fail', message: 'forbidden', error: 'nil' });
	}

	if (supportedStatus.indexOf(status) < 0) {
		res.status(422).send({ status: 'fail', message: 'invalid_value', error: 'nil' });
	}
	try {
		if(status == 'rejected'){
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

			cache.update(cache.collectionName.session, req.user.id, {
				passport: false,
				passportExpirationDate: null,
				idcard: false,
				license: false,
			});

			// await requestPromise.post({
			// 	url: config.services.fileService + '/deleteKYC',
			// 	formData: {
			// 		email: req.user.email,
			// 		type: req.body.type
			// 	},
			// });
		}
		await accountsModel.updateOne(
			{ email: email },
			{
				$set: {
					kycStatus: status,
				},
			}
		);

		// await db.insert({
		//   email: email,
		//   // kycData: kycData
		// }, "kycData")

		res.send({ status: 'success', message: 'status_updated', error: 'nil' });
	} catch (error) {
		res.status(500).send({ status: 'fail', message: 'error_occured', error: 'error' });
	}
});

router.post('/changePaassword', validate('changePaassword'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}

	let password = req.body.password;
	try {
		await db.updateOneAsync(
			{
				email: req.user.email,
			},
			{
				$set: {
					password: password,
				},
			},
			'accounts'
		);

		res.status(200).send({
			status: 'success',
			message: 'password updated',
			error: 'nil',
		});
	} catch (error) {
		res.status(422).send({
			status: 'fail',
			message: 'Error occured',
			error: 'nil',
		});
	}
});

//Get aadmin user's list

router.get('/getAdminList', async (req, res) => {
	accountsModel
		.find({
			$and: [
				{
					admin: {
						$ne: true,
					},
					$or: [
						// { "isAdmin": "true" },
						{ adminLevel: 0 },
					],
				},
			],
		})
		.exec(function (err, user) {
			console.log(user);
			if (user.length > 0) {
				return res.send({ status: true, messsage: 'List Found', data: user });
			} else {
				return res.send({ status: false, messsage: 'List Not Found', data: user });
			}
		});
});

router.post('/logout', async (req, res) => {
	let user = req.user;
	if (user == undefined || user == null) {
		res.status(422).send({
			status: 'fail',
			message: 'invalid token',
			error: 'error',
		});
		return;
	}
	try {
		cache.remove(cache.collectionName.session, user.email);
		res.send({
			status: 'success',
			message: 'Signed out...',
			error: 'nil',
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			message: 'Error occured',
			error: 'error',
		});
	}
});

router.post('/setActions', validate('setActions'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}

	let { action } = req.body;

	try {
		await actionsModel
			.updateOne(
				{},
				{
					$addToSet: {
						action: action,
					},
				},
				{
					upsert: true,
				}
			)
			.exec();

		let k = await actionsModel.find({});

		res.status(200).send({
			status: 'success',
			message: k,
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			message: 'Internal Server Error',
		});
	}
});

router.get('/showActions', async (req, res) => {
	try {
		let k = await actionsModel.find({});

		res.status(200).send({
			status: 'success',
			message: k,
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			message: 'Internal Server Error',
		});
	}
});

router.post('/approveTopUp', validate('approveTopUp'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}

	let { status, txnId } = req.body;

	// let supportedStatus = ['approved', 'rejected']

	if (req.user.adminLevel != 0) {
		res.status(403).send({ status: 'fail', message: 'forbidden', error: 'nil' });
	}

	// if (supportedStatus.indexOf(status) < 0) {
	//   res.status(422).send({ status: 'fail', message: 'invalid_value', error: 'nil' })
	// }
	try {
		let totalFiatBalance = 0;
		let depositAmount = 0;
		let debitAmount = 0;
		let buyAmount = 0;
		let sellAmount = 0;
		console.log('efwfvwfwe', txnId);

		let txHist = await transactionHistoriesModel.find({ txHash: txnId });
		let id = txHist[0].txHash;
		console.log(',ajvnhadmafs', id);

		if (txnId == id) {
			await transactionHistoriesModel.updateOne(
				{ txHash: txnId },
				{
					$set: {
						status: status,
					},
				},
				{
					upsert: true,
				}
			);

			let txns = await transactionHistoriesModel.find({ txHash: txnId }).lean().exec();
			let from = txns[0].email;
			let from1 = txns[0].phone;

			let txns1 = await transactionHistoriesModel
				.find({ $or: [{ email: from }, { phone: from1 }] })
				.lean()
				.exec();

			txns1.forEach(result => {
				if (result.type == 'topups' && result.status == 'completed') {
					depositAmount += Number(result.sourceAmount);
				}
				if (result.type == 'withdraws' && result.status == 'completed') {
					debitAmount += Number(result.sourceAmount);
				}
				if (result.type == 'buy' && result.status == 'completed') {
					buyAmount += Number(result.fiatAmount);
				}
				if (result.type == 'sell' && result.status == 'completed') {
					sellAmount += Number(result.fiatAmount);
				}
			});

			depositAmount += sellAmount;
			debitAmount += buyAmount;
			totalFiatBalance = depositAmount - debitAmount;

			let acc = await accountsModel.updateOne(
				{ email: from },
				{
					$set: {
						fiatBalance: totalFiatBalance,
					},
				},
				{
					upsert: true,
				}
			);


			let a = await accountsModel.find({ $or: [{ email: from }, { phone: from1 }] });
			console.log('DEPOSITED AMT:', from);
			console.log('DEBIT AMT:', from1);
			console.log('DEPOSITED AMT:', buyAmount);
			console.log('DEBIT AMT:', sellAmount);
			console.log('TOTAL AMT:', a);

			res.status(200).send({ status: 'success', message: 'status_updated', error: 'nil' });
		} else {
			res.status(500).send({
				status: 'fail',
				message: 'id not found',
			});
		}
	} catch (error) {
		res.status(500).send({ status: 'fail', message: 'error_occured', error: error });
	}
});

router.post('/approveWithdraw', validate('approveWithdraw'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}

	var { status, txnId } = req.body;

	if (req.user.adminLevel != 0) {
		res.status(403).send({ status: 'fail', message: 'forbidden', error: 'nil' });
	}

	try {
		let totalFiatBalance = 0;
		let depositAmount = 0;
		let debitAmount = 0;
		let buyAmount = 0;
		let sellAmount = 0;

		let txns = await transactionHistoriesModel.find({
			txHash: txnId
		}).lean().exec()

		console.log(txns)

		if (txns.length > 0) {
			if (status == 'completed' || status == 'failed') {
				await transactionHistoriesModel.updateOne(
					{ txHash: txnId },
					{
						$set: {
							status: status,
						},
					},
					{
						upsert: true,
					}
				);

				let txns = await transactionHistoriesModel.find({ txHash: txnId }).lean().exec();
				let from = txns[0].email;
				let from1 = txns[0].phone;

				let txns1 = await transactionHistoriesModel
					.find({ $or: [{ email: from }, { phone: from1 }] })
					.lean()
					.exec();

				txns1.forEach(result => {
					if (result.type == 'topups' && result.status == 'completed') {
						depositAmount += Number(result.sourceAmount);
					}
					if (result.type == 'withdraws' && result.status == 'completed') {
						debitAmount += Number(result.sourceAmount);
					}
					if (result.type == 'buy' && result.status == 'completed') {
						buyAmount += Number(result.fiatAmount);
					}
					if (result.type == 'sell' && result.status == 'completed') {
						sellAmount += Number(result.fiatAmount);
					}
				});

				depositAmount += sellAmount;
				debitAmount += buyAmount;
				totalFiatBalance = depositAmount - debitAmount;

				let accInfo = await accountsModel.findOne({ email: from })

				totalFiatBalance = Number(accInfo.fiatBalance) - (Number(txns[0].sourceAmount) + Number(txns[0].payOutProfit))

				let acc = await accountsModel
					.updateOne(
						{ $or: [{ email: from }, { phone: from1 }] },
						{
							$set: {
								fiatBalance: totalFiatBalance,
							},
						},
						{
							upsert: true,
						}
					)
					.lean()
					.exec();

				// console.log("DEPOSITED AMT:", depositAmount)
				// console.log("DEBIT AMT:", debitAmount)

				// totalFiatBalance = depositAmount - debitAmount
				console.log('Total', totalFiatBalance);

				res.status(200).send({ status: 'success', message: 'status_updated', error: 'nil' });
			} else if (status == 'cancelled') {
				let txns = await transactionHistoriesModel.find({ txHash: txnId }).lean().exec();
				let from = txns[0].from;

				let txns1 = await transactionHistoriesModel
					.updateOne(
						{ $and: [{ type: 'withdraws' }, { from: from }, { status: 'pending' }, { txHash: txnId }] },
						{
							$set: {
								status: 'cancelled',
							},
						}
					)
					.lean()
					.exec();

				txns1 = await transactionHistoriesModel.find({ from: from }).lean().exec();

				res.status(200).send({ status: 'success', message: 'status_updated', error: 'nil' });
			}
		} else {
			res.status(500).send({
				status: 'fail',
				message: 'error !',
			});
		}
	} catch (error) {
		res.status(500).send({ status: 'fail', message: 'error_occured', error: error });
	}
});

router.post('/removeActions', validate('removeActions'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}

	try {
		let { action } = req.body;

		await actionsModel
			.updateOne(
				{},
				{
					$pull: {
						action: action,
					},
				}
			)
			.lean()
			.exec();

		// let result = await accountsModel.findOne({email:req.user.email})

		res.status(200).send({
			status: 'success',
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			message: 'Internal Server Error',
		});
	}
});

router.use(fileUpload());

router.post('/upload', async (req, res) => {
	try {
		let file1 = req.files.file1;

		let url = 'http://stsblockchain.cf:8083/a.txt';

		console.log('Sfasfasfasfafs', req.files.file1);

		fs.readFile(url, 'utf-8', function (err, data) {
			console.log('data', data.toString());

			// var newValue = data.replace(/Z/gim, 'name');

			// fs.writeFile(file1, newValue, 'utf-8', function(err, data) {
			//     if (err) throw err;
			//     console.log('Done!');
			// })
		});
	} catch (error) {
		console.log('ERRKJFHS', error);

		res.status(500).send({
			status: 'fail',
			error: '',
		});
	}
});

router.get('/totalUsers', async (req, res) => {
	try {
		let accounts = await accountsModel.find({});

		res.status(200).send({
			status: 'success',
			data: accounts,
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			error: '',
		});
	}
});

router.get('/dashboard', async (req, res) => {
	// GRAPHS
	let statistics_info = await statisticsModel.find({});
	// USERS COUNT
	let accounts_info = await accountsModel.find({});

	let accounts_count = Object.keys(accounts_info).length;
	// WALLETS

	let ref = Number(config.wallet.ref);
	let wallet = web3.eth.accounts.wallet; //.create(0)
	wallet.clear();
	wallet = wallet.create(0);
	wallet.add(await getWallet(ref));

	let privateKey = await getWallet(ref);

	console.log('asfafasdasdeser24323423', wallet[0].address, getWallet(ref));

	let eth = await web3.eth.getBalance(wallet[0].address);
	let usdt = new web3.eth.Contract(ABI, config.wallet.contracts[0].address);
	let usdtBalance = String(await usdt.methods.balanceOf(wallet[0].address).call());

	let btc = await requestPromise.get({
		url: config.services.btcService + '/getAdminBalance',
		method: 'GET',
		json: true,
		simple:true
	})
	var btcBalance = btc.message

	let mybiz = new web3.eth.Contract(ABI, config.wallet.contracts[1].address);
	let mybizBalance = String(await mybiz.methods.balanceOf(wallet[0].address).call());

	// payOut Profit
	let transaction = await transactionHistoriesModel.find({ $or: [{ type: 'sell' }, { type: 'buy' },{ type: "withdraws" }] });

	let currentPayOut = 0;
	let prevPayOut = 0;
	let currWeekPayOut = 0;
	let lastWeekPayOut = 0;

	var now = new Date();
	var startOfMonth = new Date(now.getFullYear(), now.getMonth());
	var endofMonth = new Date(now.getFullYear(), now.getMonth() + 1);
	var currTimestamp = +(startOfMonth / 1000 + '' + '000');
	var nextTimestamp = +(endofMonth / 1000 + '' + '000');

	var prevofMonth = new Date(now.getFullYear(), now.getMonth() - 1);
	var currTimestamp = +(startOfMonth / 1000 + '' + '000');
	var prevTimestamp = +(prevofMonth / 1000 + '' + '000');

	var firstday = new Date(now.setDate(now.getDate() - now.getDay()));
	var lastday = new Date(now.setDate(now.getDate() - now.getDay() + 6));

	var prevWeekDay = new Date(now.setDate(now.getDate() - now.getDay() - 7));

	console.log('curr', +firstday);
	console.log('next', lastday);
	console.log('next', prevWeekDay);

	transaction.forEach(result => {
		if (result.payOutProfit != undefined && result.timestamp > currTimestamp && result.timestamp < nextTimestamp) {
			currentPayOut += Number(result.payOutProfit);
		}
		if (result.payOutProfit != undefined && result.timestamp < currTimestamp && result.timestamp > prevTimestamp) {
			prevPayOut += Number(result.payOutProfit);
		}
		if (result.payOutProfit != undefined && result.timestamp > +firstday && result.timestamp < +lastday) {
			currWeekPayOut += Number(result.payOutProfit);
		}
		if (result.payOutProfit != undefined && result.timestamp < +firstday && result.timestamp > +prevWeekDay) {
			lastWeekPayOut += Number(result.payOutProfit);
		}
	});

	let currTransferProfit = 0;
	let prevTransferProfit = 0;
	let currWeekTransfer = 0;
	let prevWeekTransfer = 0;

	let transactions = await transactionHistoriesModel.find({ type: 'send' });

	transactions.forEach(result => {
		if (result.fee != undefined && result.timestamp > currTimestamp && result.timestamp < nextTimestamp) {
			currTransferProfit += Number(result.fee);
		}
		if (result.fee != undefined && result.timestamp < currTimestamp && result.timestamp > prevTimestamp) {
			prevTransferProfit += Number(result.fee);
		}
		if (result.fee != undefined && result.timestamp > +firstday && result.timestamp < +lastday) {
			currWeekTransfer += Number(result.fee);
		}
		if (result.fee != undefined && result.timestamp < +firstday && result.timestamp > +prevWeekDay) {
			prevWeekTransfer += Number(result.fee);
		}
	});

	let Info = await marketInfo.findOne({})

	let currTransfer = (Number(currTransferProfit) * Number(Info["ETH"].price))

	let prevTransfer = (Number(prevTransferProfit) * Number(Info["ETH"].price))

	let currTransfer_week = (Number(currWeekTransfer) * Number(Info["ETH"].price))

	let prevTransfer_week = (Number(prevWeekTransfer) * Number(Info["ETH"].price))


	res.send({
		status: 'success',
		graph: statistics_info,
		total_users: accounts_count,
		walletBalances: {
			BTC: Number(btcBalance).toFixed(5),
			ETH: Number(eth / 10 ** 18).toFixed(5),
			USDT: Number(usdtBalance / 10 ** 6).toFixed(5),
			MYBIZ: Number(mybizBalance / 10 ** 6).toFixed(5),
		},
		currentMonth: {
			payOutProfit: Number(currentPayOut).toFixed(5),
			// transferProfit:currAmt,
			transferProfit: 0,
			// totalProfit:Number(currentPayOut)+Number(currAmt),
			totalProfit: Number(currentPayOut).toFixed(5),
		},
		lastMonth: {
			payOutProfit: Number(prevPayOut).toFixed(5),
			// transferProfit:prevAmt,
			transferProfit: 0,
			// totalProfit:Number(prevPayOut)+Number(prevAmt),
			totalProfit: Number(prevPayOut).toFixed(5),
		},
		currentWeek: {
			payOutProfit: Number(currWeekPayOut).toFixed(5),
			// transferProfit:currAmt_week,
			transferProfit: 0,
			// totalProfit:Number(currWeekPayOut)+Number(currAmt_week),
			totalProfit: Number(currWeekPayOut).toFixed(5),
		},
		lastWeek: {
			payOutProfit: Number(lastWeekPayOut).toFixed(5),
			// transferProfit:prevAmt_week,
			transferProfit: 0,
			// totalProfit:Number(lastWeekPayOut)+Number(prevAmt_week),
			totalProfit: Number(lastWeekPayOut).toFixed(5),
		},
	});
});

router.get('/topUpQR', async (req, res) => {
	try {
		let qr = [];
		let address = String(config.admin.address);

		QRCode.toDataURL(address, async function (err, data) {
			qr.push(data);
			res.status(200).send({
				status: 'success',
				result: data,
			});

			return;
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			error: '',
		});
	}
});

// CURRENCY -> CRYPTOWALLETS
router.get('/cryptoWallets', async (req, res) => {
	try {
		let wallet_eth = 0;
		let wallet_usdt = 0;
		let wallet_mybiz = 0;
		let wallet_btc = 0;

		let wallet = await walletModel.find({});

		wallet.forEach(result => {
			wallet_eth += Number(result.eth.balance);
			wallet_mybiz += Number(result.mybiz.balance);
			wallet_usdt += Number(result.usdt.balance);
			wallet_btc += Number(result.btc.balance);
		});

		res.status(200).send({
			status: 'success',
			BTC: wallet_btc,
			ETH: Number(wallet_eth) / (10 ** 18),
			USDT: wallet_usdt,
			MYBIZ: wallet_mybiz,
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			error: '',
		});
	}
});

router.get('/escrowBalances', async (req, res) => {
	try {
		let tx_withdraw = await transactionHistoriesModel.find({ type: 'withdraws' });
		let tx_buy = await transactionHistoriesModel.find({ type: 'buy' });
		let tx_send = await transactionHistoriesModel.find({ $or: [{ type: 'send' }, { type: 'sell' }] });

		let ethB = 0;
		let usdtB = 0;
		let mybizB = 0;
		let btcB = 0;

		tx_send.forEach(result => {
			if (result.status == 'pending' && result.source == 'eth' && result.sourceAmount != undefined) {
				ethB += Number(result.sourceAmount);
			}
			if (result.status == 'pending' && result.source == 'usdt' && result.sourceAmount != undefined) {
				usdtB += Number(result.sourceAmount);
			}
			if (result.status == 'pending' && result.source == 'mybiz' && result.sourceAmount != undefined) {
				mybizB += Number(result.sourceAmount);
			}
			if (result.status == 'pending' && result.source == 'btc' && result.sourceAmount != undefined) {
				btcB += Number(result.sourceAmount);
			}
		});
		console.log('2222222222222222222222222');

		let buyF = 0;
		let withdrawF = 0;

		tx_withdraw.forEach(result => {
			if (result.status != 'completed') {
				withdrawF += Number(result.sourceAmount);
			}
		});

		tx_buy.forEach(result => {
			if (result.status != 'completed' && result.fiatAmount != undefined) {
				buyF += Number(result.fiatAmount);
			}
		});

		res.status(200).send({
			status: 'success',
			USD: {
				currency: 'USD',
				balance: withdrawF + buyF,
			},
			ETH: {
				currency: 'ETH',
				balance: ethB,
			},
			BTC: {
				currency: 'BTC',
				balance: btcB,
			},
			USDT: {
				currency: 'USDT',
				balance: usdtB,
			},
			MYBIZ: {
				currency: 'MYBIZ',
				balance: mybizB,
			}
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			error: '',
		});
	}
});

// CURRENCY -> CURRENCY LEDGER
router.get('/ledger', async (req, res) => {
	try {
		var now = new Date();
		// FIRST DAY OF WEEK
		var firstday = new Date(now.setDate(now.getDate() - now.getDay()));
		// LAST DAY OF WEEK
		var lastday = new Date(now.setDate(now.getDate() - now.getDay() + 6));

		let wallet = await walletModel.find({});
		let acc = await accountsModel.find({ adminLevel: { $ne: 0 } });
		let tx_withdraw = await transactionHistoriesModel.find({ type: 'withdraws' });
		let tx_buy = await transactionHistoriesModel.find({ type: 'buy' });
		let tx_send = await transactionHistoriesModel.find({ $or: [{ type: 'send' }, { type: 'sell' }] });

		let withdrawF = 0;
		let buyF = 0;
		let balances = 0;
		let wallet_eth = 0;
		let wallet_usdt = 0;
		let wallet_mybiz = 0;
		let wallet_btc = 0;

		wallet.forEach(result => {
			wallet_eth += Number(result.eth.balance);
			wallet_usdt += Number(result.usdt.balance);
			wallet_mybiz += Number(result.mybiz.balance);
			wallet_btc += Number(result.btc.balance);
		});

		acc.forEach(result => {
			if (result.fiatBalance != undefined) {
				balances += Number(result.fiatBalance);
			}
		});

		tx_withdraw.forEach(result => {
			if (result.status == 'completed' && result.timestamp > +firstday && result.timestamp < +lastday) {
				withdrawF += Number(result.sourceAmount);
			}
		});

		tx_buy.forEach(result => {
			if (
				result.status == 'completed' &&
				result.fiatAmount != undefined &&
				result.timestamp > +firstday &&
				result.timestamp < +lastday
			) {
				buyF += Number(result.fiatAmount);
			}
		});

		let ethB = 0;
		let usdtB = 0;
		let mybizB = 0;
		let btcB = 0;

		tx_send.forEach(result => {
			if (
				result.status == 'completed' &&
				result.source == 'eth' &&
				result.sourceAmount != undefined &&
				result.timestamp > +firstday &&
				result.timestamp < +lastday
			) {
				ethB += Number(result.sourceAmount);
			}
			if (
				result.status == 'completed' &&
				result.source == 'usdt' &&
				result.sourceAmount != undefined &&
				result.timestamp > +firstday &&
				result.timestamp < +lastday
			) {
				usdtB += Number(result.sourceAmount);
			}
			if (
				result.status == 'completed' &&
				result.source == 'mybiz' &&
				result.sourceAmount != undefined &&
				result.timestamp > +firstday &&
				result.timestamp < +lastday
			) {
				mybizB += Number(result.sourceAmount);
			}
			if (
				result.status == 'completed' &&
				result.source == 'btc' &&
				result.sourceAmount != undefined &&
				result.timestamp > +firstday &&
				result.timestamp < +lastday
			) {
				btcB += Number(result.sourceAmount);
			}
		});

		res.status(200).send({
			status: 'success',
			USD: {
				start: firstday,
				stop: lastday,
				currency: 'USD',
				balance: balances,
				total_withdraw: withdrawF + buyF,
			},
			ETH: {
				start: firstday,
				stop: lastday,
				currency: 'ETH',
				balance: wallet_eth / 10 ** 18,
				total_withdraw: ethB,
			},
			USDT: {
				start: firstday,
				stop: lastday,
				currency: 'USDT',
				balance: wallet_usdt,
				total_withdraw: usdtB,
			},
			MYBIZ: {
				start: firstday,
				stop: lastday,
				currency: 'MYBIZ',
				balance: wallet_mybiz,
				total_withdraw: mybizB,
			},
			BTC: {
				start: firstday,
				stop: lastday,
				currency: 'BTC',
				balance: wallet_btc,
				total_withdraw: btcB,
			},
		});
	} catch (error) {
		console.log("ERROR", error)
		res.status(500).send({
			status: 'fail',
		});
	}
});

router.get('/bankDetailsAdmin', async (req, res) => {
	try {
		let result = await bankAccountModel.find({ admin: true });

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

router.post('/addBankDetail', validate('addBankDetail'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}

	let {
		bankName,
		accountNumber,
		accountHolderName,
		accountType,
		homeAddress,
		branch,
		city,
		zipCode,
		swiftCode,
		country,
	} = req.body;

	try {
		console.log('ASFasfa', req.user.id);
		// ADDING BANK DETAILS
		await bankAccountModel.updateOne(
			{ admin: true },
			{
				$set: {
					bankName: bankName,
					accountNumber: accountNumber,
					accountHolderName: accountHolderName,
					accountType: accountType,
					homeAddress: homeAddress,
					branch: branch,
					city: city,
					admin: true,
					zipCode: zipCode,
					swiftCode: swiftCode,
					country: country,
				},
			},
			{
				upsert: true,
			}
		);

		let result = await bankAccountModel.find({ admin: true });

		res.status(200).send({
			status: 'Bank Details added successfully',
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

router.get('/countryCodes', async (req, res) => {
	let codes = c_s.getCountries();

	let c = codes[0];

	let result = [];

	for (var name in codes) {
		if (codes.hasOwnProperty(name)) {
			result.push({
				name: codes[name].name,
				code: codes[name].code,
				dial_code: codes[name].dial_code,
				value: codes[name].dial_code.replace('+', ''),
			});
		}
	}

	res.status(200).send({
		status: 'success',
		result: result,
	});
});

dataRoutes.post('/getOneTxHistory', validate('getOneTxHistory'), async (req, res) => {

	let errors = validationResult(req)
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: "fail",
			message: "Validation Failed",
			error: errors
		})
		return
	}

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
					email: req.body.email,
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
					$and: [{ type: 'topups' }, { email: req.body.email }],
				},
			},
			{
				$project: { sourceAmount: 1, target: 1, targetAmount: 1, type: 1, status: 1, timestamp: 1 },
			},
		]);

		let send = await transactionHistoriesModel.aggregate([
			{
				$match: {
					$and: [{ type: 'send' }, { email: req.body.email }],
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
					$and: [{ type: 'received' }, { email: req.body.email }],
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
					$and: [{ type: 'withdraws' }, { email: req.body.email }],
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
		res.status(500).send({
			status: 'fail',
			message: 'error_occured',
			error: 'error',
		});
	}
});

dataRoutes.get('/getTxHistory', async (req, res) => {
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
					// email: req.body.email,
				},
			},
			{
				$project: {
					email: 1,
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
					type: 'topups',
				},
			},
			{
				$project: { email: 1, sourceAmount: 1, target: 1, targetAmount: 1, type: 1, status: 1, timestamp: 1 },
			},
		]);

		let send = await transactionHistoriesModel.aggregate([
			{
				$match: {
					type: 'send',
				},
			},
			{
				$project: {
					_id: 1,
					email: 1,
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
					type: 'received',
				},
			},
			{
				$project: {
					_id: 1,
					email: 1,
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
					type: 'withdraws',
				},
			},
			{
				$project: {
					_id: 1,
					email: 1,
					sourceAmount: 1,
					target: 1,
					targetAmount: 1,
					type: 1,
					status: 1,
					timestamp: 1,
				},
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
		res.status(500).send({
			status: 'fail',
			message: 'error_occured',
			error: 'error',
		});
	}
});

router.post('/updateMarketDataKey', async (req, res) => {

	try {

		let settings = await settingsModel.findOne({})

		await settingsModel
			.updateOne(
				{},
				{ $set: { marketDataKey: req.body.marketDataKey } },
				{
					upsert: true,
				}
			)
			.exec();

		return res.status(200).send({
			status: "Success",
			message: "API Key Updated Successfully"
		})

	} catch (error) {

		return res.status(500).send({
			status: "Fail",
			message: "Err"
		})


	}

})


module.exports = router;
