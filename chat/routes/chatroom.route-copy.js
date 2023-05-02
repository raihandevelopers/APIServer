// chatroom.route.js

const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const chatroomRoute = express.Router();
var Sync = require('sync');
const asyncForEach = require('async-await-foreach');
// Require chat model in our routes module
let Chatroom = require('../models/Chatroom');
let Chatconversation = require('../models/Chatconversation');

const router = express.Router()
const config = require('../config')

const Account = require('../src/account')
const CustomError = require('../src/error')
const TokenValidator = require('../src/TokenValidator');
const tokenValidator = new TokenValidator(config.token.password, { expiresIn: "30d" });



// *** Defined store Messages  ****
chatroomRoute.route('/add2').post(function (req, res) {
	//console.log(req.body);

	//check room ID existOrNot:
	let checkChatData = {
		from: req.body.from,
		to: req.body.to
	}
	let checkMessageIdData = req.body.message_id;

	Chatroom.findOne({ message_id: req.body.message_id }, { explicit: true }).then(function (chatrm) {

		if (chatrm == null || chatrm == '') {
			console.log('CREATE NEW******: message id not exists');

			const accountAr = [];

			let chatBody = {
				from: req.body.from,
				to: req.body.to,
				group: req.body.group,
				message_id: req.body.message_id
			};

			console.log('PARAM REQ BODY :' + chatBody);

			// CREATE NEW CHAT:
			//-----------------------------------------------------------------	
			let chatroom = new Chatroom(chatBody);
			chatroom.save()
				.then(chatroom => {
					let chatconversation = new Chatconversation(req.body.message);
					// console.log('chatconversation' + chatconversation);

					chatconversation.save().then(chatmsgs => {
						//append object & push Array:
						//.*** Merge with parent table  as [object or Array] --------------
						chatroom.message = chatmsgs;   //Object
						// ****End of the loop Push into values in single Array --------
						console.log('BINDED WITH CHILD:' + chatroom);
						accountAr.push(chatroom);

						//**** return Result :
						return res.status(200).json({
							accounts: accountAr,
							status: 'success',
							message: 'sent'
						});

					}).catch(err => {
						return res.status(400).send("unable to save to database");
					});
					//-------------------------------------------------------------
					//res.status(200).json({chatroom: chatroom});
				}).catch(err => {
					return res.status(400).send("unable to save to database");
				});
			//-----------------------------------------------------------------	
		} else {
			console.log('UPDATED ONE***** exists message id go for updation:' + chatrm); //return Id

			const accountmsgAr = [];

			//checkMessage exist or not:
			let _chatId = chatrm;
			let message_id = req.body.message_id;
			let message = req.body.message;
			// console.log('check req property' + message_id + _chatId+ message.chat_type);

			//for bind result:
			getMessageIdByID(_chatId).then((chatroom) => {
				//console.log("DB chat parent: " + chatroom);
				checkExistOrNotMessageId(message_id).then((messageVal) => {

					//[ RETRIEVE ]message data :
					//item['message'] = messageVal;
					let messageAr = messageVal;
					// console.log("DB messages child" + messageAr);

					// [FIND] :	
					asyncForEach(messageAr, async itemmsg => {
						//check message id:		
						if (itemmsg.message_id === message_id) {
							console.log("match messages id is:" + itemmsg.message_id);
							itemmsg.attachment_url = message.attachment_url;
							itemmsg.chat_type = message.chat_type;
							itemmsg.deleted_on = message.deleted_on;
							itemmsg.friend_virtual_id = message.friend_virtual_id;
							itemmsg.group_id = message.group_id;
							itemmsg.message = message.message;
							itemmsg.message_id = message.message_id;
							itemmsg.message_type = message.message_type;
							itemmsg.purpose = message.purpose;
							itemmsg.read_on = message.read_on;
							itemmsg.receive_on = message.receive_on;
							itemmsg.receiver_virtual_id = message.receiver_virtual_id;
							itemmsg.sender_virtual_id = message.sender_virtual_id;
							itemmsg.sent_on = message.sent_on;

							itemmsg.save().then(itemmsg => {
								return true;
							}).catch(err => {
								return res.status(200).json(err);
							});

						} else {
							return res.status(200).json('message_id didnt match with message body');
						}

						chatroom['message'] = itemmsg;
						accountmsgAr.push(chatroom);

					}).then(() => {
						return res.status(200).json({
							accounts: accountmsgAr,
							status: 'success',
							message: 'sent'
						});

					});
				});

			});

		}

	}).catch(function (err) {
		return res.status(200).json('message_id not found here');
	});


});



