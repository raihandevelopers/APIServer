// chatcoversation.route.js

const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const chatconversationRoute = express.Router();
var Sync = require('sync');
// Require user model in our routes module
let Chatconversation = require('../models/Chatconversation');


 
// Defined get data(index or listing) route
chatconversationRoute.route('/').get(function (req, res) {
    Chatconversation.find(function (err, users) {
        if (err) {
            console.log(err);
        }
        else {
            res.json(users);
        }
    });
}); 

//** getAll chat conversion list ----------------
// chatroomRoute.route('/').get(function (req, res) {
// 	Chatroom.find(function (err, chats) {
// 		if (err) {
// 			console.log(err);
// 		} else {
// 			const chatroom = [];
// 			asyncForEach(chats, async item => {

// 				let roomId = item._id;
// 				let chatListVal = await getChatMsgInfo(roomId);
// 				item['chatMessageInfo'] = chatListVal;
// 				chatroom.push(item);

// 				// var tempFieldAr = { 
// 				// 'roomId'          : chats,
// 				// 'chatMessageInfo' : chatListVal
// 				// }
// 				//chatroom.push(tempFieldAr);

// 			}).then(() => {
// 				return res.status(200).json(chatroom);
// 			});
// 		}
// 	});
// });


// //** getMy - Chatlist friends ------------------------
// chatroomRoute.route('/mychatlist').post(function (req, res) {

// 	let email = req.body.email;
// 	let checkExistParams = [{ userOne: req.body.email }, { userTwo: req.body.email }];
// 	const chatList = [];

// 	Chatroom.find({ $or: checkExistParams }, function (err, chatrm) {

// 		asyncForEach(chatrm, async item => {

// 			let roomId = item._id;
// 			let chatListVal = await getChatMsgInfo(roomId);
// 			//console.log('funct return:'+JSON.stringify(chatListVal));	
// 			item['chatMessageInfo'] = chatListVal;
// 			chatList.push(item);

// 			// var tempFieldAr = { 
// 			// 'chatRoomId' : item,
// 			// 'chatMessageInfo' : chatListVal
// 			// };

// 		}).then(() => {
// 			return res.status(200).json(chatList);
// 		});
// 	});

// });

// //** get Room chat messages  --------------------------- 	
// async function getChatMsgInfo(roomId) {

// 	await Chatconversation.find({ roomId: roomId }, function (err, chatmsgs) {
// 		Sync(function () {
// 			return msgResult = chatmsgs;
// 		}, function (err, msgResult) {
// 			if (err) console.error(err);
// 		});
// 	});
// 	return msgResult;
// }

// const permission = [];
// 		for (const [key, value] of Object.entries(permissions)) {
			
// 			//console.log(key, value['name']);
// 			var tempFieldAr = { 
// 			 '_id':value['_id'],
// 			'name':value['name'],
// 			'active':value['active']
// 			}
// 			permission.push(tempFieldAr);
//     }
    
function authenticateToken(req, res, next) {
	console.log('request header:'+req.headers['authorization']);
  // Gather the jwt access token from the request header
  const authHeader = req.headers['authorization'];
  console.log('header api:'+authHeader);
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

module.exports = chatconversationRoute;