const express = require('express');
const router = express.Router();
const fs = require('fs');
const WAValidator = require('wallet-address-validator');
const fileUpload = require('express-fileupload');
const c_s = require('country-state-picker');
const requestPromise = require('request-promise');
const path = require('path');
var speakeasy = require('speakeasy');
var QRCode = require('qrcode');
const requestIp = require('request-ip');
const country_currency = require('country-currency-map');
var moment = require('moment-timezone');
require('dotenv').config();

const config = require('../config');
const tokenVerification = require('../lib/jwt');
const db = require('../lib/db');
const constants = require('../constants/constants');
const cache = require('../lib/cache');

const walletModel = require('../models/wallets');
const whitelistModel = require('../models/whitelist');
const accountsModel = require('../models/accountsModel');
let bankAccountModel = require('../models/bankAccount');
let bankCardModel = require('../models/bankCard');
const usageStaticsModel = require('../models/usageStatistics');
const settingsModel = require('../models/settings');

const body = require('express-validator').body;
const header = require('express-validator').header;
const query = require('express-validator').query;
const validationResult = require('express-validator').validationResult;
var passwordValidator = require('password-validator')
var schema = new passwordValidator();
// PASSWORD VALIDATION REQUIREMENTS
schema
.is().min(8)                                    // Minimum length 8
.is().max(16)                                  // Maximum length 16
.has().uppercase()                              // Must have uppercase letters
.has().lowercase()                              // Must have lowercase letters
.has().digits()                                 // Must have digits
.has().symbols()                              // Must have symbols
.has().not().spaces()                           // Should not have spaces


const {createHash} = require('crypto'); 
const crypto = require('crypto')
// C R E A T I N G     A     H A S H     V A L U E    F O R    T H E    P A S S W O R D 
function hash(data) {
    return createHash('md5').update(data).digest('hex');
}


var algorithm = "aes-192-cbc"; //algorithm to use
var password = "Hello darkness";
const key = crypto.scryptSync(password, 'salt', 24); //create key
const iv = Buffer.alloc(16, 0);


function encrypt(text) {

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    var encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex'); // encrypted text
    return encrypted;    

}
   
function decrypt(text) {

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    var decrypted = decipher.update(text, 'hex', 'utf8') + decipher.final('utf8'); //deciphered text
    return decrypted

}

