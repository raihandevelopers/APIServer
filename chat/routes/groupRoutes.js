const express = require('express')
const router = express.Router()
const body = require('express-validator').body
const header = require('express-validator').header
const query = require('express-validator').query
const validationResult = require('express-validator').validationResult
const crypto = require('crypto')
const config = require('../config')
const CustomError = require('../src/error')
const TokenValidator = require('../src/TokenValidator')
const tokenValidator = new TokenValidator(config.token.password, {
    expiresIn: "30d"
})
const groupModel = require('../models/group')
const accountsModel = require('../models/accounts')
const chatHistoryModel = require('../models/Chathistorystatus')
const asyncForEach = require('async-await-foreach');
const fileUpload = require("express-fileupload");
router.use(fileUpload());
const path = require('path');
let Chatroom = require('../models/Chatroom');
const businessModel = require('../models/businessModel')
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
// var express = require('express');
const RemovedGroupUser = require('../models/userRemovedGroupsModel')
var app = express();
// const fileUpload = require('express-fileupload');

// app.use(fileUpload()); // For getting kycDocumets
const multer  = require('multer')

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, '/root/apis/pinksurfing_back_token/pinksurfing_backend/chat/attachments')
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + file.originalname.slice(file.originalname.lastIndexOf('.')))
    }
  })
  
  const upload = multer({ storage: storage })
  const cpUpload = upload.fields([{ name: 'image', maxCount: 1 }])
const validate = routeName => {
    switch (routeName) {
        case 'createGroup':
            return [
                body('group_members').exists().notEmpty(),
                body('group_name').exists().isString().notEmpty(),
            ]

        case 'groupDetails':
            return [
                query('group_id').exists().notEmpty()
            ]

        case 'removeFromGroup':
            return [
                body('group_id').exists().notEmpty(),
                body('userId').exists().notEmpty()
            ]

        case 'exitFromGroup':
            return [
                body('group_id').exists().notEmpty(),
            ]
    }
}

//check authorization header
// router.use((req, res, next) => {
//     try {
//         let data = tokenValidator.validate(req)
//         req.user = data
//         next()
//     } catch (error) {
//         res.status(error.statusCode).send({
//             message: error.message,
//             status: 'fail'
//         })
//     }

// })

