const express = require('express')
const router = express.Router()
const Chat = require('../models/chatModel')
const Account = require('../models/accountsModel')
const Channel = require('../models/paychatChannelModel')
const tokenVerification = require('../lib/jwt')
const sortJsonArray = require('sort-json-array')
const fileUpload = require('express-fileupload')
const requesti = require('../lib/network')
const config = require('../config')
let settingsModel = require('../models/settings')
const marketInfoModel = require('../models/marketInfo')
const whitelistModel = require('../models/whitelist')



router.use(fileUpload());

// send message
router.post('/send_message', tokenVerification, function (req, res) {
    const chatJson = new Chat({
      fromUserId: req.user._id,
      toUserId: req.body.toUserId,
      message: req.body.message,
      channelId: req.body.channelId
    })
    chatJson.save(async function (err, chat) {
        if (err) {
          res.send({ status: 'error', message: err.message })
        } else if (!chat) {
          res.send({ status: 'false', message: 'message not sent' })
        } else {
            const channel = await Channel.findById(chatJson.channelId)
            paychatSend(channel.userId.wallets.mybiz, 'eth', 0.001, 'paychat', req.user.email, req.user.wallets.mybiz, req.user.ref, req, res)
            res.send({ status: true, message: 'message sent successfully', data: chat })
        }
    }) 
})



router.post('/editMessage', tokenVerification, function (req, res) {
     Chat.findOneAndUpdate({_id:req.body.chatId}, {message: req.body.message}, function (err, updated) {
        if (err) {
            res.send({ status: 'error', message: err.message })
          } else if (!updated) {
            res.send({ status: 'false', message: 'message not updated' })
          } else {
              res.send({ status: true, message: 'message updated successfully', data: updated })
          }
     })
})

router.post('/removeMessages', tokenVerification, async function (req, res)  {
	try {
		let messageIds = req.body.messageIds;

		let ids = messageIds.split(',')
		let result = await Chat.deleteMany({ _id: { $in: ids } })
		return res.status(200).json({
			status: 'success',
			data: messageIds,
      message: 'chats removed'
		})
	} catch (error) {
		return res.status(500).json({
			status: 'fail',
			message: "Error occured"
		})
	}
})

router.post('/getchats', tokenVerification, async function (req, res) {
  try {
    let skip = 0
    let page = req.query.page
  if (page != 1) {
    skip = (page - 1) * 10
  }
    const fromUserId = req.user._id
    const touserId = req.body.toUserId
     const chats = await Chat.find({ }).where({
      $or: [
        { fromUserId: touserId, toUserId: fromUserId },
        { fromUserId: fromUserId, toUserId: touserId }
      ]
    })
    console.log()
    const total = await Chat.find({}).where({
      $or: [
        { fromUserId: touserId, toUserId: fromUserId },
        { fromUserId: fromUserId, toUserId: touserId }
      ]
    }).count()

    res.send({status: true, message: 'chats found', data: chats, total, limit: 10, current_page: page, next_page: parseInt(page) + 1, prev_page: (page === 1) ? 1 : page - 1 })
  } catch (error) {
    console.log(error)
		return res.status(500).json({
			status: 'fail',
			message: error.message
		})
	}
})

router.post('/createChannel', tokenVerification, async function (req, res) {
    const channelJson = new Channel({
        channelName:req.body.channelName,
        channelDescription:req.body.channelDescription,
        userId:req.user._id
    })
    channelJson.save( function (err, channel) {
        if (err) {
          res.send({ status: 'error', message: err.message })
        } else if (!channel) {
          res.send({ status: 'false', message: 'channel not created' })
        } else {
            res.send({ status: true, message: 'channel created successfully', data: channel })
        }
    }) 
})

router.get('/deleteChannel', tokenVerification,  function (req, res) {
    Channel.findOneAndDelete({_id:req.query.channelId}, function (err, deleted ) {
        if (err) {
            res.send({ status: 'error', message: err.message })
          } else if (!deleted) {
            res.send({ status: 'false', message: 'channel not found' })
          } else {
              res.send({ status: true, message: 'channel deleted successfully' })
          }
    })
})