const validate = routeName => {
	switch (routeName) {

		case 'changeNumber':
			return [ body('phone').exists() ];

		case 'myProfile':
			return [ body('name').exists().notEmpty().isString() ];

		case 'personalDetails':
			return [
				body('dob').exists(),
				body('streetAddress').exists().isString(),
				body('unit').exists().notEmpty(),
				body('city').exists().isString(),
				body('state').exists().isString(),
				body('postalCode').exists().notEmpty(),
				body('country').exists().isString(),
			];

		case 'addBankDetails':
			return [
				body('bankName').exists().isString(),
				body('accountNumber').exists().notEmpty(),
				body('accountHolderName').exists().isString(),
				body('accountType').exists().isString(),
				body('homeAddress').exists().isString(),
				body('branch').exists().isString(),
				body('city').exists().isString(),
				body('zipCode').exists().notEmpty(),
				body('swiftCode').exists().notEmpty(),
				body('country').exists().isString(),
				body('city').exists().isString(),
			];

		case 'addCreditCard':
			return [
				body('name').exists().isString(),
				body('cardNumber').exists().notEmpty(),
				body('address').exists().isString(),
				body('cardHolderName').exists().isString(),
				body('city').exists().isString(),
				body('zipCode').exists().notEmpty(),
				body('expireDate').exists().isISO8601(),
				body('swiftCode').exists().notEmpty(),
				body('country').exists().isString(),
				body('cvv').exists().notEmpty(),
			];

		case 'updatekyc':
			return [ body('type').exists().notEmpty() ];
		case 'changePin':
			return [ body('newPin').exists().notEmpty(), body('oldPin').exists().notEmpty() ];

		case 'preferences':
			return [ body('localCurrency').exists().notEmpty(), body('timeZone').exists().notEmpty() ];

		case 'changePassword':
			return [ body('newPassword').exists().notEmpty(), body('oldPassword').exists().notEmpty() ];

		case 'setSecurityQuestion':
			return [ body('securityQuestion').exists().notEmpty(), body('answer').exists().notEmpty() ];

		case 'updateLanguage':
			return [ body('language').exists().isString() ];

		case 'updateCurrency':
			return [ body('currency').exists().isString() ];

		case 'gAuth':
			return [
				body('password').exists().notEmpty(),
				body('gCode').exists().notEmpty(),
				// body('otp').exists().notEmpty(),
			];

		case 'disableAuth2':
			return [ body('status').exists().notEmpty() ];

		case 'setCoinStatus':
			return [ body('status').exists().notEmpty(), body('symbol').exists().notEmpty() ];

		case 'setFCMToken':
			return [ body('FCMToken').exists().notEmpty() ];

		case 'setWhitelisted':
			return [
				body('addr').exists().isString(),
				body('label').exists().notEmpty(),
				body('coin').exists().isString(),
				body('type').exists().isString(),
				body('authCode').exists().isString(),
			];

		case 'removeWhitelisted':
			return [
				body('addr').exists().isString(),
				body('label').exists().notEmpty(),
				body('coin').exists().isString(),
				body('type').exists().isString(),
				body('authCode').exists().isString(),
			];

		case 'toggleWhitelist':
			return [
				body('flag').exists(),
				body('type').exists().notEmpty(),
				body('authCode').exists().isString(),
			];

		case 'getWhitelisted':
			return [
				body('flag').exists().notEmpty(),
				body('type').exists().notEmpty(),
				body('authCode').exists().notEmpty(),
			];

		case 'addWhitelist':
			return [
				body('coin').exists().notEmpty(),
				body('label').exists().notEmpty(),
				body('address').exists().isString(),
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


//All other routes require auth tokens.

router.use(tokenVerification);
//router.use(fileUpload()); // For getting kycDocumets

// L I S T    C O U N T R Y    C O D E S 
router.get('/countryCodes', async (req, res) => {
	let codes = c_s.getCountries();

	let c = codes[0];

	let result = [];

	for (var name in codes) {
		if (codes.hasOwnProperty(name) && codes[name].code == 'us') {
			result.push({
				name: codes[name].name,
				code: codes[name].code,
				dial_code: codes[name].dial_code,
				value: codes[name].dial_code.replace('+', ''),
			});
		}
	}

	for (var name in codes) {
		if (codes.hasOwnProperty(name) && codes[name].code != 'us') {
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

// L I S T    S T A T E S 
router.post('/listStates', async (req, res) => {
	let errors = validationResult(req);
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: 'fail',
			message: 'Validation Failed',
			error: errors,
		});
		return;
	}
	let { country } = req.body;

	if (country != null) {
		let a = c_s.getFilteredCountries([ country ]);

		let states = c_s.getStates(a[0].code);

		let result = [];

		for (var name in states) {
			if (states.hasOwnProperty(name)) {
				result.push({ name: states[name], value: states[name] });
			}
		}

		res.status(200).send({
			status: 'success',
			states: result,
		});
	} else {
		res.status(412).send({
			status: 'fail',
			error: '',
		});
	}
});

// L I S T    C U R R E N C I E S 
router.get('/listCurrencies', async (req, res) => {
	let currencies = country_currency.getCurrencyList();

	let result = [];

	for (var name in currencies) {
		if (currencies.hasOwnProperty(name) && currencies[name].abbr == 'USD') {
			result.push({
				name: currencies[name].name,
				value: currencies[name].abbr,
				symbol: currencies[name].symbolFormat.replace('{#}', ''),
			});
		}
	}

	for (var name in currencies) {
		if (currencies.hasOwnProperty(name) && currencies[name].abbr != 'USD') {
			result.push({
				name: currencies[name].name,
				value: currencies[name].abbr,
				symbol: currencies[name].symbolFormat.replace('{#}', ''),
			});
		}
	}

	res.status(200).send({
		status: 'success',
		currencies: result,
	});
});

// L I S T    T I M E Z O N E S 
router.get('/listTimeZones', async (req, res) => {
	var timeZones = moment.tz.names();

	console.log("TIMEZONES", moment.tz.Zone)

	var offsetTmz = [];

	var a = moment.tz(timeZones[0]);

	let result = [];

	for (var name in timeZones) {
		if (timeZones.hasOwnProperty(name) && timeZones[name].includes("America")) {
			result.push({
				name: '(' + moment.tz(timeZones[name]).format('ha z') + ')' + timeZones[name],
				value: moment.tz(timeZones[name]).format('ha z'),
			});
		}
	}

	for (var name in timeZones) {
		if (timeZones.hasOwnProperty(name) && (!timeZones[name].includes("America"))) {
			result.push({
				name: '(' + moment.tz(timeZones[name]).format('ha z') + ')' + timeZones[name],
				value: moment.tz(timeZones[name]).format('ha z'),
			});
		}
	}

	res.status(200).send({
		status: 'success',
		timeZones: result,
	});
});

router.post('/myProfile', validate('myProfile'), async (req, res) => {
	let errors = validationResult(req);
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: 'fail',
			message: 'Validation Failed',
			error: errors,
		});
		return;
	}
	let { countrycode, phone, name} = req.body;

	// var name = name   // "Paul Steve Pakkal" // try "Paul", "Paul Steve"
	var first_name = name.split(' ')[0]
	var last_name = name.substring(first_name.length).trim()
	// console.log(first_name)
	// console.log(last_name)

	try {
		await accountsModel.updateOne(
			{ email: req.user.email },
			{
				$set: {
					countrycode: countrycode,
					phone: phone,
					name: name,
					firstName:first_name,
					lastName: last_name
				},
			},
			{
				multi: true,
			}
		);	
	cache.update(cache.collectionName.session, req.user.email, {
	                                        firstName:first_name,
                                        lastName: last_name
        })

		let result = await accountsModel.find({});
	
		res.status(200).send({
			status: 'success',
			data: 'Details updated!',
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			message: 'Internal Server Error',
		});
	}
});

router.post('/changeNumber', validate('changeNumber'), async (req, res) => {
	let errors = validationResult(req);
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: 'fail',
			message: 'Validation Failed',
			error: errors,
		});
		return;
	}
	let { countrycode, phone} = req.body;

	try {
		await accountsModel.updateOne(
			{ email: req.user.email },
			{
				$set: {
					countrycode: countrycode,
					phone: phone
				},
			},
			{
				multi: true,
			}
		);

		let result = await accountsModel.find({});

		res.status(200).send({
			status: 'success',
			data: 'Details updated!',
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			message: 'Internal Server Error',
		});
	}
});
// U P D A T E    P E R S O N A L    D E T A I L S
router.post('/personalDetails', validate('personalDetails'), async (req, res) => {
	let errors = validationResult(req);
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: 'fail',
			message: 'Validation Failed',
			error: errors,
		});
		return;
	}
	let { dob, streetAddress, unit, city, state, postalCode, country } = req.body;

	let ccode ;

	try {

		if (country != null) {
			let codes = c_s.getCountries();

			let c = codes[0];

			let countrycode;
		
			var resultss = [];
		
			for (var name in codes) {
				if (codes.hasOwnProperty(name)&& (codes[name].name).toUpperCase()==country.toUpperCase()) {
										
					resultss.push({
						name: codes[name].name,
						code: codes[name].code,
						dial_code: codes[name].dial_code,
						value: codes[name].dial_code.replace('+', ''),
					});
				}
			}

			console.log("COUNTRY",resultss)

		}


		ccode = (resultss[0].code).toUpperCase()

		await accountsModel.updateOne(
			{ email: req.user.email },
			{
				$set: {
					dob: dob,
					streetAddress: streetAddress,
					unit: unit,
					city: city,
					state: state,
					postalCode: postalCode,
					country: country,
					countrycode:ccode
				},
			},
			{
				multi: true,
			}
		);

		let result = await accountsModel.find({});

		res.status(200).send({
			status: 'success',
			data: 'Details updated!',
		});
	} catch (error) {
		console.log("ERROR",error)
		res.status(500).send({
			status: 'fail',
			message: 'Internal Server Error',
		});
	}
});

