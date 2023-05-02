// chatroom.route.js

const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const chatroomRoute = express.Router();
var Sync = require('sync');
const asyncForEach = require('async-await-foreach');
const crypto = require('crypto')
// Require chat model in our routes module
let Chatroom = require('../models/Chatroom');
let Chatconversation = require('../models/Chatconversation');
let Chathistorystatus = require('../models/Chathistorystatus');
const groupModel = require('../models/group')
const accountsModel = require('../models/accounts')

const router = express.Router()
const config = require('../config')

const Account = require('../src/account')
const CustomError = require('../src/error')
const TokenValidator = require('../src/TokenValidator');
const tokenValidator = new TokenValidator(config.token.password, {
	expiresIn: "30d"
});

const Notification = require('../src/Notification');
const { result } = require('lodash');
//const { isModuleNamespaceObject } = require('util/types');

//const notification = new Notification('', '')




// [one to one ] save *** Defined store Messages  ****
chatroomRoute.route('/add').post(function (req, res) {
	//console.log(req.body);
	let last_modified_date = new Date().toUTCString()
	let {from,to} =req.body
	//check room ID existOrNot:
	let checkChatData = {
		from: from,//req.body.from,
		to: to,//req.body.to
	}
	//	let checkMessageIdData = req.body.message_id;
	if (req.body.message_id == undefined) {
		req.body.message_id = generateChannelName(from, to)
	}
	console.log("req.body.message_id", req.body.message_id)
	Chatroom.findOne({
		message_id: req.body.message_id//1623666770000_6087fd01c2852e0e7cd9cbe2
	}, {
		explicit: true
	}).then (async function (chatrm) {
console.log("chatrm*******************8",chatrm)
		if (chatrm == null || chatrm == '') {
			console.log('CREATE NEW******: message id not exists');

			const accountAr = [];

			let chatBody = {
				from: req.body.from,
				to: req.body.to,
				group: req.body.group,
				message_id: req.body.message_id,
				message: req.body.message,
				chatType: req.body.chatType
			};

			console.log('PARAM REQ BODY :' + chatBody);

			// CREATE NEW CHAT:
			//-----------------------------------------------------------------	
			let chatroom = new Chatroom(chatBody);
			chatroom.save()
				.then(async chatroom => {
let title 
					if(req.body.group != "0") {
						let group = await groupModel.findOne({channel: req.body.group}).lean().exec()
						title = group.group_name
					} else {
						let user = await accountsModel.findOne({_id: req.body.from})
						title = user.firstName || ''
					}
					//console.log(title, JSON.parse(req.body.message).message)
					console.log("send")
					await Notification.sendNotification(req.body.to, {
						notification_type: req.body.group == '0' ? '1' : '2', //1 for individual message, 2 for group message
						from: req.body.from,
						group_id: req.body.group,
						title:   title ,
						message: JSON.parse(req.body.message).message
					}).catch(e => {console.log(e.message)}) 
					// ===========================================================
					// ** maintain the history status here..[CREATE NEW]   
					let chathistorystatus = new Chathistorystatus(chatBody);
					console.log('chathistorystatus' + chathistorystatus);

					chathistorystatus.save().then(chathistorysts => {
					//	return true;
					}).catch(err => {
						return res.status(400).send("unable to save to database");
					});

					let chatBody2 = {
						from: req.body.to,
						to: req.body.from,
						group: req.body.group,
						message_id: req.body.message_id,
						message: req.body.message,
						last_modified_date: last_modified_date,
						chatType: req.body.chatType
					};

					// ** maintain the history status here..[CREATE NEW]   
					let chathistorystatus2 = new Chathistorystatus(chatBody2);
					console.log('chathistorystatus' + chathistorystatus2);

					chathistorystatus2.save().then(chathistorysts => {
					//	return true;
					}).catch(err => {
						return res.status(400).send("unable to save to database");
					});
					//============================================================

					//**** return Result :
					return res.status(200).json({
						accounts: chatroom,
						status: 'success',
						message: 'sent'
					});

					//res.status(200).json({chatroom: chatroom});
				}).catch(err => {
					console.log(err)
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
			// await Notification.sendNotification(req.body.to, {
			// 	notification_type: req.body.group == '0' ? '1' : '2', //1 for individual message, 2 for group message
			// 	from: req.body.from,
			// 	group_id: req.body.group,
			// 	title:   title ,
			// 	message: JSON.parse(req.body.message).message
			// }).catch(e => {console.log(e.message)}) 
			//for bind result:
			getMessageIdByID(_chatId).then((chatroom) => {
				// console.log("DB chat parent: " + chatroom);
				// console.log("DB chat parent2: " + JSON.stringify(chatroom));

				if (chatroom.message_id == message_id) {
					//console.log('in');
					chatroom.message = message;
					chatroom.last_modified_date = last_modified_date
					chatroom.save().then(chatroom => {
						console.log("update successfully");
						return true;

						//-----------------------------------------------------------

					}).catch(err => {
						return res.status(200).json(err);
					});

					accountmsgAr.push(chatroom);
					// console.log("updated Account: " + accountmsgAr);
					// =======================================================================
					let chatBody = {
						from: req.body.from,
						to: req.body.to,
						message_id: req.body.message_id,
						last_modified_date: last_modified_date
					};
					Chathistorystatus.find({
						from: chatBody.from,
						to: chatBody.to
					}, function (err, chatrmvHistroy) {
						if (!chatrmvHistroy.length) {
							console.log('histroy check find empty:');
							// ** maintain the history status here..[CREATE NEW]   ------
							let chathistorystatus = new Chathistorystatus(chatBody);
							console.log('chatconversation' + chathistorystatus);

							chathistorystatus.save().then(chathistorysts => {
								return true;
							}).catch(err => {
								return res.status(400).send("unable to save to database");
							});

						}
					});


					let chatBody2 = {
						from: req.body.to,
						to: req.body.from,
						message_id: req.body.message_id,
					};

					Chathistorystatus.find({
						from: chatBody2.from,
						to: chatBody2.to
					}, function (err, chatrmvHistroy) {
						if (!chatrmvHistroy.length) {
							console.log('histroy check find empty:');
							// ** maintain the history status here..[CREATE NEW]   ------
							let chathistorystatus2 = new Chathistorystatus(chatBody);
							console.log('chatconversation' + chathistorystatus2);

							chathistorystatus2.save().then(chathistorysts => {
								return true;
							}).catch(err => {
								return res.status(400).send("unable to save to database");
							});

						}
					});
					// ===================================================================

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
	//let chatsval = '';
	console.log('aid' + id);
	let chatsval = await Chatroom.findById(id);
	console.log('awaitF' + chatsval);
	return chatsval;
}

// chatroomRoute.route('/removeMessages').post(function (req, res) {
//         let from = req.body.from;
//         let messageIds = req.body.messageIds;

// 	let ids = messageIds.split(',')
//         //let checkExistParams = [{ from: from }];

//         const accountAr = [];
//         let chathistorystatusQuery = {
//                               //  from: from,
//                         //      to: to
//                         _id: {$in : ids}
//         }

// //        if(req.body.chatType != '""') {
//   //              chathistorystatus['chatType'] = req.body.chatType
//     //    }

//         Chathistorystatus.find(chathistorystatusQuery, function (err, chatrmvHistroy) {
//                 console.log('histroy Data Value:' + chatrmvHistroy);
//                 asyncForEach(chatrmvHistroy, async item => {

//                         let _chatId = item._id;
//                         let from = item.from;
//                         let to = item.to;
//                         let message_id = item.message_id;
//                         //let messageJsn = JSON.parse(message);

//                         item.removeStatus = true;
//                         item.save().then(itemmsgSts => {
//                                 return true;
//                         }).catch(err => {
//                                 return res.status(200).json(err);
//                         });

//                         //console.log('actual jsn:' + messageJsn);
//                         //let message = item.message;
//                         accountAr.push(item);

//                 }).then(() => {

//                         return res.status(200).json({
//                                 accounts: accountAr,
//                                 status: 'success',
//                                 message: 'sent'
//                         });
//                 });

//         });
// });

chatroomRoute.route('/removeMessages').post(async (req, res) =>  {
	try {
		let from = req.body.from;
		let messageIds = req.body.messageIds;

		let ids = messageIds.split(',')
		let result = await Chatroom.updateMany({ _id: { $in: ids } }, {
			$addToSet: {
				deletedBy: from
			}
		})
		return res.status(200).json({
			status: 'success',
			messageIds
		})
	} catch (error) {
		return res.status(500).json({
			status: 'fail',
			message: "Error occured"
		})
	}
})

chatroomRoute.route('/getchatlist').post(function (req, res) {

	let from = req.body.from;
	let to = req.body.to;
	let limit = req.body.count;
	let page = req.body.page;
	console.log('PARAMS :' + from + to + limit + page);
	const accountAr = [];

	// ** ==========================================================================================
	Chathistorystatus.find({
		from: from,
		to: to,
		chatType: req.body.chatType,
		removeStatus: false
	}, function (err, chatrmvHistroy) {
		console.log('histroy Data 1:' + chatrmvHistroy);
		//return res.status(200).json(chatrmvHistroy);

		if (!chatrmvHistroy.length) {
			console.log('histroy check empty:');
			return res.status(200).json({
				accounts: [],
				status: 'success',
				message: 'sent'
			});

		} else {

			console.log('get histroy Data Value(else):');

			asyncForEach(chatrmvHistroy, async item => {

				let _chatId = item._id;
				let from = item.from;
				let to = item.to;
				let message_id = item.message_id;
				//let messageJsn = JSON.parse(message);
				console.log('actual data from:' + from + 'to:' + to + 'msgg' + message_id);
				//console.log('actual jsn:' + messageJsn);
				//let message = item.message;
				let accountJsn = {
					$and: [{
							$or: [{
								from: String(from)
							}, {
								to: String(from)
							}]
						},
						{
							$or: [{
								from: String(to)
							}, {
								to: String(to)
							}]
						}, {chatType: req.body.chatType}
					]
				}


				//const accountAr = [];
				getMessagePagination(accountJsn, from, to, limit, page).then((pageLogs) => {
					console.log('GET PAGINATE ACCOUNT :' + JSON.stringify(pageLogs));
					//return res.status(200).json(pageLogs);
					//accountAr.push(pageLogs);
					return res.status(200).json({
						status: 'success',
						accounts: pageLogs['accounts'],
						total: pageLogs['totalCount'],
						count: pageLogs['count'],
						page: pageLogs['currentPage'],
						totalPages: pageLogs['totalPages'],
						slNo: pageLogs['slNo'],
						hasPrevPage: pageLogs['hasPrevPage'],
						hasNextPage: pageLogs['hasNextPage']
					})

				}).then(() => {
					//return res.status(200).json(accountAr);
				});

			}).then(() => {
				//return res.status(200).json(accountAr);
			});
		}
		//return res.status(200).json(chatrmvHistroy);
	});

});

chatroomRoute.route('/getOneToOneMessageBulk').post(async  (req, res) => {

	console.log("req.body",req.body)
	let from = req.body.from;
	let to = req.body.to;
	let last_sync = req.body.last_sync

	//console.log('PARAMS :' + from + to + limit + page);
	const accountAr = [];
	let ChathistorystatusQuery = {
		from: from,
		to: to,
		removeStatus: false,
		last_modified_date: {
			$gte:new Date(last_sync)//.toISOString()
		}
	}

	if (req.body.chatType != 'both') {
		ChathistorystatusQuery['chatType'] = req.body.chatType
	}
	//2021-11-08T05:42:10.000Z

	console.log("ChathistorystatusQuery",ChathistorystatusQuery)

	// ** ==========================================================================================
	await Chathistorystatus.find(ChathistorystatusQuery, function (err, chatrmvHistroy) {
		console.log('histroy Data 1:' + chatrmvHistroy);
		//return res.status(200).json(chatrmvHistroy);

		if (!chatrmvHistroy || chatrmvHistroy.length == 0) {
			console.log('histroy check empty:');
			return res.status(200).json({
				accounts: [],
				status: 'success',
				message: 'sent'
			});

		} else {

			console.log('get histroy Data Value(else):');

			asyncForEach(chatrmvHistroy, async item => {

				let _chatId = item._id;
				let from = item.from;
				let to = item.to;
				let message_id = item.message_id;
				//let messageJsn = JSON.parse(message);
				console.log('actual data from:' + from + 'to:' + to + 'msgg' + message_id);
				//console.log('actual jsn:' + messageJsn);
				//let message = item.message;
				let chatTypeQuery = [{
					$or: [{
						from: String(from)
					}, {
						to: String(from)
					}]
				},
				{
					$or: [{
						from: String(to)
					}, {
						to: String(to)
					}]
				},
				{
					last_modified_date: {
						$gte: new Date(last_sync)
					}
				},
						{
							deletedBy: {$ne: req.body.from}
						} 
				]
				if (req.body.chatType != 'both') {
					chatTypeQuery.push({ chatType: req.body.chatType })
				}

				let accountJsn = {
					$and: chatTypeQuery
				}

				console.log("chatTypeQuery",chatTypeQuery)
				console.log("accountJsn",accountJsn)

				let result = await Chatroom.find(accountJsn).lean().exec()

				console.log("result",result)

				return res.status(200).json({
					status: 'success',
					accounts: result
				})
				//const accountAr = [];
				// getMessagePagination(accountJsn, from, to, limit, page).then((pageLogs) => {
				// 	console.log('GET PAGINATE ACCOUNT :' + JSON.stringify(pageLogs));
				// 	//return res.status(200).json(pageLogs);
				// 	//accountAr.push(pageLogs);
				// 	return res.status(200).json({
				// 		status: 'success',
				// 		accounts: pageLogs['accounts'],
				// 		total: pageLogs['totalCount'],
				// 		count: pageLogs['count'],
				// 		page: pageLogs['currentPage'],
				// 		totalPages: pageLogs['totalPages'],
				// 		slNo: pageLogs['slNo'],
				// 		hasPrevPage: pageLogs['hasPrevPage'],
				// 		hasNextPage: pageLogs['hasNextPage']
				// 	})

				// }).then(() => {
				// 	//return res.status(200).json(accountAr);
				// });

			}).then(() => {
				//return res.status(200).json(accountAr);
			});
		}
		//return res.status(200).json(chatrmvHistroy);
	});

});


// [One-to-One] RETRIEVE MESSAGES : getChat list: ------------------------------------
chatroomRoute.route('/getchatlist2').post(function (req, res) {

	let from = req.body.from;
	let to = req.body.to;
	let limit = req.body.count;
	let page = req.body.page;
	console.log('PARAMS :' + from + to + limit + page);
	const accountAr = [];

	//const accountAr = [];
	getMessagePagination(accountJsn, from, to, limit, page).then((pageLogs) => {
		console.log('GET PAGINATE ACCOUNT :' + JSON.stringify(pageLogs));
		//return res.status(200).json(pageLogs);
		//accountAr.push(pageLogs);
		return res.status(200).json({
			status: 'success',
			accounts: pageLogs['accounts'],
			total: pageLogs['totalCount'],
			count: pageLogs['count'],
			page: pageLogs['currentPage'],
			totalPages: pageLogs['totalPages'],
			slNo: pageLogs['slNo'],
			hasPrevPage: pageLogs['hasPrevPage'],
			hasNextPage: pageLogs['hasNextPage']
		})

	}).then(() => {
		//return res.status(200).json(accountAr);
	});

});


//*** pagination tools and send data:
async function getMessagePagination(accountData, from, to, limit, page) {
	const myCustomLabels = {
		totalDocs: 'totalCount',
		docs: 'accounts',
		limit: 'count', //perPage
		page: 'currentPage', //currentPage
		nextPage: 'next',
		prevPage: 'prev',
		totalPages: 'totalPages',
		pagingCounter: 'slNo',
		meta: '' //paginator - Name of Array
	};

	const options = {
		page: page,
		limit: limit,
		sort: {
			_id: -1
		},
		forceCountFn: true,
		customLabels: myCustomLabels
	};


	return await Chatroom.paginate(accountData, options);

	// let accountData = {
	// 	$or: [{ from: String(from)},{ to: String(to)}, { from: String(to)},{ to: String(from)}]
	// }	
}

// -------------------------------------------------------------------------------------------------

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
	let checkExistParams = [{
		from: _id
	}, {
		to: _id
	}];
	const accountAr = [];
	// accountAr = {};

	Chatroom.find({
		$or: checkExistParams
	}, function (err, chatrm) {

		asyncForEach(chatrm, async item => {

			let _chatId = item._id;
			let from = item.from;
			let to = item.to;
			let message = item.message;
			//let messageJsn = JSON.parse(message);
			console.log('actual data from:' + from + 'to:' + to);
			//console.log('actual jsn:' + messageJsn);
			//let message = item.message;
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
// 
chatroomRoute.route('/deleteMultipleChat').post(async function (req, res) {
try{

let{ ids } = req.body;


console.log("typeof(ids)",typeof(ids))
console.log("Array.isArray(ids)",Array.isArray(ids))

let dataFromDb, update
let filter, query

	if(Array.isArray(ids)){
    ids.forEach(async _asset => {

		filter = {"message_id": _asset}
		dataFromDb = await Chatroom.find(filter)

		// console.log("dataFromDb",dataFromDb)

		dataFromDb.forEach(async key =>{
			console.log("key",key)

			update = await Chatroom.findOneAndUpdate({_id:key._id},{$set:{isDeleted:"true"}},{new:true})
			console.log("update",update)


//notification user to user 
			await Notification.sendNotification(key.to, {
				//notification_type from request
				notification_type:req.body.notification_type,// req.body.group?req.body.group:key.group, //req.body.group == '0' ? '1' : '2', //1 for individual message, 2 for group message
				call_status:'',
				inititator:key.from,
				//group id from request
				group_id: req.body.group_id?req.body.group_id:0,
				message: '',//JSON.parse(req.body.message).message
				from: key.from ,
				receiver:key.to
				// from: key.from ,
				//title:title ,
				
			})
//notification user to himself
			await Notification.sendNotification(key.from, {
				//notification_type from request
				notification_type: req.body.notification_type,//req.body.group?req.body.group:key.group, //req.body.group == '0' ? '1' : '2', //1 for individual message, 2 for group message
				call_status:'',
				inititator:key.from,
				//group id from request
				group_id: '0',//req.body.group_id?req.body.group_id:0,
				message: '',//JSON.parse(req.body.message).message
				from: key.from ,
				receiver:key.to
				// from: key.from ,
				//title:title ,
				
			})

			// console.log("key.message",key.message)

			// console.log("key.deletedBy[0]",key.deletedBy[0])


			// if(key.deletedBy[0].isDeleted==undefined){
			// 	console.log("1")
			// 	// console.log("key.deletedBy ",key.deletedBy)

			// 	update = await Chatroom.findOneAndUpdate({_id:key._id},{$push:{"deletedBy":{"isDeleted":"true"}}},{new:true})

			// }
			// else if(key.deletedBy[0].isDeleted!= undefined){
			// 	console.log("2")
			// 	// console.log("key.deletedBy not null",key.deletedBy.isDeleted)

			// 	update = await Chatroom.findOneAndUpdate({_id:key._id},{$set:{[`${key}.deletedBy[0].isDeleted`]:"true"}},{new:true})
			// }




			//update = await Chatroom.findOneAndUpdate({_id:key._id},{$set:{"isDeleted":"true"}},{new:true})


			// console.log("update",update)
		})

		//let result = await Chatroom.deleteOne({"message_id": _asset})

    })
}
else{
	console.log("id",ids)
	filter = {"message_id": ids}
	dataFromDb = await Chatroom.find(filter)
	dataFromDb.forEach(async key =>{

		update = await Chatroom.findOneAndUpdate({_id:key._id},{$set:{isDeleted:"true"}},{new:true})
		console.log("update",update)

		console.log("key",key)

			//notification user to user 
			await Notification.sendNotification(key.to, {
				//notification_type from request
				notification_type:req.body.notification_type, //req.body.group?req.body.group:key.group, //req.body.group == '0' ? '1' : '2', //1 for individual message, 2 for group message
				call_status:'',
				inititator:key.from,
				//group id from request
				group_id: req.body.group_id?req.body.group_id:0,
				message: '',//JSON.parse(req.body.message).message
	
				from: key.from ,
				//title:title ,
				receiver:key.to
				
			})

		//notification user to himself
		await Notification.sendNotification(key.from, {
			//notification_type from request
			notification_type: req.body.notification_type,//?req.body.notification_type:req.body.,//req.body.group?req.body.group:key.group, //req.body.group == '0' ? '1' : '2', //1 for individual message, 2 for group message
			call_status:'',
			inititator:key.from,
			//group id from request
			group_id: '0',//req.body.group_id?req.body.group_id:'0',
			message: '',//JSON.parse(req.body.message).message
			from: key.from ,
			// from: key.from ,
			//title:title ,
			receiver:key.to
			
		})

	// console.log("key",key)
	// console.log("key.deletedBy",key.deletedBy)
	// 	console.log("key.deletedBy[0]",key.deletedBy[0])

	// 	if(key.deletedBy==''){
	// 		console.log("3")

	// 		update = await Chatroom.findOneAndUpdate({_id:key._id},{$push:{"deletedBy":{"isDeleted":"true"}}},{new:true})

	// 	}
	// 	else if(key.deletedBy[0].isDeleted!= undefined){
	// 		console.log("4")

	// 		update = await Chatroom.findOneAndUpdate({_id:key._id},{$set:{[`${key}.deletedBy[0].isDeleted`]:"true"}},{new:true})
	// 	}

	// 	console.log("update",update)





		// console.log("key",key)
		// console.log("key.message",key.message)

		// update = await Chatroom.findOneAndUpdate({_id:key._id},{$set:{"isDeleted":"true"}},{new:true})
		// console.log("update",update)

		// await Notification.sendNotification(key.to, {
		// 	notification_type: req.body.group?req.body.group:key.group, //req.body.group == '0' ? '1' : '2', //1 for individual message, 2 for group message
		// 	// from: key.from ,
		// 	call_status:'',
		// 	inititator:key.from,
		// 	group_id: req.body.group_id?req.body.group_id:0,
		// 	//title:title ,
		// 	message: ''//JSON.parse(req.body.message).message
		// })


	})

	//let result = await Chatroom.deleteOne({"message_id": ids})

	//console.log(result)
	

}







	return res.status(200).json({
		
		status: 'success',
		message: 'deleted' //+ result.deletedCount
	});

	 }




catch(err){
	console.log(err.message)
	return res.status(400).json({
		"status" : 'deleted' //+ result.deletedCount
	})
}

});

chatroomRoute.route('/chatremoveallhistory').post(function (req, res) {
	let from = req.body.from;

	const accountAr = [];
	let chathistorystatusQuery = {
		                from: from,
	}

	if(req.body.chatType != '""') {
		chathistorystatus['chatType'] = req.body.chatType
	}
	Chathistorystatus.find(chathistorystatusQuery, function (err, chatrmvHistroy) {
		console.log('histroy Data Value:' + chatrmvHistroy);
		asyncForEach(chatrmvHistroy, async item => {

			let _chatId = item._id;
			let from = item.from;
			let to = item.to;
			let message_id = item.message_id;
			//let messageJsn = JSON.parse(message);
			item.removeStatus = true;
			item.save().then(itemmsgSts => {
				return true;
			}).catch(err => {
				return res.status(200).json(err);
			});
			accountAr.push(item);

		}).then(() => {

			return res.status(200).json({
				accounts: accountAr,
				status: 'success',
				message: 'sent'
			});
		});

	});
});

chatroomRoute.route('/chatremoveonehistory').post(function (req, res) {
	let from = req.body.from;
	let to = req.body.to;

	//let checkExistParams = [{ from: from }];

	const accountAr = [];
        let chathistorystatusQuery = {
                                from: from,
				to: to
        }

        if(req.body.chatType != '""') {
                chathistorystatus['chatType'] = req.body.chatType
        }
        Chathistorystatus.find(chathistorystatusQuery, function (err, chatrmvHistroy) {
		console.log('histroy Data Value:' + chatrmvHistroy);
		asyncForEach(chatrmvHistroy, async item => {

			let _chatId = item._id;
			let from = item.from;
			let to = item.to;
			let message_id = item.message_id;
			//let messageJsn = JSON.parse(message);

			item.removeStatus = true;
			item.save().then(itemmsgSts => {
				return true;
			}).catch(err => {
				return res.status(200).json(err);
			});

			//console.log('actual jsn:' + messageJsn);
			//let message = item.message;
			accountAr.push(item);

		}).then(() => {

			return res.status(200).json({
				accounts: accountAr,
				status: 'success',
				message: 'sent'
			});
		});

	});
});

chatroomRoute.route('/chatremoveGroup').post(function (req, res) {
	let from = req.body.from;
	let to = req.body.to;
	let group = req.body.group_id
	//let checkExistParams = [{ from: from }];

	const accountAr = [];
	Chathistorystatus.find({
		from: from,
		to: to,
		group: group,
                chatType: req.body.chatType
	}, function (err, chatrmvHistroy) {
		console.log('histroy Data Value:' + chatrmvHistroy);
		asyncForEach(chatrmvHistroy, async item => {

			let _chatId = item._id;
			let from = item.from;
			let to = item.to;
			let message_id = item.message_id;
			//let messageJsn = JSON.parse(message);

			item.removeStatus = true;
			item.save().then(itemmsgSts => {
				return true;
			}).catch(err => {
				return res.status(200).json(err);
			});

			//console.log('actual jsn:' + messageJsn);
			//let message = item.message;
			accountAr.push(item);

		}).then(() => {

			return res.status(200).json({
				accounts: accountAr,
				status: 'success',
				message: 'sent'
			});
		});

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

module.exports = chatroomRoute;


function generateChannelName(maker, receiver) {
	let hash = crypto.createHash('sha1').update(maker + receiver + new Date().getTime()).digest('hex')
	return hash
}