router.post('/getUserChatList', tokenVerification, async function (req, res) {
    const userId = req.user._id
    await Chat.find({$or:[{ fromUserId: userId },{ toUserId: userId }]}, async function (err, chats) {
        if (err) {
            res.send({ status: 'error', message: err.message })
          } else if (chats.length > 0) {
            const fromuserId = chats.map(function (chatdetails) { return chatdetails.fromUserId })
            const touserId = chats.map(function (chatdetails) { return chatdetails.toUserId })
            console.log(fromuserId, touserId)

            await Account.find({
                $or:
                  [
                    { _id: fromuserId },
                    { _id: touserId }
                  ],
                _id: { $nin: userId }
              }).exec(async function (err, users) {
                if (err) {
                  res.send({ status: 'error', message: err.message })
                } else if (users.length) {
                  const userArr = await users.map(async function (element) {
                    console.log(element._id, userId)
                    const chatarr = await Chat.find({}, function (err, chat) {
                      if (err) {
                        logger.error('ERROR: error in get chats: ', err.message)
                        res.send({ status: 'error', message: err.message })
                      } else if (chat.length) {
                        // console.log(chat)
                      }
                    }).where({
                      $or:
                    [
                      { fromUserId: userId, toUserId: element._id },
                      { fromUserId: element._id, toUserId: userId }
                    ]
                    }).sort({ sentAt: -1 }).limit(1)
                    console.log('chatarr', chatarr)
                    const unreadCount = await Chat.find({ readAt: null, fromUserId: element._id, toUserId: userId }).count()
                    
                    return { ...element._doc, unread_count: unreadCount, last_message: chatarr[0].message, lastChatId: chatarr[0]._id, lastMessageSentAt: chatarr[0].sentAt, fromUserId: chatarr[0].fromUserId, toUserId: chatarr[0].toUserId }
                  })
                  const tempArr = []
                  await userArr.map(x => x.then((re) => {
                    tempArr.push(re)
                    if (users.length === tempArr.length) {
                      res.send({ status: 'success', message: 'user chats avai1able', UserChatList: sortJsonArray(tempArr, 'lastMessageSentAt', 'des') })
                    } else {
                      return re
                    }
            }))
        } else {
            res.send({ status: false, message: 'No Chat Found'})
        }
    })
  } else {
    res.send({ status: false, message: ' No Chat Found'})
  }
})
})

router.post('/delete_userchat_list', function (req, res) {
  const fromuserId = req.body.userId
  let ids = fromuserId.split(',')
  const touserId = req.user._id
  ids.forEach(el => {
    Chat.deleteMany({
      $or:
      [
        { fromUserId: el, toUserId: touserId },
        { fromUserId: touserId, toUserId: el }
      ]
  })
})
  res.send({ status: 'success', message: 'chat deleted successfully' })
})

// update code for all users
router.post('/updatecode', async function (req, res) {
    const found = await Account.find({})
    let code = Math.floor(100000 + Math.random() * 900000);
    found.forEach( async function (el) {
        await Account.findOneAndUpdate({_id: el._id},{payChatId: el.firstName + el.lastName + String(code) }, function (err, updated) {
            if(err){
                res.send({ status: false, message: err.message })
            } else if (updated){
                console.log('updated')
            }
        })
    })
})

router.get('/getChat', async function (req, res) {
    const found = await Chat.find()
    res.send({ data: found})
})

router.post("/updateChannelImg" ,async (req, res) => {

  try {
     
      var file;

      if(!req.files)
      {
          res.send("File was not found");
          return;
      }
  
      file = req.files.fileName;  // here is the field name of the form
  
      res.send("File Uploaded");
    } catch (error) {
      console.log("error", error);
      res.status(500).send({
        status: "fail",
        message: "Error Occurred",
        error: "error",
      });
    }
})

router.post('/joinChannel',tokenVerification, async function (req, res) {
  try {
    let channel = await Channel.findOneAndUpdate({
      channel: req.body.channelId
  }, {
      $push: {
        channel_members: req.user._id
      }
  }, {
      new: true
  }).exec()
    res.send({status: true, message: 'joined to channel'})
  } catch (error) {
    console.log("error", error);
    res.status(500).send({
      status: "fail",
      message: "Error Occurred",
      error: "error",
    });
  }
})

router.post('/leaveChannel',tokenVerification, async function (req, res) {
  try {
    let channel = await Channel.findOneAndUpdate({
      channel: req.body.channelId
  }, {
      $pull: {
        channel_members: req.user._id
      }
  }, {
      new: true
  }).exec()
    res.send({status: true, message: 'exited from channel'})
  } catch (error) {
    console.log("error", error);
    res.status(500).send({
      status: "fail",
      message: "Error Occurred",
      error: "error",
    });
  }
})