// U P D A T E    P R E F E R E N C E S
router.post('/preferences', validate('preferences'),async (req, res) => {
	let { localCurrency, timeZone } = req.body;

	let errors = validationResult(req);
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: 'fail',
			message: 'Validation Failed',
			error: errors,
		});
		return;
	}


	try {
		await accountsModel.updateOne(
			{ email: req.user.email },
			{
				$set: {
					localCurrency: localCurrency,
					timeZone: timeZone,
				},
			},
			{
				upsert: true,
			}
		);

		let result = await accountsModel.find({});

		res.status(200).send({
			status: 'success',
			data: 'Preferences updated!',
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			message: 'Internal Server Error',
		});
	}
});

// A D D    B A N K    D E T A I L S 
router.post('/addBankDetails', validate('addBankDetails'), async (req, res) => {
	let errors = validationResult(req);
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: 'fail',
			message: 'Validation Failed',
			error: errors,
		});
		return;
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
			{ id: req.user.id },
			{
				$set: {
					id: req.user.id,
					bankName: bankName,
					accountNumber: accountNumber,
					accountHolderName: accountHolderName,
					accountType: accountType,
					homeAddress: homeAddress,
					branch: branch,
					city: city,
					zipCode: zipCode,
					swiftCode: swiftCode,
					country: country,
				},
			},
			{
				upsert: true,
			}
		);

		await accountsModel.updateOne({email:req.user.email},
			{
				$set:{
					bankStatus:true
				}
			},
			{
				upsert:true
			})

		let result = await bankAccountModel.find({ id: req.user.id });

		let bank = await accountsModel.findOne({id:req.user.id})
	
		cache.update(cache.collectionName.session, req.user.id, {
			bankStatus:true ,
		});

		res.status(200).send({
			status: 'success',
			message: 'Bank Details added successfully',
			data: result
		});
	} catch (error) {
		res.status(500).send({
			error: error,
			status: 'fail',
			message: 'Internal Server Error'
		});
	}
});

// G E T    B A N K   D E T A I L S 
router.get('/bankDetails', async (req, res) => {
	try {
		let bankInfo = await bankAccountModel.find({ id: req.user.id });

		res.status(200).send({
			status: 'success',
			data: bankInfo,
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			message: 'Internal Server Error',
		});
	}
});

