// chatroom.route.js

const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const ContactsRoute = express.Router();
var Sync = require('sync');
const asyncForEach = require('async-await-foreach');
// Require chat model in our routes module

let Contacts = require('../models/Contacts');

const router = express.Router()
const config = require('../config')

const Account = require('../src/account')
const CustomError = require('../src/error')
const TokenValidator = require('../src/TokenValidator');
const tokenValidator = new TokenValidator(config.token.password, { expiresIn: "30d" });



// [one to one ] save *** Defined store Messages  ****
ContactsRoute.route('/add').post(function (req, res) {
	//console.log(req.body);

	let checkMessageIdData = req.body.id;

	Contacts.findOne({ uid: req.body.id }, { explicit: true }).then(function (conts) {

		if (conts == null || conts == '') {
			console.log('CREATE NEW******: message id not exists');

			let checkContactDataBody = {
				uid: req.body.id
			}

			console.log('PARAM REQ BODY :' + checkContactDataBody);

			// CREATE NEW CHAT:
			//-----------------------------------------------------------------	
			let contacts = new Contacts(checkContactDataBody);
			contacts.save()
				.then(contacts => {
					//**** return Result :
					return res.status(200).json({
						contacts: contacts,
						status: 'success',
						message: 'sent'
					});

				}).catch(err => {
					return res.status(400).send("unable to save to database");
				});
			//-----------------------------------------------------------------	
		} else {
			return res.status(200).json({
				contacts: [],
				status: 'success',
				message: 'user contact Already Exists.'
			});
		}

	}).catch(function (err) {
		return res.status(200).json('data not found here');
	});
});

ContactsRoute.route('/remove').post(function (req, res) {
	//check room ID existOrNot:

	let checkContactId = req.body.id;
	Contacts.findOne({ uid: req.body.id }, { explicit: true }).then(function (conts) {
		if (conts == null || conts == '') {
			return res.status(200).json({
				contacts: [],
				status: 'success',
				message: 'ID doesnt Exists'
			});
		} else {
			console.log('findOne..' + conts);
			let _contactId = conts;
			getContactByID(_contactId).then((contactsData) => {
				if (contactsData.uid == checkContactId) {
					//console.log('in');
					contactsData.isRemoved = true;
					contactsData.save().then(contss => {
						console.log("update successfully");
						//return true;
						return res.status(200).json({
							contacts: [],
							status: 'success',
							message: 'User Contacts Removed'
						});
						//-----------------------------------------------------------
					}).catch(err => {
						return res.status(200).json(err);
					});

				}
			});

		}
	}).catch(function (err) {
		return res.status(200).json('data not found here');
	});

});

async function getContactByID(id) {
	//let chatsval = '';
	console.log('aid' + id);
	let contactval = await Contacts.findById(id);
	console.log('awaitF' + contactval);
	return contactval;
}

ContactsRoute.route('/contactlist').get(function (req, res) {

	Contacts.find({ isRemoved: false }, function (err, contacts) {
		if (err) {
			console.log(err);
		}
		else {
			return res.status(200).json({
				contacts: contacts,
				status: 'success',
				message: 'User Contacts List'
			});
		}
	});
});


function authenticateToken(req, res, next) {
	console.log('request header:' + req.headers['authorization']);
	// Gather the jwt access token from the request header
	const authHeader = req.headers['authorization'];
	console.log('header api:' + authHeader);
	const token = authHeader && authHeader.split(' ')[1];
	const SECRET = 'MY_SECRET';
	if (token == null) return res.sendStatus(401) // if there isn't any token

	jwt.verify(token, SECRET, (err, user) => {
		console.log(err)
		if (err) return res.sendStatus(403)
		req.user = user
		next() // pass the execution off to whatever request the client intended
	})
}

module.exports = ContactsRoute;