async function paychatSend(to, currency, value, type, email, wallets, ref){

	if(Number(value) == 0){
		// return res.status(412).send({
		// status: 'fail',
		// message: 'Please enter an amount',
		// error: 'nil'
		// })
    console.log('amount is 0')
	}

	let status = await settingsModel.find({});
	let profile = await Account.find({ email: email });


	if (status[0].send == true) {
		
		if (String(to).toLowerCase() == String(wallets).toLowerCase()) {
			// return res.status(412).send({
			// 	status: 'fail',
			// 	message: 'Cannot send to same account',
			// 	error: 'nil',
			// });
			// return;
      console.log('cannot send to same account')
		}

		var Info = await marketInfoModel.findOne({}).lean();
		let minimunprice = Number(Info[String(currency).toUpperCase()].price)
		console.log("minimunprice",minimunprice)
		if(Number(value)*Number(minimunprice) < status[0].minimunusd){
			// return res.status(412).send({
			// status: 'fail',
			// message: 'USD equalent value should be greater than ' + status[0].minimunusd + "USD",
			// error: 'nil',
			// });
			// return;
      console.log('USD equalent value should be greater than ' + status[0].minimunusd + "USD")
		}

		currency = currency.toLowerCase();

		if (to.slice(0, 8) == 'ethereum') {
			to = to.slice(9);
			console.log('to:', to);
		}
		try {
			let acc = await Account.find({email: email });

			if ((await checkReceiver(to, currency)) == false) {
				// res.status(412).send({
				// 	status: 'fail',
				// 	message: 'Invalid Addresss',
				// 	error: 'nil',
				// });
				// return;
        console.log('Invalid Addresss')
			}
			console.log('new', await checkWhiteList(email, to, currency));

			if (acc[0].whitelist == true) {
				if ((await checkWhiteList(email, to, currency)) == false) {
					// res.status(412).send({
					// 	status: 'fail',
					// 	message: 'Address not in white list',
					// 	error: 'nil',
					// });
					// return;
          console.log('Address not in white list')
				}
				if (acc[0].email == email) {
					let wallets = await walletModel
						.findOne({email:email})
						.lean()
						.exec();
						if(currency == 'eth'){
							wallets[currency].balance = web3Provider.utils.fromWei(wallets[currency].balance)
						}
					//note to future self :P - sorry for nested IFs, ELSEs. Have to send different responses.
					console.log('BALANCE', wallets[currency].balance);
					if (Number(wallets[currency].balance) > Number(value)) {

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

						// res.status(412).send({
						// 	status: 'fail',
						// 	message: 'Not Enough Balance',
						// 	error: 'nil',
						// });
						// return;
            console.log('Not enough balance')
					}
				} else {
					//disabled kyc verification
					// res.send({
					// 	status: 'fail',
					// 	message: 'Permission Denied',
					// 	error: 'nil',
					// });
          console.log('Permission denied')
				}
			} else {
				if (acc[0].email == req.user.email) {
					let wallets = await walletModel
						.findOne({email:req.user.email})
						.lean()
						.exec();
						console.log("Balance",wallets[currency].balance )
					//note to future self :P - sorry for nested IFs, ELSEs. Have to send different responses.
					if(currency == 'eth'){
						wallets[currency].balance = web3Provider.utils.fromWei(wallets[currency].balance)
					}
					
					if (Number(wallets[currency].balance) > Number(value)) {
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

						// res.status(412).send({
						// 	status: 'fail',
						// 	message: 'Not Enough Balance',
						// 	error: 'nil',
						// });
						// return;
            console.log('Not Enough Balance')
					}
				} else {
					//disabled kyc verification
					// res.send({
					// 	status: 'fail',
					// 	message: 'permission_denied',
					// 	error: 'nil',
					// });
          console.log('Permission denied')
				}
			}

			console.log('new1');
		} catch (error) {
			// res.status(500).send({
			// 	status: 'fail',
			// 	message: 'Internal_server_error',
			// 	error: 'error',
			// });
      console.log('Internal_server_error', error.message)
		}
	} else {
		// res.status(500).send({
		// 	status: 'fail',
		// 	message: 'profile not configured Or user is blocked',
		// 	error: 'err',
		// });
    console.log('profile not configured Or user is blocked')
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

async function checkReceiver(to, _currency) {
	let emailFormat = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.])+\.([a-zA-Z]{2,5})/;
	if (emailFormat.test(to)) {
		console.log('is email');
		let result = await Account
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

module.exports = router;