// A D D    C R E D I T    C A R D    D E T A I L S
router.post('/addCreditCard', validate('addCreditCard'), async (req, res) => {
	let errors = validationResult(req);
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: 'fail',
			message: 'Validation Failed',
			error: errors,
		});
		return;
	}
	let { name, cardNumber, address, cardHolderName, city, zipCode, expireDate, country, cvv } = req.body;

	try {
		console.log('ASFasfa', req.user.id);
		// ADDING BANK DETAILS
		await bankCardModel.updateOne(
			{ id: req.user.id },
			{
				$set: {
					id: req.user.id,
					name: name,
					cardNumber: cardNumber,
					address: address,
					cardHolderName: cardHolderName,
					city: city,
					zipCode: zipCode,
					expireDate: expireDate,
					country: country,
					cvv: cvv,
				},
			},
			{
				upsert: true,
			}
		);

		let result = await bankCardModel.find({ id: req.user.id });

		res.status(200).send({
			status: 'Credit Card Details added successfully',
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

// U P D A T E    K Y C [ FI LE SER VICE]
router.post('/updatekyc', validate('updatekyc'), async (req, res) => {
	let errors = validationResult(req);
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: 'fail',
			message: 'Validation Failed',
			error: errors,
		});
		return;
	}
	try {

		// let acccs = await accountsModel.findOne({email:req.user.email})

		// if(acccs.profileStatus == false){

		// 	return res.status(500).send({
		// 		status:"Fail",
		// 		message:"Please Provide Profile Details"
		// 	})

		// }

		// Passport
		// National Id Card
		// Driver License
                console.log("REQUSER",req.user)
		console.log("KY",req.user.kycStatus)
		if (req.user.kycStatus == constants.kyc.PENDING && req.user.passport == true && req.user.idcard == true && req.user.license == true) {
			res.status(412).send({
				status: 'fail',
				message: 'You have already uploaded documents',
				error: 'nil',
			});
			return;
		} else if (req.user.kycStatus == constants.kyc.VERIFIED) {
			res.status(412).send({
				status: 'fail',
				message: 'Already verified',
				error: 'nil',
			});
			return;
		}

		console.log("REQ",req.body)
		console.log("FILES",req.files)
		let type = req.body.type

		var file_id1 = req.files.id_1
		var data_id1 = req.files.id_1.data
		var fileName_id1 = req.files.id_1.name
		var contentType_id1 = req.files.id_1.mimetype

		var file_id2 = req.files.id_2
		var data_id2 = req.files.id_2.data
		var fileName_id2 = req.files.id_2.name
		var contentType_id2 = req.files.id_2.mimetype

		console.log("afasfasf",file_id2)

		await requestPromise.post({
			url: config.services.fileService + '/uploadKYC', 
			formData: {
				id_1: {
					value: data_id1,
					options: {
						filename:fileName_id1,
						contentType:contentType_id1
					}
				},
				id_2:{
					value: data_id2,
					options: {
						filename:fileName_id2,
						contentType:contentType_id2
					}
				},
				email:req.user.email,
				type:req.body.type
			},
		})






		let mongoQuery = {
			// email, kycStatus == (rejected || not uploaded)
			$and: [
				{
					email: req.user.email,
				},
				{
					$or: [
						{
							kycStatus: constants.kyc.REJECTED,
						},
						{
							kycStatus: constants.kyc.NO_DOCUMENTS_UPLOADED,
						},
					],
				},
			],
		};

		let result = await db.updateOneAsync(
			mongoQuery,
			{
				$set: {
					kycStatus: 'pending',
				},
			},
			'accounts'
		);


		if(type == 'Passport'){
			await accountsModel.updateOne({email:req.user.email},{
				$set:{
					passport: true
				}
			},{
				upsert:true
			})

			cache.update(cache.collectionName.session, req.user.id, {
				passport: true,
			});

		}
		else if( type == 'National Id Card'){

			await accountsModel.updateOne({email:req.user.email},{
				$set:{
					idcard: true
				}
			},{
				upsert:true
			})

			cache.update(cache.collectionName.session, req.user.id, {
				idcard: true,
			});

		}
		else if( type == 'Driver License'){

			await accountsModel.updateOne({email:req.user.email},{
				$set:{
					license: true
				}
			},{
				upsert:true
			})

			cache.update(cache.collectionName.session, req.user.id, {
				license: true,
			});

		}


		cache.update(cache.collectionName.session, req.user.id, {
			kycStatus: 'pending',
		});
		if (result.status == 'success') {
			res.status(200).send({
				status: 'success',
				message: 'Documents uploaded to Server.',
				error: 'nil',
			});

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
				action: 'kycUpdate',
				ip: req.userData.ip,
				location: location,
				status: 'success',
				extraData2: '',
				extraData3: '',
			});
		} else {
			res.status(412).send({
				status: 'fail',
				message: 'Failed to upload documents.',
				error: 'nil',
			});
		}
	} catch (error) {
		console.log('error-/updateKyc', error);
		res.status(500).send({
			status: 'fail',
			message: 'Internal Server Error',
			error: 'error',
		});
	}
});

router.post('/changePin', validate('changePin'), async (req, res) => {
	let errors = validationResult(req);
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: 'fail',
			message: 'Validation Failed',
			error: errors,
		});
		return;
	}
	let {
		newPin,
		oldPin,
	} = req.body;

	let acc = await accountsModel.find({email:req.user.email});

	console.log('acccc', acc);

	try {
		if (acc.length) {
			console.log('YES');
			let pinFromDb = acc[0].pin;
			if (acc[0].pin == oldPin || '0') {
				//new pin
				await accountsModel.updateOne(
					{email:req.user.email},
					{
						$set: {
							pin: newPin,
						},
					},
					{
						upsert: true,
					}
				);
				console.log('CACHE:', cache.collectionName.session);
				cache.update(cache.collectionName.session, req.user.email, {
					hasTransactionPin: true,
				});
				res.send({
					status: 'success',
					message: 'Pin updated successfully',
					error: 'nil',
				});

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
					action: 'pinChange',
					ip: req.userData.ip,
					status: 'success',
					location: location,
					extraData2: '',
					extraData3: '',
				});
			} else {
				// else if (oldPin == pinFromDb) { //change pin
				//     await db.updateOneAsync({
				//         email: req.user.email
				//     }, {
				//         $set: {
				//             pin: newPin
				//         }
				//     }, "accounts")
				//     res.send({
				//         status: "success",
				//         message: "Pin updated successfully",
				//         error: 'nil'
				//     })

				//     await usageStaticsModel.create({
				//         email: req.user.email,
				//         timestamp: new Date().toUTCString(),
				//         action: 'pinChange',
				//         ip: req.userData.ip,
				//         status: 'success',
				//         extraData2: '',
				//         extraData3: '',
				//     })

				// }
				res.status(400).send({
					status: 'fail',
					message: 'Incorrect pin',
					error: 'nil',
				});

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
					action: 'pinChange',
					ip: req.userData.ip,
					status: 'fail',
					reason: 'IncorrectPin',
					location: location,
					extraData2: '',
					extraData3: '',
				});
			}
		}
	} catch (error) {
		console.log(error);
		res.status(500).send({
			status: 'fail',
			message: 'Internal server error',
			error: 'error',
		});
	}
});