chatroomRoute.route('/add').post(function (req, res) {
	//console.log(req.body);

	//check room ID existOrNot:
	let checkChatData = {
		from: req.body.from,
		to: req.body.to
	}
	let checkMessageIdData = req.body.message_id;

	Chatroom.findOne({ message_id: req.body.message_id }, { explicit: true }).then(function (chatrm) {

		if (chatrm == null || chatrm == '') {
			console.log('CREATE NEW******: message id not exists');

			const accountAr = [];

			let chatBody = {
				from: req.body.from,
				to: req.body.to,
				group: req.body.group,
				message_id: req.body.message_id,
				message: req.body.message,
			};

			console.log('PARAM REQ BODY :' + chatBody);

			// CREATE NEW CHAT:
			//-----------------------------------------------------------------	
			let chatroom = new Chatroom(chatBody);
			chatroom.save()
				.then(chatroom => {

					//**** return Result :
					return res.status(200).json({
						accounts: chatroom,
						status: 'success',
						message: 'sent'
					});

					//res.status(200).json({chatroom: chatroom});
				}).catch(err => {
					return res.status(400).send("unable to save to database");
				});
			//-----------------------------------------------------------------	
		} else {
			console.log('UPDATED ONE***** exists message id go for updation:' + chatrm); //return Id

			const accountmsgAr = [];

			//checkMessage exist or not:
			let _chatId = chatrm;
			let message_id = req.body.message_id;
			let message = req.body.message;
			// console.log('check req property' + message_id + _chatId+ message.chat_type);

			//for bind result:
			getMessageIdByID(_chatId).then((chatroom) => {
				//console.log("DB chat parent: " + chatroom);

				if (chatroom.message_id === message_id) {
					chatroom.message = message;
					chatroom.save().then(chatroom => {
						console.log("update successfully");
						return true;
					}).catch(err => {
						return res.status(200).json(err);
					});

					accountmsgAr.push(chatroom);
					console.log("updated Account: " + accountmsgAr);
				} else {
					return res.status(200).json('message_id didnt match with message body');
				}

				console.log('final Submission');

				return res.status(200).json({
					accounts: accountmsgAr,
					status: 'success',
					message: 'sent'
				});

			});


		}

	}).catch(function (err) {
		return res.status(200).json('message_id not found here');
	});


});


//--------------------------[update chat -sub functions ]----------------------------------

//getMessageId from chatoom: find Update:
async function getMessageIdByID(id) {
	let chatsval = '';
	await Chatroom.findById(id, function (err, chats) {
		Sync(function () {
			return chatsval = chats;
		}, function (err, chatsval) {
			//= console.error(err);	
			if (err) return chatsval;
		});
	});
	return chatsval;
}

