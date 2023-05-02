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
var ObjectId = require('mongodb').ObjectID
const Notification = require('../src/Notification')
//const notification = new Notification('', '')
const accountsModel = require('../models/accounts')
const callsModel = require('../models/CallsModel')
const groupModel = require('../models/group')

// const FCM = require("firebase-admin")
// FCM.initializeApp({
//     credential: FCM.credential.cert(serviceAccount),//applicationDefault(),
//     databaseURL: 'https://pinksurfing-309615-default-rtdb.firebaseio.com', //https://mete-cc8b5.firebaseio.com',
//     messagingSenderId: '224357051309'
// })
// const options = {
//     priority: "high",
//     timeToLive: 60 * 60 * 24
// };

const validate = (routeName) => {
    switch (routeName) {
        case 'initiate':
            return [
                //body('from').isString().exists(),
                //body('to').isString().exists(),
                //body('type').isString().exists(),
            ]

        case 'channel':
            return [
                body('channel').exists().notEmpty()
            ]

        case 'end':
            return [
                body('channel').exists().notEmpty()
            ]

        case 'reject':
            return [
                body('channel').exists().notEmpty(),
                body('group_id').exists().notEmpty()
            ]

        case 'accept':
            return [
                body('channel').exists().notEmpty()
            ]

        case 'status':
            return [
                query('channel').exists().notEmpty() 
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

router.get('/channel', async (req, res, next) => {
    try {
        let channel = await callsModel.findOne({
            channel: req.query.channel
        }).lean().exec()
        if (channel) {
            channel.current_server_time = new Date()
        } else { channel = {} }

        //	channel = channel != null ? channel.current_server_time = new Date() : {}


        let groupdata = await groupModel.findOne({ channel: channel.group_id })
        if (groupdata) {
            channel.group_image = groupdata.group_image
            channel.group_name = groupdata.group_name
        }
        res.send({
            status: true,
            data: channel
        })

    } catch (error) {
        next(new CustomError('Error occured', 500, []))
    }
})

router.get('/statusold', validate('status'), async (req, res, next) => {
    try {
        let status = await callsModel.findOne({
            $and: [{
                $or: [{
                    from: req.user._id
                },
                {
                    to: req.user._id
                },
                ]
            }, {
                $or: [{
                    call_status: '1'
                }, {
                    call_status: '2'
                }]
            }]
        }).lean().exec()

        res.send({
            status: 'success',
            data: status == null ? [] : [status],
            callStatus: status == null ? false : true
        })
    } catch (error) {

    }
})
 
//,validate('status')
// router.get('/status',validate('status'),async (req, res, next) => {

router.get('/status', async(req,res,next) => {
    try 
    
    {

   

        console.log("req.user._id", req.user._id)
        
        let group_ids = await groupModel.aggregate([
            {
                $match: {
                    group_members: ObjectId(req.user._id),
                }
            },
            {
                $group: {
                    _id: "$channel"
                }
            }
        ])
        console.log("group_ids", group_ids)
        let data = []
        let data1 =[]

        if (group_ids != null){
            await group_ids.forEachAsync(async (_groupid) => {
            status2 = await callsModel.findOne({
                $and: [ 
                {
                    group_id: _groupid
                },
                {
                    $or: [{
                        call_status: '1'
                    }, {
                        call_status: '2'
                    }],
                }]
            }).lean().exec()

            console.log("status2", status2)

            if (status2 != null) {
                data.push(status2)
            }

            


        })
        }

        console.log("data", data)

        if (group_ids != null) {
            await group_ids.forEachAsync(async (_groupid) => {

                let status = await callsModel.findOne({
                    $and: [{
                        $or: [{
                            from: req.user._id
                        },
                        {
                            to: req.user._id
                        }]
                    }, 
                    {
                        group_id: _groupid
                    },
                    {
                        $or: [{
                            call_status: '1'
                        }, {
                            call_status: '2'
                        }],
                    }]
                }).lean().exec()
                if (status != null) {
                    data.push(status)
                }


            })
            status1 = await callsModel.findOne({
                $and: [{
                    $or: [{
                        from: req.user._id
                    },
                    {
                        to: req.user._id
                    },
                    ]
                }, {
                    $or: [{
                        call_status: '1'
                    }, {
                        call_status: '2'
                    }]
                }]
            }).lean().exec()
            if (status1 != null) {
                data.push(status1)
            }


            
            res.send({
                status: 'success',
                data: data == null ? [] : data,
               // data1: data1 == null ? [] : data1,
                callStatus: data == null ? false : true
            })
            return
            // res.send({
            //     status: 'success',
            //     data: [],
            //     callStatus: false
            // })
            // return

        } else {
            let status = await callsModel.findOne({
                $and: [{
                    $or: [{
                        from: req.user._id
                    },
                    {
                        to: req.user._id
                    },
                    ]
                }, {
                    $or: [{
                        call_status: '1'
                    }, {
                        call_status: '2'
                    }]
                }]
            }).lean().exec()

            res.send({
                status: 'success',
                data: status == null ? [] : [status],
                callStatus: status == null ? false : true
            })
        }

    } catch (error) 
        {
            console.log(error.message)
        return res.send({status: 'fail'})
        }
})

// router.get('/status1',validate('status'),async (req, res, next) => {
//     try 
    
//     {

//     if(req.user == undefined){ return res.send({"status":"success"}) }
//     console.log("channel",req.body.channel)

//         console.log("req.user._id", req.user._id)
//         let group_ids = await groupModel.aggregate([
//             {
//                 $match: {
//                     group_members: ObjectId(req.user._id),
//                 }
//             },
//             {
//                 $group: {
//                     _id: "$channel"
//                 }
//             }
//         ])
//         console.log("group_ids", group_ids)
//         let data = []
        
//         if (group_ids != null) {
//             await group_ids.forEachAsync(async (_groupid) => {

//                 let status = await callsModel.findOne({
//                     $and: [ 
//                     {
//                         group_id: _groupid
//                     },
//                     {
//                         $or: [{
//                             call_status: '1'
//                         }, {
//                             call_status: '2'
//                         }],
//                     }]
//                 }).lean().exec()
//                 if (status != null) {
//                     data.push(status)
//                 }


//             })
//             status1 = await callsModel.findOne({
//                 $and: [{
//                     $or: [{
//                         from: req.user._id
//                     },
//                     {
//                         to: req.user._id
//                     },
//                     ]
//                 }, {
//                     $or: [{
//                         call_status: '1'
//                     }, {
//                         call_status: '2'
//                     }]
//                 }]
//             }).lean().exec()
//             if (status1 != null) {
//                 data.push(status1)
//             }
//             res.send({
//                 status: 'success',
//                 data: data == null ? [] : data,
//                // data1: data1 == null ? [] : data1,
//                 callStatus: data == null ? false : true
//             })
//             return
//             // res.send({
//             //     status: 'success',
//             //     data: [],
//             //     callStatus: false
//             // })
//             // return

//         } else {
//             let status = await callsModel.findOne({
//                 $and: [{
//                     $or: [{
//                         from: req.user._id
//                     },
//                     {
//                         to: req.user._id
//                     },
//                     ]
//                 }, {
//                     $or: [{
//                         call_status: '1'
//                     }, {
//                         call_status: '2'
//                     }]
//                 }]
//             }).lean().exec()

//             res.send({
//                 status: 'success',
//                 data: status == null ? [] : [status],
//                 callStatus: status == null ? false : true
//             })
//         }

//     } catch (error) 
//         {
//         return res.send({status: 'fail'})
//         }
// })

router.post('/initiate', validate('initiate'), async (req, res) => {
    try {

        console.log("query")
        console.log(req.query.to);

        console.log("params")
        console.log(req.query.to);
        let errors = validationResult(req)

        // console.log("TEST1////////",errors.isEmpty())
        // console.log("TEST2////////",req.user)

    console.log("entry")

// if (req.user == undefined ){ return res.send({status:'fail'}) }


        if (errors.isEmpty() == false) {
            console.log(errors)
            console.log('hi')
            return res.send({status:'fail'})
            // next(new CustomError('Invalid Inputs', 422, errors.array()))
        } else {

            let from = req.body
            console.log("TEST////////",req.user._id)

            let checkForCalls = await callsModel.findOne({
                    $or: [
                    {
                        from: req.user._id 
                    },
                     {
                        to: req.user._id
                    },
                    {
                        from: req.body.to
                    }, 
                    {
                        to: req.body.to
                    }
                ]
            }).lean().exec()
        let checkForCall=null;
        if(checkForCalls){
             checkForCall = await callsModel.findOne({_id:checkForCalls._id,  $and: [{call_status: { $ne: "3" }}, {call_status: { $ne: "4" }} ] })
        }
            console.log("test", checkForCall)
            if (checkForCall) {
                // if (!checkForCalls) {
                res.status(200).send({ //changed to 200 from 400 as requested
                    status: 'fail',
                    message: 'User busy cannot make call'
                })

                return

                // await callsModel.find({})
            }
            let receiver
            if (req.body.to) {
                console.log('to entry')
                receiver = await accountsModel.findOne({
                    _id: req.body.to
                }).lean().exec() //todo import accountsModel
            }
            group_members_in_call = []

            let group_image = ''
            if(req.body.group_id != undefined)
            {
               let test = await groupModel.find({"channel":req.body.group_id})
               test.forEach(key => {
                group_image = key.group_image
               })
            //    console.log("p",p)
            //    p.forEach(key => {
            //        key.group_members.forEach(_key => {
            //            console.log("group_members",key)
            //            group_members_in_call.push(_key) 
            //        })
            //    })
            }
            


            // console.log("group_members_in_call",group_members_in_call)
            let channelName = generateChannelName(req.body.from, req.body.to)
            // console.log("////////////////////")
            // console.log('firstName', req.user)
            // console.log('receiver', receiver)
            await callsModel.create({
                from: req.body.from,
                to: req.body.to,
                type: req.body.notification_type,
                maker_virtual_id: req.body.from,
                maker_name: req.user.firstName ? req.user.firstName : '',
                maker_email: req.user.email,
                maker_image: req.user.profileImage,
                chatType: req.body.chatType,
                receiver_virtual_id: req.body.to,
                receiver_name: receiver ? receiver.firstName || '' : '',
                receiver_email: receiver ? receiver.email : '',
                receiver_image: receiver ? receiver.profileImage : '',
                channel: channelName,
                datetime: new Date(),
                call_mode: req.body.type,
                duration: 0,
                call_status: '1', //todo change status 
                call_make_time: new Date(),
                call_accept_time: '',
                call_end_time: '',
                group_id: req.body.group_id,
                group_name: req.body.group_name ? req.body.group_name : '',
                group_members_in_call:group_members_in_call,
                calling_reject_for_first_time: true,
                group_image:group_image,
            })


// indivudual notification to receiver
if(req.body.to != ""){

    try {

        Notification.sendNotification(req.body.to, {
            // Notification.sendNotification(0, {
            notification_type: req.body.notification_type, //== "1" ? "4" : "5",
            from: req.user.id,
            group_id: req.body.group_id ? req.body.group_id : "0",
            title: req.user.firstName || '',
            message: req.body.message || '',
            call_status:'initiate'
        }).then((result)=>{
 console.log("result",result);
console.log("Sending notification success");


})        
     } catch (e) {
console.log("Sending notification failed");
        console.log(e.message)
    }
}




            //push notification //todo
        //    if(receiver.body.to)
        //    { 


        if (req.body.group_id != "")
          {
               try {

                // Notification.sendNotification(req.body.to, {
                    Notification.sendNotification(0, {
                    notification_type: req.body.notification_type, //== "1" ? "4" : "5",
                    from: req.user.id,
                    group_id: req.body.group_id ? req.body.group_id : "0",
                    title: req.user.firstName || '',
                    message: req.body.message || '',
                    call_status:'initiate'
                })//.then((result)=>{ console.log("result",result)})        
             } catch (e) {
                console.log(e.message)
            }

        }

        // }

            // if(!receiver.body.to){
            //     console.log("Group notification")

            //     try {

            //         Notification.sendNotification(req.body.to, {
            //             notification_type: req.body.notification_type, //== "1" ? "4" : "5",
            //             from: req.user.id,
            //             group_id: req.body.group_id ? req.body.group_id : "0",
            //             title: req.user.firstName || '',
            //             message: req.body.message || ''
            //         })//.then((result)=>{ console.log("result",result)})        
            //      } catch (e) {
            //         console.log(e.message)
            //     }


            // }

            let groupdata = await groupModel.findOne({ channel: req.body.group_id }).lean()
            // let group_image
            let group_name
            if (groupdata) {
                group_image = groupdata.group_image
                group_name = groupdata.group_name
            }
            res.send({
                status: true,
                message: 'call initiated',
                data: {
                    from: req.body.from,
                    to: req.body.to,
                    type: req.body.notification_type,
                    maker_virtual_id: req.body.from,
                    maker_name: req.user.firstName || '',
                    maker_email: req.user.email,
                    maker_image: req.user.image || '',
                    chatType: req.body.chatType,
                    receiver_virtual_id: req.body.to,
                    receiver_name: receiver ? receiver.firstName || '' : '',
                    receiver_email: receiver ? receiver.email : '',
                    receiver_image: receiver ? receiver.image : '',
                    channel: channelName,
                    datetime: new Date(),
                    call_mode: req.body.type,
                    duration: 0,
                    call_status: '1', //todo change status 
                    call_make_time: new Date(),
                    call_accept_time: '',
                    call_end_time: '',
                    group_id: req.body.group_id,
                    group_image: group_image,
                    group_name: group_name,
                    group_members_in_call:group_members_in_call,
                    calling_reject_for_first_time: true
                }
            })
        }
    } catch (error) {
        console.log("error", error.message)
        // next(new CustomError('Error Occured', 500, []))
    }
})

router.post('/accept', validate('accept'), async (req, res) => { // todo - add validate
    try {
        let errors = validationResult(req)
        if (errors.isEmpty() == false) {
            next(new CustomError('Invalid Inputs', 422, errors.array()))
        } else {
            await callsModel.updateOne({
                channel: req.body.channel
            }, {
                $set: {
                    call_status: '2', //todo change status
                    call_accept_time: new Date()
                }
            }).exec()


            let channel = await callsModel.findOne({
                channel: req.body.channel
            }).lean().exec()
            try {
                await Notification.acceptCall(channel.maker_virtual_id, {
                    // notification_type: "4",
                    // from: req.user.id,
                    // group_id: req.body.channel
                    notification_type: channel.type, //== "1" ? "4" : "5",
                    from: req.user.id,
                    group_id: req.body.channel,
                    title: req.user.firstName || '',
                    message: req.body.message || ''
                })
            } catch (e) {
                console.log(e.message)
            }

            res.send({
                status: true,
                message: 'accepted',
                data: channel
            })
        }
    } catch (error) {
        next(new CustomError('Error occured', 500, []))
    }
})

router.post('/end', validate('end'), async (req, res) => { // todo - add validate
    try {
        let errors = validationResult(req)
        if (errors.isEmpty() == false) {
            next(new CustomError('Invalid Inputs', 422, errors.array()))
        } else {

            let resu = await callsModel.find({channel: req.body.channel})
console.log("resu",resu)
console.log("resu[0].group_id",resu[0].group_id)
let gid = resu[0].group_id
console.log("resu[0].maker_virtual_id",resu[0].maker_virtual_id)
let vid = resu[0].maker_virtual_id
if(!resu){
    return res.send({"status":"fail","message":"no channel found"})
}

    //indivudual call
if(req.body.group_id == '0'){

            await callsModel.updateOne({
                channel: req.body.channel
            }, {
                $set: {
                    call_status: '3', //todo change status
                    call_end_time: new Date(),
                    //duration: {$divide:[{$subtract:[new Date(),"$call_accept_time"]}, 1000]}
                }
            }).exec()

            if (resu[0].type  == "4")
            {
            console.log("voice call")
            //caller
            try {
            Notification.sendNotification(resu[0].maker_virtual_id, {
                notification_type: "4", 
                initiater:resu[0].from,
                from: req.user.id,
                call_status:"End",
                group_id: resu[0].group_id? resu[0].group_id:"0",
                title: "test",
                message: "Incoming Voice Call"
            })//.then((result)=>{ console.log("result",result)})        
            } catch (e) {
            console.log(e.message)
            }
            
            //rejector
            try {
            
                Notification.sendNotification(resu[0].to, {
                    notification_type: "4", 
                    initiater:resu[0].from,
                    from: req.user.id,
                    call_status:"End",
                    group_id: req.body.group_id, //resu[0].group_id?resu[0].group_id:"0",
                    title: "test",
                    message: "Incoming Voice Call"
                })//.then((result)=>{ console.log("result",result)})        
             } catch (e) {
                console.log(e.message)
            }
            
            }
            
            
            if (resu[0].type  == "5" || resu[0].type  == "6")
            {
            console.log("video call")
            //caller
            try {
            Notification.sendNotification(resu[0].maker_virtual_id, {
                notification_type: resu[0].type,//"5", 
                initiater:resu[0].from,
                from: req.user.id,
                call_status:"End",
                group_id: req.body.group_id, //resu[0].group_id?resu[0].group_id:"0",//req.body.group_id? req.body.group_id:"0",
                title: "test",
                message: "Incoming Video Call"
            })      
            } catch (e) {
            console.log("e.message",e.message)
            }
            
            //rejector
            try {
            
                Notification.sendNotification(resu[0].to, {
                    notification_type: resu[0].type,//"5", 
                    initiater:resu[0].from,
                    from: req.user.id,
                    call_status:"End",
                    group_id:  req.body.group_id,//resu[0].group_id?resu[0].group_id:"0",
                    title: "test",
                    message: "Incoming Video Call"
                })       
             } catch (e) {
                console.log("e.message",e.message)
            }
            
            }
        }

        //group call
else if(req.body.group_id != '0'){

    // await callsModel.updateOne({
    //     channel: req.body.channel
    // }, {
    //     $set: {
    //         call_status: '3', //todo change status
    //         call_end_time: new Date(),
    //         //duration: {$divide:[{$subtract:[new Date(),"$call_accept_time"]}, 1000]}
    //     }
    // }).exec()

    await callsModel.updateOne({
        channel: req.body.channel
    }, {
        $set: {
            call_status: '3', //todo change status
            call_end_time: new Date(),
            group_members_in_call:[],
            calling_reject_for_first_time: true
            //duration: {$divide:[{$subtract:[new Date(),"$call_accept_time"]}, 1000]}
        }
    }).exec()



    if (resu[0].type  == "4")
    {
    console.log("group voice call")



    //caller
    try {
    Notification.sendNotification(resu[0].maker_virtual_id, {
        notification_type: "4", 
        initiater:resu[0].from,
        from: req.user.id,
        call_status:"End",
        group_id: req.body.group_id,//resu[0].group_id? resu[0].group_id:"0",
        title: "test",
        message: "Incoming Voice Call"
    })//.then((result)=>{ console.log("result",result)})        
    } catch (e) {
    console.log(e.message)
    }
    
    //rejector
    try {
    
        Notification.sendNotification(resu[0].to, {
            notification_type: "4", 
            initiater:resu[0].from,
            from: req.user.id,
            call_status:"End",
            group_id:  req.body.group_id,//resu[0].group_id?resu[0].group_id:"0",
            title: "test",
            message: "Incoming Voice Call"
        })//.then((result)=>{ console.log("result",result)})        
     } catch (e) {
        console.log(e.message)
    }
    
    }

    if (resu[0].type  == "5" || resu[0].type  == "6")
    {
    console.log("video call")
// fcm to group members

try {

    // Notification.sendNotification(req.body.to, {
        Notification.sendNotification(0, {
        notification_type: '6',
        receiver:'',
        call_status:'End',
        from:resu[0].from,
        title: 'test',
        group_id: req.body.group_id ,
        message:  'Incoming Group Call'
       

    })//.then((result)=>{ console.log("result",result)})        
 } catch (e) {
    console.log(e.message)
}

    //caller
    // try {
    // Notification.sendNotification(resu[0].maker_virtual_id, {
    //     notification_type: resu[0].type,//"5", 
    //     initiater:resu[0].from,
    //     from: req.user.id,
    //     call_status:"End",
    //     group_id: req.body.group_id,//resu[0].group_id?resu[0].group_id:"0",//req.body.group_id? req.body.group_id:"0",
    //     title: "test",
    //     message: "Incoming Video Call"
    // })      
    // } catch (e) {
    // console.log("e.message",e.message)
    // }
    
    //rejector
    // try {
    
    //     Notification.sendNotification(resu[0].to, {
    //         notification_type: resu[0].type,//"5", 
    //         initiater:resu[0].from,
    //         from: req.user.id,
    //         call_status:"End",
    //         group_id:  req.body.group_id,//resu[0].group_id?resu[0].group_id:"0",
    //         title: "test",
    //         message: "Incoming Video Call"
    //     })       
    //  } catch (e) {
    //     console.log("e.message",e.message)
    // }
    
    }



}
            // await callsModel.aggregate([{
            //     $match: {
            //         channel: req.body.channel
            //     }
            // },{
            //     $set: {
            //         call_status: '3', 
            //         call_end_time: new Date(),
            //         duration: {$divide:[{$subtract:[new Date(),"$call_accept_time"]}, 1000]}
            //     }
            // }])

            let channel = await callsModel.findOne({
                channel: req.body.channel
            }).lean().exec()
            //await notification.endCall(channel.maker_virtual_id, 'CALL_ENDED')
            let groupdata = await groupModel.findOne({ channel: channel.group_id })
            if (groupdata) {
                channel.group_image = groupdata.group_image
                channel.group_name = groupdata.group_name
            }
            res.send({
                status: true,
                data: channel,
            })
        }
    } catch (error) {
        next(new CustomError('Error occured', 500, []))
    }
})
//not used
router.post('/rejectSesanth', validate('reject'), async (req, res, next) => { //todo validate
    try {
        
        let errors = validationResult(req)
        if (errors.isEmpty() == false) {
            next(new CustomError('Invalid Inputs', 422, errors.array()))
        } else {

let resu = await callsModel.find({channel: req.body.channel})
// console.log("resu",resu)
// console.log("resu[0].group_id",resu[0].group_id)
// let gid = resu[0].group_id
// console.log("resu[0].maker_virtual_id",resu[0].maker_virtual_id)
// let vid = resu[0].maker_virtual_id


if(!resu){
    return res.send({"status":"fail","message":"no channel found"})
}

            await callsModel.updateOne({
                channel: req.body.channel
            }, {
                $set: {
                    call_status: '4', //todo

                }
            })
           
            console.log("req.user._id",req.user._id)
            console.log("Testttttt")
           // await Notification.acceptCall(channel.maker_virtual_id, {

if(req.body.group_id != undefined){
            let pull = await callsModel.updateOne(
                { channel: req.body.channel },
                { $pull: { 'group_members_in_call': req.user._id } },
                { new : true }
              );
              console.log("pull", pull)

              console.log("user removed from channel")

             let arr = await callsModel.find({channel: req.body.channel})
             console.log("arr", arr)
             arr.forEach(async _arr =>{
                 if(_arr.group_members_in_call.length == '2'){
                //  _arr.group_members_in_call.forEach({
                    console.log("_arr.from", _arr.from)

                    let member1 = []

                    console.log("req.body.group_id", req.body.group_id)

                    let member2 = await groupModel.find({_id:req.body.group_id})

                    console.log("member2", member2)

                    member2.forEach(async _arr1 => {

                        member1 = _arr1.group_members
                        console.log("member1", member1)

                       if ( member1.includes(_arr.from) )
                       {
                           member1.forEach(async member3 => {
                        Notification.sendNotification(member3, {
                            notification_type: "6", 
                            initiater:resu[0].from,
                            // from: req.user.id,
                           
                            call_status:"End",
                           
                            group_id:  req.body.group_id,
                            title: "test",
                            message: "Incoming Group Call"
                        })
                           })

                       }
                      //  if(_arr.from)

                    })

                    // members1 = _arr.group_members_in_call

                    // console.log("members1", members1)

                //    let members1 = await groupModel.find({ group_id : req.body.group_id})

                   //await groupModel.find({"group_members": { $all : [ObjectId("6093823fe3733358704a7ac7") ]}})

                //    console.log("members1", members1)
                //    let members2 = members1
                        // Notification.sendNotification(resu[0].maker_virtual_id, {
                        //     notification_type: "4", 
                        //     initiater:resu[0].from,
                        //     from: req.user.id,
                        //     call_status:"Reject",
                        //     group_id:  "0",
                        //     title: "test",
                        //     message: "Incoming Voice Call"
                        // })//.then((result)=>{ console.log("result",result)})        
                       
                        // console.log(e.message)
                       


                //  })
                }
                else{
                    console.log("_arr.group_members_in_call.length", _arr.group_members_in_call.length)
                }



             })
            }            
if (resu[0].type  == "4")
{
console.log("voice call")
//caller
try {
Notification.sendNotification(resu[0].maker_virtual_id, {
    notification_type: "4", 
    initiater:resu[0].from,
    from: req.user.id,
    call_status:"Reject",
    group_id:  "0",
    title: "test",
    message: "Incoming Voice Call"
})//.then((result)=>{ console.log("result",result)})        
} catch (e) {
console.log(e.message)
}

//rejector
try {

    Notification.sendNotification(resu[0].to, {
        notification_type: "4", 
        initiater:resu[0].from,
        from: req.user.id,
        call_status:"Reject",
        group_id:  "0",
        title: "test",
        message: "Incoming Voice Call"
    })//.then((result)=>{ console.log("result",result)})        
 } catch (e) {
    console.log(e.message)
}

}


if (resu[0].type  == "5" || resu[0].type  == "6")
{
console.log("video call")
//caller
try {
Notification.sendNotification(resu[0].maker_virtual_id, {
    notification_type: resu[0].type,//"5", 
    initiater:resu[0].from,
    from: req.user.id,
    call_status:"Reject",
    group_id:  "0",
    title: "test",
    message: "Incoming Video Call"
})      
} catch (e) {
console.log("e.message",e.message)
}

//rejector
try {

    Notification.sendNotification(resu[0].to, {
        notification_type: resu[0].type,//"5", 
        initiater:resu[0].from,
        from: req.user.id,
        call_status:"Reject",
        group_id:  "0",
        title: "test",
        message: "Incoming Video Call"
    })       
 } catch (e) {
    console.log("e.message",e.message)
}

}






            let channel = await callsModel.findOne({
                channel: req.body.channel
            }).lean().exec()
            //await notification.rejectCall(channel.maker_virtual_id, 'CALL_REJECTED')

            res.send({
                status: true,
                data: channel
            })
        }
    } catch (error) {
        console.log(error.message)
        next(new CustomError('Error occured', 500, []))
    }
})
//not used
router.post('/reject1', validate('reject'), async (req, res, next) => { 
    try{
    let errors = validationResult(req)
    if (errors.isEmpty() == false) {
        next(new CustomError('Invalid Inputs', 422, errors.array()))
    } else {

        // console.log("req.body",req.body)
        let calling_reject_for_first_time
        let group_members_in_call = []


        let res0 = await callsModel.find({channel:req.body.channel})

        let res2
        res0.forEach(async key_res0 => {
            console.log("key_res0.calling_reject_for_first_time",key_res0.calling_reject_for_first_time)

            if(key_res0.calling_reject_for_first_time == false){

                console.log("key_res0.group_members_in_call",key_res0.group_members_in_call)
                res2 = key_res0.group_members_in_call

                group_members_in_call = key_res0.group_members_in_call
                
            }

            calling_reject_for_first_time = key_res0.calling_reject_for_first_time
            console.log("res2",res2)

        })

        // let group_members_in_call = []

        if(req.body.group_id!="0"){

        let res1 = await groupModel.find({channel: req.body.group_id})
        
        console.log("res1",res1)

        res1.forEach(async key_res1 => {

            console.log("key_res1.group_members",key_res1.group_members)

            if (calling_reject_for_first_time == true || calling_reject_for_first_time == undefined)
            {
                group_members_in_call = key_res1.group_members

                let res3 = await callsModel.findOneAndUpdate({channel:req.body.channel},{$set:{group_members_in_call:group_members_in_call, 
                    calling_reject_for_first_time : false}},{new:true})
            
                console.log("res3",res3)

                res2 = key_res1.group_members
            }
            

            console.log("group_members_in_call",group_members_in_call)
            console.log("res2",res2)

            // console.log("req.user._id",req.user._id)

            // console.log("group_members_in_call.includes(req.user._id)",group_members_in_call.includes(req.user._id))

            // if(group_members_in_call.includes(req.user._id) == false )
          
            // {

            //     group_members_in_call.push(req.user._id)

            //     console.log("group_members_in_call",group_members_in_call)

            // }

        //     if( (res2.length == 0) || (res2 == undefined )){


        //         console.log("res2 null")
        //     let res3 = await callsModel.findOneAndUpdate({channel:req.body.channel},{$set:{group_members_in_call:group_members_in_call}},{new:true})
            
        //     console.log("res3",res3)
           
        // }
        // else 
        // if(res2.includes(req.user._id ) == false){

        //     console.log("res2.includes(req.user._id)",res2.includes(req.user._id))

        //     let res4 = await callsModel.findOneAndUpdate(
        //         { channel: req.body.channel },
        //         { $push: { 'group_members_in_call': req.user._id } },
        //         { new : true }
        //       );
        //       console.log("res4", res4)

        //       res2.push(req.user._id)



        // }
        // else{
            

        // }

        // if(res2.includes(req.user._id ) == true){
            if(res2){
            // console.log("user exists in res2",res2)

            console.log("group_members_in_call",group_members_in_call)
            console.log("res2",res2)

            for(let i=0; i< res2.length ; i++){
                console.log("res2 loop",res2[i])
                if (res2[i] == req.user._id )
                res2.splice( i)
            }
            console.log("res2 group_members_in_call after loop",res2)

            let res5 = await callsModel.findOneAndUpdate(
                { channel: req.body.channel },
                { $set: { 'group_members_in_call': res2 } },
                { new : true }
              );

            // for(let i=0; i< group_members_in_call.length ; i++){
            //     console.log("group_members_in_call loop",group_members_in_call[i])
            //     if (group_members_in_call[i] == req.user._id )
            //     group_members_in_call.splice( i)
            // }
            // console.log("group_members_in_call after loop",group_members_in_call)

            // let res5 = await callsModel.findOneAndUpdate(
            //     { channel: req.body.channel },
            //     { $set: { 'group_members_in_call': group_members_in_call } },
            //     { new : true }
            //   );

              console.log("user removed req.user._id", req.user._id)
              console.log("res5", res5)
//change length to 1 from 2
            //   if(res2.length == "1"){
                if(res2.length == "2"){
//send fcm to all group members
//change type to 6 from 2
if(res5.type == "6"){
    console.log("group video call")  
    // console.log("sending fcm to all members",group_members_in_call)
    console.log("sending fcm to last 2 members",res2)
    try {

        let res6 = await callsModel.find({channel: req.body.channel})

        console.log("res6",res6)
        res6.forEach(async key_res6 => {

        for(let i = 0; i<res2.length ; i++){
            Notification.sendNotification(res2[i], {
            notification_type: "6",
            call_status:"End",
            receiver:'',
            initiater:key_res6.from, 
            body:"Incoming Group Call", 
            title:"test", 
            group_id : req.body.group_id, 
            message:"Incoming Group Call",


        })

        }})

        // group_members_in_call.forEach(async key_group_members_in_call => {

            // Notification.sendNotification("0", {
            // notification_type: "6",
            // from: req.user.id,
            // call_status:"End",
            // title:"test",
            // group_id:res5.group_id,
            // message:"Incoming Group Call",

            
            // group_id: req.body.group_id ? req.body.group_id : "0",
            // title: req.user.firstName || '',
            // message: req.body.message || ''
        // })//.then((result)=>{ console.log("result",result)})  

        // })

      
     } catch (e) {
        console.log(e.message)
    }
}

              }



        }
 


        })
        

        }
        let resu = await callsModel.find({channel: req.body.channel})

        console.log("resu",resu)
        // change to 4 from 2
        if (resu[0].type  == "4")
{
console.log("voice call")
//caller
try {
Notification.sendNotification(resu[0].maker_virtual_id, {
    notification_type: "4", 
    initiater:resu[0].from,
    from: req.user.id,
    call_status:"Reject",
    group_id:  "0",
    title: "test",
    message: "Incoming Voice Call"
})//.then((result)=>{ console.log("result",result)})        
} catch (e) {
console.log(e.message)
}

//rejector
try {

    Notification.sendNotification(resu[0].to, {
        notification_type: "4", 
        initiater:resu[0].from,
        from: req.user.id,
        call_status:"Reject",
        group_id:  "0",
        title: "test",
        message: "Incoming Voice Call"
    })//.then((result)=>{ console.log("result",result)})        
 } catch (e) {
    console.log(e.message)
}

}


if (resu[0].type  == "5")// || resu[0].type  == "6")
{
console.log("video call")
//caller
try {
Notification.sendNotification(resu[0].maker_virtual_id, {
    notification_type: resu[0].type,//"5", 
    initiater:resu[0].from,
    from: req.user.id,
    call_status:"Reject",
    group_id:  "0",
    title: "test",
    message: "Incoming Video Call"
})      
} catch (e) {
console.log("e.message",e.message)
}

//rejector
try {

    Notification.sendNotification(resu[0].to, {
        notification_type: resu[0].type,//"5", 
        initiater:resu[0].from,
        from: req.user.id,
        call_status:"Reject",
        group_id:  "0",
        title: "test",
        message: "Incoming Video Call"
    })       
 } catch (e) {
    console.log("e.message",e.message)
}

}



        


    
} 
let channel = await callsModel.findOne({
    channel: req.body.channel
}).lean().exec()

await callsModel.updateOne({
    channel: req.body.channel
}, {
    $set: {
        call_status: '4', //todo

    }
})

res.send({
    status: true,
    data: channel
})
} catch (error) {
    console.log(error.message)
    next(new CustomError('Error occured', 500, []))
}


})

router.post('/reject', validate('reject'), async (req, res, next) => {
    try {
        let House = []
        let errors = validationResult(req)
        if (errors.isEmpty() == false) {
            next(new CustomError('Invalid Inputs', 422, errors.array()))
        } else {


            let group_members_in_call = []
            let calling_reject_for_first_time = false


            let res0 = await callsModel.find({ channel: req.body.channel })
            // console.log("res0", res0)
            let type, res2

            await res0.forEachAsync(async key0 => {

                console.log("key0",key0)
                type = key0.type
                console.log("type", type)

                if (key0.group_members_in_call.length != 0) {

                    console.log("key0.group_members_in_call.length != 0")
                    console.log("key0.group_members_in_call", key0.group_members_in_call)
                    if (key0.calling_reject_for_first_time == false) {
                        console.log("key0.calling_reject_for_first_time", key0.calling_reject_for_first_time)

                        group_members_in_call = key0.group_members_in_call

                    }

                }


                else {
                    console.log("key0.group_members_in_call.length == 0")

                    let res1 = await groupModel.find({ channel: req.body.group_id })

                    // console.log("res1", res1)
                    await res1.forEachAsync(async key1 => {
                        if (key1.group_members != undefined && key1.group_members.length != 0)


                            group_members_in_call = key1.group_members
                        console.log("group_members_in_call@@@@@", group_members_in_call)

                        await key1.group_members.forEachAsync(async key2 => {
                            console.log("key2", key2)
                            House.push(key2)
                        })
                        console.log("House1", House)

                    })
                    console.log("House2", House)
                    res2 = await callsModel.findOneAndUpdate({
                        channel: req.body.channel
                    }, {
                        $set: {
                            group_members_in_call: group_members_in_call,
                            calling_reject_for_first_time: false
                        }
                    },
                        { new: true })

                    console.log("res2", res2)
                }



            })

            console.log("House3", House)
            //case 1 - indivudual voice (type 4)************************************************************************
            if (type == 4) {
                let resu = await callsModel.find({ channel: req.body.channel })
                console.log("resu", resu)

                //fcm to caller
                try {
                    Notification.sendNotification(resu[0].maker_virtual_id, {
                        notification_type: "4",
                        initiater: resu[0].from,
                        from: req.user.id,
                        call_status: "Reject",
                        group_id: "0",
                        title: "test",
                        message: "Incoming Voice Call"
                    })//.then((result)=>{ console.log("result",result)})        
                } catch (e) {
                    console.log(e.message)
                }

                //fcm to rejector
                try {

                    Notification.sendNotification(resu[0].to, {
                        notification_type: "4",
                        initiater: resu[0].from,
                        from: req.user.id,
                        call_status: "Reject",
                        group_id: "0",
                        title: "test",
                        message: "Incoming Voice Call"
                    })//.then((result)=>{ console.log("result",result)})        
                } catch (e) {
                    console.log(e.message)
                }

                await callsModel.updateOne({
                    channel: req.body.channel
                }, {
                    $set: {
                        call_status: '4', //todo

                    }
                })

            }


            //case 2 - indivudual video (type 5)************************************************************************
            if (type == 5) {
                let resu = await callsModel.find({ channel: req.body.channel })
                console.log("resu", resu)
                //fcm to caller
                try {
                    Notification.sendNotification(resu[0].maker_virtual_id, {
                        notification_type: resu[0].type,//"5", 
                        initiater: resu[0].from,
                        from: req.user.id,
                        call_status: "Reject",
                        group_id: "0",
                        title: "test",
                        message: "Incoming Video Call"
                    })
                } catch (e) {
                    console.log("e.message", e.message)
                }

                //fcm to rejector
                try {

                    Notification.sendNotification(resu[0].to, {
                        notification_type: resu[0].type,//"5", 
                        initiater: resu[0].from,
                        from: req.user.id,
                        call_status: "Reject",
                        group_id: "0",
                        title: "test",
                        message: "Incoming Video Call"
                    })
                } catch (e) {
                    console.log("e.message", e.message)
                }

                await callsModel.updateOne({
                    channel: req.body.channel
                }, {
                    $set: {
                        call_status: '4', //todo

                    }
                })

            }

            //case 3 - group video (type 6)************************************************************************

            if (type == 6 || type == 2) {
                console.log("type6", type)
                console.log("House", House)

                // let res4 = await callsModel.findOne({channel:req.body.channel})
                // let res4 = await groupModel.find({channel: req.body.group_id})
                // console.log("res4",res4)
                console.log("res2 in type 6", res2)
                // group_members_in_call = res2.group_members_in_call//res4.group_members_in_call

                console.log("group_members_in_call in type 6", group_members_in_call)

                console.log("req.user._id", req.user._id)
                console.log("req.user.email", req.user.email)

                // if(group_members_in_call.length == 2){

                //     for(let i = 0; i<group_members_in_call.length ; i++){
                //         Notification.sendNotification(group_members_in_call[i], {
                //         notification_type: "6",
                //         initiater:res0[0].from, 
                //         call_status:"End",
                //         title:"test", 
                //         group_id : req.body.group_id, 
                //         message:"Incoming Group Call",


                //     })
                //      }
                // }



                // for(let i=0; i< group_members_in_call.length ; i++){
                //     console.log("group_members_in_call loop",group_members_in_call[i])
                //     if (group_members_in_call[i] == req.user._id )
                //     group_members_in_call.splice( i)
                // }

                //send notification to remaining 2 members
                if (group_members_in_call.length == 2) {

                    for (let i = 0; i < group_members_in_call.length; i++) {
                        console.log("sending fcm to user ", i)
                        await Notification.sendNotification(group_members_in_call[i], {
                            notification_type: "6",
                            initiater: res0[0].from,
                            call_status: "End",
                            title: "test",
                            group_id: req.body.group_id,
                            message: "Incoming Group Call",


                        })
                    }

                    group_members_in_call = []
                    calling_reject_for_first_time = true


                }
                else {
                    const array = group_members_in_call
                    const index = array.indexOf(req.user._id);
                    if (index > -1) {
                        array.splice(index, 1);
                    }

                    console.log("array", array);
                    group_members_in_call = array

                    console.log("group_members_in_call after loop", group_members_in_call)
                    calling_reject_for_first_time = false
                }

                // if(group_members_in_call.length == 1 || group_members_in_call.length == 0 || group_members_in_call.length == 2){
                // group_members_in_call = []
                // calling_reject_for_first_time =true
                // }
                console.log("group_members_in_call-----", group_members_in_call);
                console.log("calling_reject_for_first_time-----", calling_reject_for_first_time);

                let res3 = await callsModel.findOneAndUpdate(
                    { channel: req.body.channel },
                    {
                        $set: {
                            'group_members_in_call': group_members_in_call,

                            "calling_reject_for_first_time": calling_reject_for_first_time
                        }

                    },
                    { new: true }
                );

                console.log("res3", res3)

                await callsModel.updateOne({
                    channel: req.body.channel
                }, {
                    $set: {
                        call_status: '4', //todo

                    }
                })


            }




            let channel = await callsModel.findOne({
                channel: req.body.channel
            }).lean().exec()

            res.send({
                status: true,
                data: channel
            })
        }
    }
    catch (error) {
        console.log(error.message)
        next(new CustomError('Error occured', 500, []))
    }
})

router.post('/remove', async (req, res, next) => {
    try {
        let call = await callsModel.findOneAndUpdate({
            channel: req.body.channel
        }, {
            $addToSet: {
                removedBy: req.user._id
            }
        }, {
            new: true
        }).lean().exec()

        res.send({
            status: 'success',
            message: 'success',
            //           test: call
        })
    } catch (error) {
        console.log(error.message)
        next(new CustomError('Error occured', 500, []))
    }
})

router.post('/removeAllAudioCalls', async (req, res, next) => {
    try {

        let query = [{
            $or: [{
                from: req.user._id
            },
            {
                to: req.user._id
            },
            ]
        }, {
            type: 1
        }
        ]

        if (req.body.chatType != '""') {
            query.push({ chatType: req.body.chatType })
        }

        await callsModel.updateMany({
            $and: query
        }, {
            $addToSet: {
                removedBy: req.user._id
            }
        }).exec()

        res.send({
            status: 'success',
            message: 'success',

        })
    } catch (error) {
        console.log(error.message)
        next(new CustomError('Error occured', 500, []))
    }
})

router.post('/removeAllVideoCalls', async (req, res, next) => {
    try {

        let query = [{
            $or: [{
                from: req.user._id
            },
            {
                to: req.user._id
            },
            ]
        }, {
            type: 2
        }
        ]

        if (req.body.chatType != '""') {
            query.push({ chatType: req.body.chatType })
        }

        await callsModel.updateMany({
            $and: query
        }, {
            $addToSet: {
                removedBy: req.user._id
            }
        }).exec()

        res.send({
            status: 'success',
            message: 'success',

        })
    } catch (error) {
        console.log(error.message)
        next(new CustomError('Error occured', 500, []))
    }
})



router.get('/history', async (req, res, next) => {
    try {

       console.log("historyyyyyyyyyyyyyyyyyyyyy")


        let query = [{
            $or: [{
                from: req.user._id
            },
            {
                to: req.user._id
            },
            ],
            removedBy: {
                $nin: [req.user._id]
            }
        }]

        if (!req.query.type) {
            query.push({
                $or: [{ type: "1" }, { type: "2" }]
            })


        }
        if (req.query.chatType != 'both') {
            query.push({
                chatType: req.query.chatType
            })
        }
        console.log(JSON.stringify(query))

        // console.log("queryyyyyy",{$and: query})
        // var aggregateQuery = callsModel.aggregate();

        

        // let result = await callsModel.aggregatePaginate(
        // {
        //     $and: query
        // }
      
        // , {
        //     page: req.query.page,
        //     sort: { _id: -1 },
        //     lean: true,
        //     limit: req.query.count
        // })
        console.log("req.query.chatType",req.query.chatType)
        let result
        if(req.query.chatType == "both")
{
        result = await callsModel.paginate({
           
            $and: 
            [
                { $or: [{from: req.user._id}, {to: req.user._id}] },

                {$or : [{chatType: "business"}, {chatType: "personal"}]}
                
            ]
        }
                , {
            page: req.query.page,
            sort: { _id: -1 },
            lean: true,
            limit: req.query.count
        }

        )
    }
    else{
        result = await callsModel.paginate({
           
            $and: 
            [
                { $or: [{from: req.user._id}, {to: req.user._id}] },

                {chatType: req.query.chatType}
                
            ]
        }
                , {
            page: req.query.page,
            sort: { _id: -1 },
            lean: true,
            limit: req.query.count
        }

        )
    }
        
// console.log("result",result)
        res.send({
            status: "Success",
            // data : result,
            data: result.docs,
            total: result.totalDocs,
            page: result.page,
            pagingCounter: result.pagingCounter,
            hasPrevPage: result.hasPrevPage,
            hasNextPage: result.hasNextPage,
            prevPage: result.prevPage,
            nextPage: result.nextPage

        })
    } catch (error) {
        console.log("error.message",error.message)
        next(new CustomError('Error Occurred', 500, []))
    }
})

router.use((err, req, res, next) => {
    res.status(err.statusCode).send({
        status: 'fail',
        message: err.message,
        error: err.erros
    })
})

function generateChannelName(maker, receiver) {
    let hash = crypto.createHash('sha1').update(maker + receiver + new Date().getTime()).digest('hex')
    return hash
}

module.exports = router