// C H A N G E    P A S S W O R D
router.post('/changePassword', validate('changePassword'), async (req, res) => {
	let errors = validationResult(req);
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: 'fail',
			message: 'Validation Failed',
			error: errors,
		});
		return;
	}
	let {
		newPassword,
		oldPassword,
	} = req.body;
	try {

		if(schema.validate(newPassword) == false){
			return res.status(412).send({
				status:"Fail",
				message:"Password Validation Failed"
			})
		}

		let acc = await accountsModel.find({ email: req.user.email });
		console.log("new2")
		if (acc.length > 0) {
			console.log("new3")
			let passwordFromDb = acc[0].password;
			console.log("new3",acc[0].email)
			console.log("new6",passwordFromDb,oldPassword)
			newPassword = hash(newPassword)

			oldPassword = hash(oldPassword)
			
			
			let dbPassword = decrypt(passwordFromDb)
			console.log("new1",dbPassword,oldPassword)
			if (oldPassword == dbPassword) {
				newPassword = encrypt(newPassword)
				//change pin
				await accountsModel.updateOne(
					{ email: req.user.email  },
					{
						$set: {
							password: newPassword,
						},
					}
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
					action: 'passwordChange',
					ip: req.userData.ip,
					status: 'success',
					location: location,
					extraData2: '',
					extraData3: '',
				});

				return res.status(200).send({
					status: 'success',
					message: 'Password updated successfully',
					error: 'nil',
				});


			} else {

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
					action: 'passwordChange',
					ip: req.userData.ip,
					status: 'fail',
					location: location,
					reason: 'IncorrectPassword',
					extraData2: '',
					extraData3: '',
				});



				return res.status(412).send({
					status: 'fail',
					message: 'Incorrect password',
					error: 'nil',
				});
			}
		}
	} catch (error) {
		console.log(error);
		res.status(500).send({
			status: 'fail',
			message: 'Internal server error',
			error: 'error',
		});
	}
});

router.post('/setSecurityQuestion', validate('setSecurityQuestion'), async (req, res) => {
	let errors = validationResult(req);
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: 'fail',
			message: 'Validation Failed',
			error: errors,
		});
		return;
	}
	if (req.body.securityQuestion == (undefined || '')) {
		res.status(412).send('invalid_data');
	} else if (req.body.answer == (undefined || '')) {
		res.status(412).send('invalid_data');
	}
	try {
		let result = await db.updateOneAsync(
			{
				email: req.user.email,
			},
			{
				$set: {
					securityQuestion: req.body.securityQuestion,
					answer: req.body.answer,
				},
			},
			'accounts'
		);
		cache.update(cache.collectionName.session, req.user.email, {
			securityQuestion: req.body.securityQuestion,
			answer: req.body.answer,
		});
		if (result.status == 'success' && result.message.result.n > 0) {
			res.status(200).send({
				status: 'success',
				message: 'Updated successfully',
				error: 'nil',
			});

			await usageStaticsModel.create({
				email: req.user.email,
				timestamp: new Date().toUTCString(),
				action: 'securityQuestionUpdate',
				ip: req.userData.ip,
				status: 'success',
				extraData2: '',
				extraData3: '',
			});
		} else {
			res.status(412).send({
				status: 'fail',
				message: 'error',
				error: 'nil',
			});

			await usageStaticsModel.create({
				email: req.user.email,
				timestamp: new Date().toUTCString(),
				action: 'securityQuestionUpdate',
				ip: req.userData.ip,
				status: 'fail',
				reason: 'error',
				extraData2: '',
				extraData3: '',
			});
		}
	} catch (error) {
		console.log('', error);
		res.status(500).send({
			status: 'fail',
			message: 'Internal server error',
			error: 'error',
		});
	}
});

router.post('/updateLanguage', validate('updateLanguage'), async (req, res) => {
	let errors = validationResult(req);
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: 'fail',
			message: 'Validation Failed',
			error: errors,
		});
		return;
	}
	let language = req.body.language;
	try {
		if (config.languages.indexOf(language) >= 0) {
			await db.updateOneAsync(
				{
					email: req.user.email,
				},
				{
					$set: {
						language: language,
					},
				},
				'accounts'
			);
			cache.update(cache.collectionName.session, req.user.email, {
				language: language,
			});
			res.status(200).send({
				status: 'success',
				message: 'language updated',
				error: 'nil',
			});

			await usageStaticsModel.create({
				email: req.user.email,
				timestamp: new Date().toUTCString(),
				action: 'languageUpdate',
				ip: req.userData.ip,
				status: 'success',
				extraData2: '',
				extraData3: '',
			});
		} else {
			res.status(412).send({
				status: 'fail',
				message: 'invalid value',
				error: 'nil',
			});

			await usageStaticsModel.create({
				email: req.user.email,
				timestamp: new Date().toUTCString(),
				action: 'languageUpdate',
				ip: req.userData.ip,
				status: 'fail',
				reason: 'invalidValue',
				extraData2: '',
				extraData3: '',
			});
		}
	} catch (error) {
		res.status(412).send({
			status: 'fail',
			message: 'Error occured',
			error: 'nil',
		});
	}
});

router.post('/updateCurrency', validate('updateCurrency'), async (req, res) => {
	let errors = validationResult(req);
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: 'fail',
			message: 'Validation Failed',
			error: errors,
		});
		return;
	}
	let currency = req.body.currency;
	try {
		if (config.supportedFiat.indexOf(currency) >= 0) {
			await db.updateOneAsync(
				{
					email: req.user.email,
				},
				{
					$set: {
						currency: currency,
					},
				},
				'accounts'
			);
			cache.update(cache.collectionName.session, req.user.email, {
				currency: currency,
			});
			res.status(200).send({
				status: 'success',
				message: 'currency updated',
				error: 'nil',
			});

			await usageStaticsModel.create({
				email: req.user.email,
				timestamp: new Date().toUTCString(),
				action: 'currencyUpdated',
				ip: req.userData.ip,
				status: 'success',
				extraData2: req.body.currency,
				extraData3: '',
			});
		} else {
			res.status(412).send({
				status: 'fail',
				message: 'invalid value',
				error: 'nil',
			});
		}
	} catch (error) {
		console.log(error);
		res.status(500).send({
			status: 'fail',
			message: 'Error occured',
			error: 'nil',
		});
	}
});