//checkMessageId from chatconversation: updation
async function checkExistOrNotMessageId(message_id) {
	let messages = '';
	await Chatconversation.find({ message_id: message_id }, function (err, chatmsgs) {
		Sync(function () {
			return messages = chatmsgs;
		}, function (err, messages) {
			//= console.error(err);	
			if (err) return messages;
		});
	});
	return messages;
}
//[]-------------------------------------------------------------------------------------
chatroomRoute.route('/getmychatlist2').get(function (req, res) {

	// // Get Auth user's Data:
	let data = tokenValidator.validate(req)
	req.user = data;

	let _id = req.user._id;
	console.log('my session Id:' + _id);
	console.log('my profile Data:' + data);
	console.log('my profile Data:' + JSON.stringify(req.user));
	//return res.status(200).json(data);



	// -----------------------[WITHOUT PAGINATIONS]-------------------------------------
	let checkExistParams = [{ from: _id }, { to: _id }];
	const accountAr = [];
	// accountAr = {};

	Chatroom.find({ $or: checkExistParams }, function (err, chatrm) {

		asyncForEach(chatrm, async item => {

			let _chatId = item._id;
			let from = item.from;
			let to = item.to;
			console.log('actual data' + from + 'yyyyy' + to);

			// *** BIND DATA CHATCONVERSATION - CHILD
			// let message_id = item.message_id;
			// let messageVal = await getMessageId(message_id);
			// //console.log('funct return:'+JSON.stringify(messageVal));	
			// item.message = messageVal;
			// //item['message'] = messageVal;

			accountAr.push(item);

		}).then(() => {
			//console.log('check 0xxxx' + accountAr);

			//  // **  group by value:
			// let group = accountAr.reduce((r, a) => {
			// 	//console.log("a", a);
			// 	//console.log('r', r);
			// 	r[a.to] = [...r[a.to] || [], a];
			// 	return r;
			//    }, {});
			//    console.log("group", group);

			//    return res.status(200).json({
			// 	accounts: group,
			// 	status: 'success',
			// 	message: 'sent'
			// });



			return res.status(200).json({
				accounts: accountAr,
				status: 'success',
				message: 'sent'
			});
		});

	});
	//-------------------------------------------------------------------------------


});

chatroomRoute.route('/getchatlist2').post(function (req, res) {

	let from = req.body.from;
	let to = req.body.to;
	let limit = req.body.count;
	let page = req.body.page;
	// console.log('PARAMS :' + from + to + limit + page);

	//1.**pass parameter to to get pagination.
	let accountJsn = {
		$or: [{ from: String(from) }, { to: String(to) }, { from: String(to) }, { to: String(from) }]
	}

	const accountAr = [];
	getMessagePagination(accountJsn, from, to, limit, page).then((pageLogs) => {

		//	console.log('GET PAGINATE ACCOUNT :' + JSON.stringify(pageLogs['accounts']));

		// 2.**get Filter and merge message Array: ----------------------------
		let accountsAr = pageLogs['accounts'];
		//	console.log('GET ARRAY VALUE:' + accountsAr);
		var sortAccountAr = accountsAr.slice().reverse();
		// console.log('GET Sort ARRAY ACCOUNT :' + (sortAccountAr));
		asyncForEach(sortAccountAr, async item => {
			//console.log('EACH'+item);
			let _chatId = item._id;
			let from = item.from;
			let to = item.to;
			// console.log('input data' + req.body.from + 'xxxx' + req.body.to);
			// console.log('actual data' + from + 'yyyyy' + to);

			//3.****Bind the match value and return value: --------------------
			let message_id = item.message_id;
			// console.log('PARENT MSG ID:'+message_id);
			let messageVal = await getMessageId(message_id);
			// console.log('BIND CHILD:'+JSON.stringify(messageVal));

			//4.*** Merge with parent table  as [object or Array] --------------
			item.message = messageVal;   		// datatype :Object
			//item['message'] = messageVal;    // datatype : array

			//5. ****End of the loop Push into values in single Array -----------
			accountAr.push(item);
			// console.log('FINAL ARRAY:'+accountAr);
		}).then(() => {

			return res.status(200).json(pageLogs);
		});


	});

	// -----------------------[WITHOUT PAGINATIONS]-------------------------------------
	// let checkExistParams = [{ from: req.body.from }, { to: req.body.to },
	// { from: req.body.to }, { to: req.body.from }];

	//  const accountAr = [];
	// // accountAr = {};

	// Chatroom.find({ $or: checkExistParams }, function (err, chatrm) {

	// 	asyncForEach(chatrm, async item => {

	// 		let _chatId = item._id;
	// 		let from = item.from;
	// 		let to = item.to;
	// 		console.log('input data' + req.body.from + 'xxxx' + req.body.to);
	// 		console.log('actual data' + from + 'yyyyy' + to);

	// 		let message_id = item.message_id;
	// 		let messageVal = await getMessageId(message_id);
	// 		//console.log('funct return:'+JSON.stringify(messageVal));	
	// 		item.message = messageVal;
	// 		//item['message'] = messageVal;
	// 		accountAr.push(item);

	// 	}).then(() => {
	// 		//console.log('check 0xxxx' + accountAr);

	// 		// return res.status(200).json({
	// 		// 	accounts: accountAr,
	// 		// 	status: 'success',
	// 		// 	message: 'sent'
	// 		// });
	// 	});

	// });
	//-------------------------------------------------------------------------------


});