router.post('/getGroupMessage', function (req, res) {

    let from = req.user._id;
    let to = "0";
    let limit = req.body.count;
    let page = req.body.page;
    console.log('PARAMS :' + from + to + limit + page);
    const accountAr = [];

    // ** ==========================================================================================
    chatHistoryModel.find({
        /* from: from, to: to,*/
        group: req.body.group_id,
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
                        }
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

router.post('/getGroupMessageBulk', function (req, res) {

    let from = req.user._id;
    let to = "0";
    let last_sync = req.body.last_sync

    // console.log('PARAMS :' + from + to + limit + page);
    const accountAr = [];

    // ** ==========================================================================================
	let chathistoryQuery = {        group: req.body.group_id,
        removeStatus: false,
        last_modified_date: {
            $gte: new Date(last_sync)//.toISOString()
        }
} 

     if(req.body.chatType != 'both') {
	chathistoryQuery['chatType'] = req.body.chatType
     }
    console.log("chathistoryQuery",chathistoryQuery)

    //  let dynamicQuery1 = {$and:[{group: req.body.group_id},{removeStatus: false},{last_modified_date:{$gte: new Date(last_sync)}},{chatType:req.body.chatType}]}


    // dynamicQuery1 = []
    // dynamicQuery1.push(chathistoryQuery)

    // console.log("dynamicQuery1",dynamicQuery1)
    // let accountJsn1 = {
    //     $and: dynamicQuery
    // }
    // console.log("accountJsn1",accountJsn1)
// uncomment below line
    chatHistoryModel.find( chathistoryQuery , function (err, chatrmvHistroy) {

        // chatHistoryModel.find( dynamicQuery1 , function (err, chatrmvHistroy) {
        console.log('histroy Data 1:' + chatrmvHistroy);
        //return res.status(200).json(chatrmvHistroy);

        if (chatrmvHistroy == null || chatrmvHistroy.length == 0) {
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

		let dynamicQuery = [
                        // {
                        //     $or: [{
                        //         from: String(from)
                        //     }, {
                        //         to: String(from)
                        //     }]
                        // },
                        // {
                        //     $or: [{
                        //         from: String(to)
                        //     }, {
                        //         to: String(to)
                        //     }]
                        // },
                        {
                            last_modified_date: {
                                $gte: new Date(last_sync)
                            }
                        },
                        {group:req.body.group_id}
                    ]
		if(req.body.chatType != 'both') {
			dynamicQuery.push({chatType:req.body.chatType})
		}
console.log("dynamicQuery",dynamicQuery)
                let accountJsn = {
                    $and: dynamicQuery
                }
console.log("accountJsn",accountJsn)
                let result = await Chatroom.find(accountJsn).lean().exec()

                // let result = chatrmvHistroy

				return res.status(200).json({
					status: 'success',
					accounts: result
				})
                //const accountAr = [];
                // getMessagePagination(accountJsn, from, to, limit, page).then((pageLogs) => {
                //     console.log('GET PAGINATE ACCOUNT :' + JSON.stringify(pageLogs));
                //     //return res.status(200).json(pageLogs);
                //     //accountAr.push(pageLogs);
                //     return res.status(200).json({
                //         status: 'success',
                //         accounts: pageLogs['accounts'],
                //         total: pageLogs['totalCount'],
                //         count: pageLogs['count'],
                //         page: pageLogs['currentPage'],
                //         totalPages: pageLogs['totalPages'],
                //         slNo: pageLogs['slNo'],
                //         hasPrevPage: pageLogs['hasPrevPage'],
                //         hasNextPage: pageLogs['hasNextPage']
                //     })

                // }).then(() => {
                //     //return res.status(200).json(accountAr);
                // });

            }).then(() => {
                //return res.status(200).json(accountAr);
            });
        }
        //return res.status(200).json(chatrmvHistroy);
    });

});

router.post('/deleteGroup', function (req, res) {
    let from = req.user._id;
    let to = "0";
    let group = req.body.group_id
    //let checkExistParams = [{ from: from }];

    const accountAr = [];
    chatHistoryModel.find({
        /* from: from, to: to, */
        group: group
    }, async function (err, chatrmvHistroy) {
        await groupModel.updateOne({
            channel: group
        }, {
            $set: {
                isRemoved: true
            }
        }).exec()
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

router.get('/allChats', async (req, res, next) => {
    try {
        console.log("1!@#$%^&*()")

	let groupInfoQuery = {
           'group_members': req.user._id,
            isRemoved: false,
	}

	let chatHistoryQuery = {
         	from: req.user._id,
            to: {
                $ne: "0"
            }
	}

	if(req.query.chatType != 'both') {
		groupInfoQuery['chatType'] = req.query.chatType
		chatHistoryQuery['chatType'] = req.query.chatType
	}
        let groupInfo = await groupModel.find(groupInfoQuery).populate({path: 'group_members', select: ['_id', 'email', 'phone', 'dateOfBirth', 'firstName', 'lastName', 'lastSeen', 'profileImage']})

        let chatHistory = await chatHistoryModel.find(chatHistoryQuery).lean().exec()


        //filter duplicates
        let userInfo = chatHistory.filter((thing, index, self) =>
            index === self.findIndex((t) => (
                t.to === thing.to //&& t.name === thing.name
            ))
        )

        //get only 'to' field
        let receivers = userInfo.map(value => {
            return value.to
        })

        let result = await accountsModel.find({
            _id: {
                $in: receivers
            }
        }).lean().exec()
console.log(groupInfo)
        res.send({
            status: 'success',
            groupInfo: groupInfo, //await groupInfo.populate({path: 'group_members', select: ['_id', 'email', 'phone', 'dateOfBirth', 'firstName', 'lastName', 'lastSeen']}).execPopulate(),
//groupInfo,
            userInfo: userInfo
        })
    } catch (error) {
	console.log(error)
	res.status(500).send({status: 'fail', message:'error occurred'})
    }
})

router.get('/allChats', async (req, res, next) => {
    try {
        console.log("2!@#$%^&*()")

        let groupInfo = await groupModel.find({
            'group_members._id': req.user._id,
	    chatType: req.query.chatType
        }).lean().exec()


        let chatHistory = await chatHistoryModel.find({
            from: req.user._id,
            to: {
                $ne: "0"
            },
	   chatType: req.query.chatType
        }).lean().exec()

        let userInfo = chatHistory.filter((thing, index, self) =>
            index === self.findIndex((t) => (
                t.to === thing.to //&& t.name === thing.name
            ))
        )

        let receivers = userInfo.map(value => {
            return value.to
        })

        let result = await accountsModel.find({
            _id: {
                $in: receivers
            }
        }).lean().exec()
        /*let result = await accountsModel.aggregate([{
                    $match: {
        //                $in: receivers
        _id: {$in: receivers}
                    }
                },{
                    $project: {
                        email: 1,
                        phone: {
                            $ifNull: ["$phone", ""]
                        },
                        dateOfBirth: {
                            $ifNull: ["$dateOfBirth", ""]
                        },
                        firstName: {
                            $ifNull: ["$firstName", ""]
                        },
                        lastName: {
                            $ifNull: ["$lastName", ""]
                        },
                        lastSeen: {
                            $ifNull: ["$lastSeen", ""]
                        }
                    }
                }]).exec()*/

        res.send({
            status: 'success',
            groupInfo: groupInfo,
            //		userInfo: userInfo,
            userInfo: result
        })
    } catch (error) {
        console.log(error)
    }
})

router.post('/createGroup', validate('createGroup'), async (req, res, next) => {
    try {

        let errors = validationResult(req)
        if (errors.isEmpty() == false) {
            console.log(errors.array())
            next(new CustomError('Invalid Inputs', 422, errors.array()));
        } else {

            let {
                //group_id,
                group_name,
                group_members,
                group_image, //todo image upload                
            } = req.body

            group_members = group_members.split(",");
            let channel = generateChannelName(req.user._id, 'randomString:P')
            let creator_id = req.user._id
            let creator_name = req.user.firstName || ''

            let user, members = []

            if (Array.isArray(group_members)) {
                user = await accountsModel.find({
                    _id: {
                        $in: group_members
                    }
                }).lean().exec()

                user.forEach(_user => {
                    members.push({
                        _id: _user._id,
                        email: _user.email,
                        phone: _user.phone || '',
                        dateOfBirth: _user.dateOfBirth || '',
                        firstName: _user.firstName || '',
                        lastName: _user.lastName || '',
                        lastSeen: _user.lastSeen ? new Date(_user.lastSeen) : ''
                    })
                })

            } else {

                user = await accountsModel.findOne({
                    _id: group_members
                }).lean().exec()

                members.push({
                    _id: user._id,
                    email: user.email,
                    phone: user.phone || '',
                    dateOfBirth: user.dateOfBirth || '',
                    firstName: user.firstName || '',
                    lastName: user.lastName || '',
                    lastSeen: user.lastSeen ? new Date(user.lastSeen) : ''
                })
            }


            let group = new groupModel({
                //group_id: group_id,
                group_name: group_name,
                //group_image: 'http://assets.stsblockchain.cf/eth.png', //todo
                channel: channel,
		        chatType: req.body.chatType,
                creator_id: creator_id,
                creator_name: creator_name,
                group_members: group_members, //members,
                //groupMembers: group_members,
                createdAt: new Date(),
            })

            await group.save() //.populate('groupMembers')

            res.send({
                status: 'success',
                message: 'group created',
                groupInfo: await group.populate({path: 'group_members', select: ['_id', 'email', 'phone', 'dateOfBirth', 'firstName', 'lastName', 'lastSeen', 'profileImage']}).execPopulate()
            })

        }
    } catch (error) {
console.log("error:",error)        
next(new CustomError('Error Occured', 500, []))
    }
})

router.get('/groupInfo', validate('groupDetails'), async (req, res, next) => {
    try {
        let errors = validationResult(req)

        if (errors.isEmpty == false) {
            console.log(errors.array())
            next(new CustomError('Invalid Inputs', 422, errors.array()));
        } else {
            let data = await groupModel.findOne({
                channel: req.query.group_id
            })

            res.send({
                status: 'success',
                data: data == null ? "" : await data.populate({path: 'group_members', select: ['_id', 'email', 'phone', 'dateOfBirth', 'firstName', 'lastName', 'lastSeen', 'profileImage']}).execPopulate()
            })
        }

    } catch (error) {
        next(new CustomError('Error Occured', 500, []))
    }
})

router.get('/groupInfo_edit', validate('groupDetails'), async (req, res, next) => {
    try {
        let errors = validationResult(req)

        if (errors.isEmpty == false) {
            console.log(errors.array())
            next(new CustomError('Invalid Inputs', 422, errors.array()));
        } else {
            let data = await groupModel.findOne({
                channel: req.query.group_id
            })

            console.log("data-----------------",data)

            let accInfo
            let member_info = [] 
            
            data.group_members_detailed = []

            await data.group_members.forEachAsync(async key => {
                accInfo = await accountsModel.findOne({ _id: key }).lean().exec()
                let bussinessInfo = await businessModel.findOne({ user_email: accInfo.email }).lean().exec();
                console.log("accInfo",accInfo)
                delete accInfo['pin']
                delete accInfo['password']
            
                let email = accInfo.email
            
                let emailInfo = email.split('@');
            
                // member_info =
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

                if(accInfo.passport == true && accInfo.kycStatus == "pending"){
                    accInfo.passport_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_Passport_id_1.jpg',
                    accInfo.passport_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_Passport_id_2.jpg'
                }

                if(accInfo.passport == true && accInfo.kycStatus == "approved"){
                    accInfo.passport_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_Passport_id_1.jpg',
                    accInfo.passport_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_Passport_id_2.jpg'
                }
                if(accInfo.passport == true && accInfo.kycStatus == "rejected"){
                    accInfo.passport_front_image = null,
                    accInfo.passport_rear_image = null
                    
                }
            
                if(accInfo.creditcard == true && accInfo.kycStatus == "pending"){
                    accInfo.creditcard_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_creditcard_id_1.jpg',
                    accInfo.creditcard_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_creditcard_id_2.jpg'
                }

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
            
                if(accInfo.insurance == true && accInfo.kycStatus == "pending"){
                    accInfo.insurancecard_front_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_insurance_id_1.jpg',
                    accInfo.insurancecard_rear_image = config.kycImgPath + '/' + emailInfo[0]+'%40'+emailInfo[1] + '_insurance_id_2.jpg'
                }
            
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

                member_info.push(accInfo)
                console.log("member_info",member_info)
                
                // data['group_members_detailed'] = member_info
                // console.log("data['group_members_detailed']---------------",data['group_members_detailed'])

                data.group_members_detailed = member_info
                console.log("data['group_members_detailed']---------------",data.group_members_detailed)

                
            })
            // delete data['group_members']
            delete data.group_members
        //  console.log("data['group_members_detailed_last']---------------",data['group_members_detailed'])
        console.log("data['group_members_detailed_last']---------------",data.group_members_detailed)
           

            res.send({
                status: 'success',
                data: data == null ? "" : await data.populate({path: 'group_members', select: ['_id', 'email', 'phone', 'dateOfBirth', 'firstName', 'lastName', 'lastSeen', 'profileImage']}).execPopulate(),
                userInfo:data.group_members_detailed

            })
        }

    } catch (error) {
        next(new CustomError('Error Occured', 500, []))
    }
})

router.post('/addToGroup', async (req, res, next) => {
    try {
        let {
            group_id,
            group_members
        } = req.body

        let user, member = []
        if (Array.isArray(group_members)) {

            user = await accountsModel.find({
                _id: {
                    $in: group_members
                }
            }).lean().exec()

            user.forEach(_user => {
                member.push({
                    _id: _user._id,
                    email: _user.email,
                    phone: _user.phone || '',
                    dateOfBirth: _user.dateOfBirth || '',
                    firstName: _user.firstName || '',
                    lastName: _user.lastName || '',
                    lastSeen: _user.lastSeen ? new Date(_user.lastSeen) : ''
                })
            })

        } else {
            user = await accountsModel.findOne({
                _id: group_members
            }).lean().exec()

            member.push({
                _id: user._id,
                email: user.email,
                phone: user.phone || '',
                dateOfBirth: user.dateOfBirth || '',
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                lastSeen: user.lastSeen ? new Date(user.lastSeen) : ''
            })
        }

        let group = await groupModel.findOneAndUpdate({
            channel: group_id
        }, {
            $addToSet: {
              /*  group_members: {
                    $each: member
                },*/
                group_members: group_members
            }
        }, {
            new: true
        })

        res.send({
            status: 'success',
            message: 'success',
            data: await group.populate({path: 'group_members', select: ['_id', 'email', 'phone', 'dateOfBirth', 'firstName', 'lastName', 'lastSeen', 'profileImage']}).execPopulate()
//group
        })
    } catch (error) {
        console.log(error.message)
        next(new CustomError('Error occurred', 500, []))
    }
})

router.post('/removeFromGroup', validate('removeFromGroup'), async (req, res, next) => {
    try {

        let errors = validationResult(req)

        if (errors.isEmpty() == false) {
            console.log(errors.array())
            next(new CustomError('Invalid Inputs', 422, errors.array()));
        } else {
            let group = await groupModel.findOneAndUpdate({
                channel: req.body.group_id
            }, {
                $pull: {
                  /*  'group_members': {
                        _id: req.body.userId
                    },*/
		  group_members: req.body.userId
                }
            }, {
                new: true
            }).exec()
            const  removedUser = {
                user: req.body.userId,
                group: group._id
            }
            const removeUser = RemovedGroupUser(removedUser)
            removeUser.save(removedUser, function(err, saved){
                if(err) {
                    res.send({ status: false, message: err.message })
                }
            })
            res.send({
                status: 'success',
                message: 'success',
                data: await group.populate({path: 'group_members', select: ['_id', 'email', 'phone', 'dateOfBirth', 'firstName', 'lastName', 'lastSeen', 'profileImage']}).execPopulate()

            })
        }

    } catch (error) {
        console.log(error.message)
        next(new CustomError('Error occurred', 500, []))
    }
})

router.post('/exitFromGroup', validate('exitFromGroup'), async (req, res, next) => {
    try {

        let errors = validationResult(req)

        if (errors.isEmpty() == false) {
            console.log(errors.array())
            next(new CustomError('Invalid Inputs', 422, errors.array()));
        } else {
            let group = await groupModel.findOneAndUpdate({
                channel: req.body.group_id
            }, {
                $pull: {/*
                    group_members: {
                        _id: req.user._id
                    }, */
			group_members: req.user._id
                }
            }, {
                new: true
            }).exec()
            const  removedUser = {
                user: req.user._id,
                group: group._id
            }
            const removeUser = RemovedGroupUser(removedUser)
            removeUser.save(removedUser, function(err, saved){
                if(err) {
                    res.send({ status: false, message: err.message })
                }
            })
            if(group) {
            res.send({
                status: 'success',
                message: 'success',
                data: await group.populate({path: 'group_members', select: ['_id', 'email', 'phone', 'dateOfBirth', 'firstName', 'lastName', 'lastSeen', 'profileImage']}).execPopulate()
            })
        } else {
            res.send({
                status: false,
                message: 'group not found' })
        }
        }

    } catch (error) {
        console.log(error.message)
        next(new CustomError('Error occurred', 500, []))
    }
})
//, multipartMiddleware

//not used
app.post("/updateGroupImg1",cpUpload ,async (req, res) => {

    try {
       
        var file;

        if(!req.files)
        {
            res.send("File was not found");
            return;
        }
    
        file = req.files.fileName;  // here is the field name of the form
    
        res.send("File Uploaded");
    


    //     txnReceipt.name =  "txnReceipt" + req.body.group_id //+ txnReceipt.name.slice(txnReceipt.name.lastIndexOf('.'))

    //     txnReceipt.mv(path.join(config.attachmentPath, txnReceipt.name))
        
    //     let group = await groupModel.updateOne(
    //         { channel: group_id },
    //         {
    //           $set: {
    //             group_image: config.attachmentPath + txnReceipt.name
    //           },
    //         }
    //       );
    //       console.log("group", group);    
        
    //   if (group.nModified) {
    //     res.status(200).send({
    //       status: "success",
    //       message: "Group Image uploaded to Server." + config.attachmentPath + txnReceipt.name,
    //       error: "nil",
    //     });
  
    //   } else {
    //     res.status(500).send({
    //       status: "fail",
    //       message: "Failed to upload image.",
    //       error: "nil",
    //     });
    //   }
    } catch (error) {
      console.log("error", error);
      res.status(500).send({
        status: "fail",
        message: "Error Occurred",
        error: "error",
      });
    }
});

//base 64 //not used
router.post("/updateGroupImage", async (req, res) => {

    try {

    let { group_image, group_id } = req.body;   
    let group = await groupModel.updateOne(
        { channel: group_id },
        {
          $set: {
            group_image: group_image
          },
        }
      );
      console.log("group", group);    
      if (group.nModified) {
        res.status(200).send({
          status: "success",
          message: "Group Image uploaded to Server.",
          error: "nil",
        });
  
      } else {
        res.status(500).send({
          status: "fail",
          message: "Failed to upload image.",
          error: "nil",
        });
      }
    } catch (error) {
      console.log("error", error);
      res.status(500).send({
        status: "fail",
        message: "Error Occurred",
        error: "error",
      });
    }
});

router.post("/updateGroupName", async (req, res) => {
    try {
    let { group_name, group_id } = req.body;   
    //console.log("req.body", req.body)
    let group = await groupModel.updateOne(
        { channel: group_id },
        {
          $set: {
            group_name: group_name
          },
        }
      );

      console.log("group", group);    
      if (group.nModified) {
        res.status(200).send({
          status: "success",
          message: "Group name updated Successfully.",
          error: "nil",
        });
  
      } else {
        res.status(500).send({
          status: "fail",
          message: "Failed to update group name.",
          error: "nil",
        });
      }
    } catch (error) {
      console.log("error", error);
      res.status(500).send({
        status: "fail",
        message: "Error Occurred",
        error: "error",
      });
    }
});


router.use((err, req, res, next) => {
    res.status(err.statusCode).send({
        status: 'fail',
        message: err.message,
        error: err.erros
    })
})

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

function generateChannelName(maker, receiver) {
    let hash = crypto.createHash('sha1').update(maker + receiver + new Date().getTime()).digest('hex')
    return hash
}

router.get('/get_removed_userlist', async (req, res) => {

	await groupModel.findOne({ _id: req.query.groupId, isRemoved: false }, async function (err, group){
		if(err) {
			res.send({ status: false, message: err.message })
		} else if (group) {
			await RemovedGroupUser.find({ group: req.query.groupId }, async function (err, found) {
				if(err) {
					res.send({ status: false, message: err.message })
				} else if (found.length > 0){
                    const ar = []
                    found.forEach(el => {
                        if(el.user) {
                        const userJSON = {
                          _id: el._id,
                          group: el.group,
                          name: el.user.firstName,
                          profileImage: el.user.profileImage
                        }
                        ar.push(userJSON)
                    }
                    })
					const ListJSON = {
						group: group,
						removedList: ar
					}
					res.send({ status: true, message: 'Removed userList', data: ListJSON })
				} else {
					const ListJSON = {
						group: group,
						removedUserList: []
					}
					res.send({ status: true, message: 'Removed userList', data: ListJSON })
				}
			})
		} else {
			res.send({ status: false, message: 'group not found' })
		}
	}).populate({path: 'group_members', select: ['_id', 'email', 'phone', 'dateOfBirth', 'firstName', 'lastName', 'lastSeen', 'profileImage']}).execPopulate()
})


module.exports = router

/* TODO 
 * LastSeen using projections
 * Group image, if needed
 *
 */