// G E N E R A T I N G    S E C R E T    K E Y    &    Q R C O D E
router.post('/qrcode', async (req, res) => {

	let set = await accountsModel.find({email: req.user.email });

	console.log('SECERET', set[0].secret);

	if (set[0].auth2 == false) {
		let secret = speakeasy.generateSecret({
			name: 'PINKSURFING',
		});
		QRCode.toDataURL(secret.base32, async function(err, data) {
			let a = await accountsModel.updateOne(
				{ $or: [ { email: req.user.email } ] },
				{
					$set: {
						secret: secret.base32,
						qrcode:data
					},
				},
				{
					upsert: true,
				}
			);

			cache.update(cache.collectionName.session, req.user.id, {
				qrcode: data,
			});

			cache.update(cache.collectionName.session, req.user.id, {
				secret: secret.base32,
			});
		

			res.send({
				status:"Success",
				secret: secret.base32,
				data: data
			});
		});
	} else {
		let set = await accountsModel.find({ email: req.user.email });

		res.send({
			secret: set[0].secret,
			data: set[0].qrcode,
			message:"QR Code Already Generated"
		});
	}
});

// G E N E R A T I N G    S E C R E T    K E Y    &    Q R C O D E
router.get('/getqrcode', async (req, res) => {
	let acc = await accountsModel.find({ email: req.user.email });

	let set = await accountsModel.find({email:req.user.email});

	try {


		// DEMO

		QRCode.toDataURL(set[0].secret, async function(err, data) {

			return res.status(200).send({
				status:"Success",
				result:{
					qrcode:data,
					secret:set[0].secret
				}
			})

		});

		//DEMO




	} catch (error) {
		
		res.status(500).send({
			status:"Fail",
			message:"Internal Server Error"
		})

	}

});

// G O O G L E    A U T H E N T I C A T I O N
router.post('/gAuth', validate('gAuth'), async (req, res) => {
	let errors = validationResult(req);
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: 'fail',
			message: 'Validation Failed',
			error: errors,
		});
		return;
	}
	let { password, gCode, otp } = req.body;

	let acc = await accountsModel.findOne({_id:req.user._id});

	password = hash(password)
	password = encrypt(password)

	try {
		if (acc.auth2 == false) {


			let verified = speakeasy.totp.verify({
				secret: req.user.secret,
				encoding: 'base32',
				token: gCode,
			});

			if(!verified){
				return res.status(412).send({
					status:"fail",
					message:"Invalid Google Authentication Code"
				})
			}

			// P A S S W O R D    M A T C H
			if (password == acc.password && verified) {
				console.log('asfa,fjahk,s');
				await accountsModel.updateOne(
					{
						email: req.user.email,
					},
					{
						$set: {
							auth2: true,
						},
					},
					{
						upsert:true
					}
				);

				cache.update(cache.collectionName.session, req.user.id, {
					auth2: true,
				});

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
					action: 'Google Authentication',
					ip: req.userData.ip,
					status: 'success',
					location: location,
					extraData2: req.body.status,
					extraData3: '',
				});

				console.log('Auth Enabled');
				return res.status(200).send({
					status: 'success',
					message: 'Google Authentication Enabled',
				});
			}
			else{

				res.status(412).send({
					status:"fail",
					message:"Wrong Password"
				})

			}

		} else {
			res.status(412).send({
				status: 'fail',
				message: 'Google Authentication Already Enabled',
			});
		}
	} catch (error) {
		return res.status(500).send({
			status: 'fail',
			error: error,
		});
	}
});

// D I S A B L E    A U T H 2    S T A T U S
router.post('/disableAuth2', async (req, res) => {

	try {
		let aw = await accountsModel.updateOne(
			{ email: req.user.email},
			{
				$set: {
					auth2: false
				},
			},
			{
				upsert: true,
			}
		).lean().exec()


		cache.update(cache.collectionName.session, req.user.email, {
			auth2: false,
		});

		res.status(200).send({
			status: 'success',
			message: 'Google Authentication Disabled'
		});

		await usageStaticsModel.create({
			email: req.user.email,
			timestamp: new Date().toUTCString(),
			action: 'auth2Status',
			ip: req.userData.ip,
			status: 'success',
			extraData2: req.body.status,
			extraData3: '',
		});
	} catch (err) {
		console.log(err);
		res.status(500).send({
			status: 'fail',
			message: 'Internal Server Error',
			error: 'error',
		});
	}
});

// K N O W    T H E    A U T H 2    S T A T U S 
router.get('/auth2Status', async (req, res) => {
	try {
		res.send({
			status: 'success',
			auth2: req.user.auth2 != undefined || null ? req.user.auth2 : false,
			error: 'nil',
		});
	} catch (error) {
		res.send({
			status: 'fail',
			message: 'error occured',
			auth2: false, //req.user.auth2 != undefined || null ? true : false,
			error: 'error',
		});
	}
});

// L O G O U T
router.post('/logout', async (req, res) => {
	let user = req.user;
	if (user == undefined || user == null) {
		res.status(412).send({
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
			action: 'logout',
			ip: req.userData.ip,
			status: 'success',
			location: location,
			extraData2: '',
			extraData3: '',
		});
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			message: 'Internal Server Error',
			error: 'error',
		});
	}
});