// *** hOME SCREEN - [CHAT LIST] ---------
chatroomRoute.route('/getmychatlist').get(function (req, res) {

	// // Get Auth user's Data:
	let data = tokenValidator.validate(req)
	req.user = data;

	let _id = req.user._id;
	console.log('my session Id:' + _id);
	console.log('my profile Data:' + data);
	console.log('my profile Data:' + JSON.stringify(req.user));
	//return res.status(200).json(data);



	// -----------------------[WITHOUT PAGINATIONS]-------------------------------------
	let checkExistParams = [{ from: _id }, { to: _id }];
	const accountAr = [];
	// accountAr = {};

	Chatroom.find({ $or: checkExistParams }, function (err, chatrm) {

		asyncForEach(chatrm, async item => {

			let _chatId = item._id;
			let from = item.from;
			let to = item.to;
			console.log('actual data' + from + 'yyyyy' + to);
			accountAr.push(item);

		}).then(() => {

			return res.status(200).json({
				accounts: accountAr,
				status: 'success',
				message: 'sent'
			});
		});

	});
	//-------------------------------------------------------------------------------


});

// [One-to-One] RETRIEVE MESSAGES : getChat list:
chatroomRoute.route('/getchatlist').post(function (req, res) {

	let from = req.body.from;
	let to = req.body.to;
	let limit = req.body.count;
	let page = req.body.page;
	// console.log('PARAMS :' + from + to + limit + page);

	//1.**pass parameter to to get pagination.
	let accountJsn = {
		$or: [{ from: String(from) }, { to: String(to) }, { from: String(to) }, { to: String(from) }]
	}

	const accountAr = [];
	getMessagePagination(accountJsn, from, to, limit, page).then((pageLogs) => {
		//console.log('GET PAGINATE ACCOUNT :' + JSON.stringify(pageLogs['accounts']));
		accountAr.push(pageLogs);
	}).then(() => {
		return res.status(200).json(accountAr);
	});

});


//*** Retrieve data for GET CHAT:
async function getMessageId(message_id) {
	let messages = '';
	await Chatconversation.findOne({ message_id: message_id }, function (err, chatmsgs) {
		Sync(function () {
			return messages = chatmsgs;
		}, function (err, messages) {
			//= console.error(err);	
			if (err) return messages;
		});

	});
	return messages;
}

//*** pagination tools and send data:
async function getMessagePagination(accountData, from, to, limit, page) {
	const myCustomLabels = {
		totalDocs: 'totalCount',
		docs: 'accounts',
		limit: 'count',  //perPage
		page: 'currentPage', //currentPage
		nextPage: 'next',
		prevPage: 'prev',
		totalPages: 'totalPages',
		pagingCounter: 'slNo',
		meta: ''  //paginator - Name of Array
	};

	const options = {
		page: page,
		limit: limit,
		sort: { _id: -1 },
		forceCountFn: true,
		customLabels: myCustomLabels
	};


	return await Chatroom.paginate(accountData, options);

	// let accountData = {
	// 	$or: [{ from: String(from)},{ to: String(to)}, { from: String(to)},{ to: String(from)}]
	// }	
}


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

module.exports = chatroomRoute;