router.post('/setCoinStatus', validate('setCoinStatus'), async (req, res) => {
	let errors = validationResult(req);
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: 'fail',
			message: 'Validation Failed',
			error: errors,
		});
		return;
	}
	let status = req.body.status;
	let symbol = req.body.symbol;
	try {
		console.log(status, symbol);
		if ([ true, false ].indexOf(status) < 0) {
			res.status(412).send({
				status: 'fail',
				message: 'invalid params',
				error: 'nil',
			});
			return;
		}
		if (config.supportedCryptos.indexOf(symbol) < 0) {
			res.status(412).send({
				status: 'fail',
				message: 'invalid params',
				error: 'nil',
			});
			return;
		}

		let wallet = await walletModel
			.findOne({
				email: req.user.email,
			})
			.exec();
		wallet[symbol].isEnabled = status;
		delete wallet['_id'];
		await walletModel.updateOne(
			{
				email: req.user.email,
			},
			wallet
		);
		res.send({
			status: 'success',
			message: '',
			error: 'nil',
		});
	} catch (error) {
		console.log(error);
		res.status(500).send({
			status: 'fail',
			message: 'Internal Server Error',
			error: 'error',
		});
	}
});

router.post('/setFCMToken', validate('setFCMToken'), async (req, res) => {
	let errors = validationResult(req);
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: 'fail',
			message: 'Validation Failed',
			error: errors,
		});
		return;
	}
	//FCMToken should be present.
	if (req.body.FCMToken == undefined || req.body.FCMToken == '') {
		res.status(412).send({
			status: 'fail',
			message: '',
			error: 'nil',
		});
	}

	try {
		await accountsModel
			.updateOne(
				{
					email: req.user.email,
				},
				{
					$set: {
						FCMToken: req.body.FCMToken,
					},
				}
			)
			.exec();

		res.send({
			status: 'success',
			message: '',
			error: 'nil',
		});
	} catch (err) {
		res.status(500).send({
			status: 'fail',
			message: 'Internal Server Error. Please try again after sometime.',
			error: 'error',
		});
	}
});

// S E T    W H I T E L I S T    A D D R E S S
router.post('/setWhitelisted', validate('setWhitelisted'), async (req, res) => {
	let errors = validationResult(req);
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: 'fail',
			message: 'Validation Failed',
			error: errors,
		});
		return;
	}
	let { addr, label, coin, type, authCode } = req.body;

	let profile = await accountsModel.find({email:req.user.email});

	let crypto = [ 'BTC', 'ETH', 'USDT', 'MYBIZ'];

	if (coin == 'btc' | 'BTC') {
		var valid = WAValidator.validate(addr, 'BTC');
		console.log('BTC', valid);
	} else {
		var valid = WAValidator.validate(addr, 'ETH');
		console.log('ETH', valid);
	}

	if(!(crypto.includes(coin.toUpperCase()) && valid )){
		return res.status(412).send({
			status:"Fail",
			message:"Address Is Not Valid"
		})
	}


		try {
			let acc = await accountsModel.find({email:req.user.email});

			console.log(req.body);

			if (type == 'gCode') {

				if(profile[0].auth2 !=true){
					return res.status(412).send({
						status:"fail",
						message:"Google Authentication Not Enabled"
					})
				}

				console.log('DAJNGAKHANKAMKAFFA', acc[0].secret);
				let verified = speakeasy.totp.verify({
					secret: acc[0].secret,
					encoding: 'base32',
					token: authCode,
				});

				console.log('sfkjafkasfa', verified);
				if (verified) {
					let set = await settingsModel.find({});

					let result = await whitelistModel.update(
						{
							email: {
								$in: true,
							},
						},
						{
							$set: {
								email: req.user.email,
								coin: coin.toUpperCase(),
								label: label,
								address: addr,
							},
						},
						{
							upsert: true,
						}
					);

					res.status(200).send({
						status: 'success',
						message:"Address is Whitelisted"
					});
				} else {
					res.status(412).send({
						status: 'fail',
						message: 'gCode expired',
					});
				}
			}
			else {
				res.status(412).send({
					status: 'fail',
					message: 'Authentication failed',
				});
			}
		} catch (error) {
			res.status(500).send({
				error: error,
				status: 'fail',
				message: 'Internal Server Error',
			});
		}
	
});

// R E M O V E    W H I T E L I S T E D      A D D R E S S
router.post('/removeWhitelisted', validate('removeWhitelisted'), async (req, res) => {
	let errors = validationResult(req);
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: 'fail',
			message: 'Validation Failed',
			error: errors,
		});
		return;
	}
	let { addr, coin, label, type, authCode } = req.body;

	let query = [];

	if (addr != '') {
		query.push({
			address: addr,
		});
	}

	if (coin != '') {
		query.push({
			coin: coin,
		});
	}

	if (label != '') {
		query.push({
			label: label,
		});

		query.push({
			email: req.user.email,
		});
	}

	let profile = await accountsModel.find({email:req.user.email});

		try {
			let acc = await accountsModel.find({email:req.user.email});

			console.log(req.body);

			if (type == 'gCode') {

				if(profile[0].auth2 !=true){
					return res.status(412).send({
						status:"fail",
						message:"Google Authentication Not Enabled"
					})
				}

				console.log('DAJNGAKHANKAMKAFFA', acc[0].secret);
				let verified = speakeasy.totp.verify({
					secret: acc[0].secret,
					encoding: 'base32',
					token: authCode,
				});

				console.log('sfkjafkasfa', verified);
				if (verified) {
					let set = await settingsModel.find({});

					console.log('WIFUEWHF', query);

					let a = await whitelistModel.remove({ $and: query }).lean().exec();

					console.log(a);

					res.status(200).send({
						status: 'success',
						message:"Address Has Been Removed From Whitelist"
					});
				} else {
					res.status(412).send({
						status: 'fail',
						message: 'gCode expired',
					});
				}
			} 
			else {
				res.status(412).send({
					status: 'fail',
					message: 'Authentication failed',
				});
			}
		} catch (error) {
			res.status(500).send({
				error: error,
				status: 'fail',
				message: 'Internal Server Error',
			});
		}
	
});

// T O G G L E     W H I T E L I S T
router.post('/toggleWhitelist', validate('toggleWhitelist'), async (req, res) => {
	let errors = validationResult(req);
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: 'fail',
			message: 'Validation Failed',
			error: errors,
		});
		return;
	}
	let { flag, type, authCode } = req.body;

	let profile = await accountsModel.find({email:req.user.email});

	console.log("asfdasfasfa",req.body)

		try {
			let acc = await accountsModel.find({email:req.user.email});

			console.log(req.body);

			if (type == 'gCode') {

				if(req.user.auth2 !=true){
					return res.status(412).send({
						status:"Fail",
						message:"Google Authentication Not Enabled"
					})
				}

				console.log('DAJNGAKHANKAMKAFFA', acc[0].secret);
				let verified = speakeasy.totp.verify({
					secret: acc[0].secret,
					encoding: 'base32',
					token: authCode,
				});

				console.log('sfkjafkasfa', verified);
				if (verified) {
					let set = await settingsModel.find({});

					await accountsModel
						.updateOne(
							{ email: req.user.email },
							{
								$set: {
									whitelist: flag,
								},
							},
							{
								upsert: true,
							}
						)
						.lean()
						.exec();

						cache.update(cache.collectionName.session, req.user.id, {
							whitelist:flag
						});

					res.status(200).send({
						status: 'success',
						message:"Toggled Whitelist"
					});
				} else {
					res.status(412).send({
						status: 'fail',
						message: 'gCode expired',
					});
				}
			}
			else {
				res.status(412).send({
					status: 'fail',
					message: 'Authentication failed',
				});
			}
		} catch (error) {
			res.status(500).send({
				error: error,
				status: 'fail',
				message: 'Internal Server Error',
			});
		}
	
});

// G E T    W H I T E L I S T E D     A D D R E S S 
router.post('/getWhitelisted', async (req, res) => {
	try {
		let acc = await accountsModel.find({ email: req.user.email });

		if (Object.keys(req.body).length !== 0) {
			let a = await whitelistModel
				.aggregate([
					{
						$match: {
							address: req.body.address,
						},
					},
					{
						$project: {
							address: 1,
							coin: 2,
							label: 3,
							_id: 4,
						},
					},
					{
						$addFields: {
							whitelist: acc[0].whitelist,
						},
					},
				])
				.exec();

			res.status(200).send({
				status: 'success',
				data: a,
			});
		} else {
			let a = await whitelistModel
				.aggregate([
					{
						$match: {
							email: req.user.email,
						},
					},
					{
						$project: {
							address: 1,
							coin: 2,
							label: 3,
							_id: 4,
						},
					},
					{
						$addFields: {
							whitelist: acc[0].whitelist,
						},
					},
				])
				.exec();

			res.status(200).send({
				status: 'success',
				data: a,
			});
		}
	} catch (error) {
		res.status(500).send({
			status: 'fail',
			message: 'Internal Server Error',
		});
	}
});

router.post('/addWhitelist', validate('addWhitelist'), async (req, res) => {
	let errors = validationResult(req);
	if (errors.isEmpty() == false) {
		res.status(412).send({
			status: 'fail',
			message: 'Validation Failed',
			error: errors,
		});
		return;
	}

	let { coin, label, address } = req.body;
	let result = await whitelistModel.find({ $and: [ { address: { $in: address } }, { coin: coin } ] });

	console.log(result.length);

	res.status(200).send({
		status: 'success',
		data: result,
	});
});

function updateCache(collectionName, id, dataToUpdate) {
	cache.get();
}


// FILE SERVICE
router.post('/updatelegalName', async (req, res) => {
	try {

		let id_1 = req.files.id_1;
		let name = req.body.name

		var file_id1 = req.files.id_1
		var data_id1 = req.files.id_1.data
		var fileName_id1 = req.files.id_1.name
		var contentType_id1 = req.files.id_1.mimetype

		await requestPromise.post({
			url: config.services.fileService + '/uploadLegalName', 
			formData: {
				id_1: {
					value: data_id1,
					options: {
						filename:fileName_id1,
						contentType:contentType_id1
					}
				},
				id:req.user.id,
				type:"legalName"
			},
		})

		let aw = await accountsModel.updateOne(
			{email:req.user.email},
			{
				$set: {
					legalName: name
				},
			},
			{
				upsert: true,
			}
		).lean().exec()

			console.log("asdas2131",aw)

		cache.update(cache.collectionName.session, req.user.id, {
			legalName: req.body.name,
		});

		res.status(200).send({
				status: 'success',
				message: 'Documents Uploaded Successfully.',
				error: 'nil',
			});

	} catch (error) {
		res.status(500).send({
			status: 'Fail',
			message: 'Error Occurred',
			error: 'error',
		});
	}
});
module.exports = router;
