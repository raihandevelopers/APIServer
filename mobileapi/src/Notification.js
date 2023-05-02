require('array-foreach-async')
const FCM = require("firebase-admin");
const accountsModel = require('../models/accountsModel');
// const groupsModel = require('../models/group')
const serviceAccount = require("../firebasePrivateKey.json");
FCM.initializeApp({
    credential: FCM.credential.cert(serviceAccount),//applicationDefault(),
    databaseURL: 'https://pinksurfing-309615-default-rtdb.firebaseio.com', //https://mete-cc8b5.firebaseio.com',
    messagingSenderId: '224357051309'
})
const options = {
    priority: "high",
    timeToLive: 60 * 60 * 24
};



// async function sendNotification(receiverId, message) {
//     console.log("receiverId, message",receiverId, message)
//     try {
//         //newly added condition if
//         if(message.group_id != '0' && receiverId != "0"){
//             console.log("fcm case 1")
//             let receiver = await accounts.findOne({
//                 _id: receiverId
//             }).lean().exec()
//             console.log("receiver",receiver)
//             let registrationToken = receiver.FCMToken
//             console.log("receiver.FCMToken", receiver.FCMToken)
//             console.log("message", message)
//             let notification_options = {
//                 priority: "high",
//                 timeToLive: 60 * 60 * 24
//             };
//             if (receiver.FCMToken){
//             FCM.messaging().sendToDevice(registrationToken, {
//                 data: {
//                     initiater: message.from?message.from:'',
//                     group_id: message.group_id?message.group_id:'0',
//                     notification_type: message.notification_type,
//                     title: message.title ? message.title : 'Android',
//                     message: message.message ? message.message : '',
//                     call_status:message.call_status?message.call_status:'',
//                     receiver:message.receiver?message.receiver:'',
//                 }
//             }, options
//             ).then(response =>{ console.log("Success msg id:", response)
//             console.log("response.results[0].error",response.results[0].error);  
        
//         })
//                 .catch(tr => console.log("tr",tr))}else{
//                     console.log("FCMtoken not found for",receiverId)
//                 }

//         }
//         else if (message.group_id == '0' && receiverId != "0") {
//             console.log("fcm case 2")
//             let receiver = await accounts.findOne({
//                 _id: receiverId
//             }).lean().exec()
//             console.log("receiver",receiver)
//             let registrationToken = receiver.FCMToken
//             console.log("receiver.FCMToken", receiver.FCMToken)
//             console.log("message", message)
//             let notification_options = {
//                 priority: "high",
//                 timeToLive: 60 * 60 * 24
//             };
//             if (receiver.FCMToken)
//                 //    FCM.messaging().sendToDevice({
//                 //         data: {
//                 //             initiater: message.from,
//                 //             group_id: message.group_id,
//                 //             notification_type: message.notification_type,
//                 //                                 title: message.title ? message.title : '',
//                 //                     message: message.message ? message.message : ''
//                 //         },
//                 //         token: receiver.FCMToken,
//                 //         // android: {
//                 //         //     "ttl":"4500"
//                 //         //   },
//                 //     }).then(tr => console.log("Success msg id:", tr))
//                 //     .catch(tr => console.log(tr))



//                 FCM.messaging().sendToDevice(registrationToken, {
//                     // notification: {
//                     //     title: message.title ? message.title : 'Android',
//                     //     body: message.message ? message.message : '',
//                     //     // initiater: message.from,
//                     //     // group_id: message.group_id,
//                     //     // notification_type: message.notification_type,
//                     //     // message: message.message ? message.message : ''
//                     // },
//                     data: {
//                         initiater: message.from?message.from:'',
//                         group_id: message.group_id?message.group_id:'0',
//                         notification_type: message.notification_type,
//                         title: message.title ? message.title : 'Android',
//                         message: message.message ? message.message : '',
//                         call_status:message.call_status?message.call_status:'',
//                         receiver:message.receiver?message.receiver:'',
//                     }
//                 }, options
//                 ).then(response =>{ console.log("Success msg id:", response)
//                 console.log("response.results[0].error",response.results[0].error);  
//             })
//                     .catch(tr => console.log("tr",tr))
//         } else {

            

//             console.log("fcm case 3")
//             console.log("group call channel",message.group_id)

//             console.log("message", message)

//             let group = await groupsModel.findOne({
//                 channel: message.group_id
//             }).lean().exec()

//             let members = group.group_members
//             console.log("members",members)
//             let ids = []
//             members.forEach(_member => {
//                 if (_member._id != message.from) {
//                     ids.push(_member._id)
//                 }
//             })

//             console.log("message.from",message.from)

//             let receiverAccounts = await accounts.find({
//                 _id: {
//                     $in: ids
//                 }
//             }).lean().exec()

//             console.log("ids",ids)

//             await receiverAccounts.forEachAsync(async _receiverAccount => {
//                 if (_receiverAccount.FCMToken)

//                // console.log("_receiverAccount",_receiverAccount)

//                     await FCM.messaging().sendToDevice(
//                         // data: {
//                         // initiater: message.from,
//                         // group_id: message.group_id,
//                         // notification_type: message.notification_type,
//                         //                 title: message.title ? message.title : '',
//                         //     message: message.message ? message.message : ''
//                         // },
//                         // token: _receiverAccount.FCMToken
//                         _receiverAccount.FCMToken, {
//                         // notification: {
//                         //     title: message.title ? message.title : 'Android',
//                         //     body: message.message ? message.message : ''
//                         // },
//                         data: {
//                             title: message.title ? message.title : 'Android',
//                             body: message.message ? message.message : '',
//                             initiater: message.from?message.from:'',
//                             group_id: message.group_id,
//                             notification_type: message.notification_type,
//                             message: message.message ? message.message : '',
//                             call_status:message.call_status?message.call_status:'',
//                             receiver:message.receiver?message.receiver:'',
//                         }
//                     }, options
//                     ).then((result)=>{ console.log("result",result)}) .catch(tr => console.log("tr",tr))

//                     if(!_receiverAccount.FCMToken){
//                         console.log("FCM token not found for ",_receiverAccount.email) 
//                         console.log("_receiverAccount.email",_receiverAccount.email)
//                     console.log("_receiverAccount.FCMToken",_receiverAccount.FCMToken)
//                     }
//                     else{
//                     console.log("_receiverAccount.email",_receiverAccount.email)
//                     console.log("_receiverAccount.FCMToken",_receiverAccount.FCMToken)
//                     }
//             })
//         }

//     } catch (error) {
//         console.log(error)
//         //throw new Error(error.message)
//     }
// }

class Notification {

    constructor(dbUrl, senderId) {
        FCM.initializeApp({
            credential: FCM.credential.applicationDefault(),
            databaseURL: dbUrl,
            messagingSenderId: senderId
        })
    }

    // async sendNotification(receiverId, message) {
    //     try {
    //         if (message.group_id == '0' && receiverId != "0") {
    //             let receiver = await accounts.findOne({
    //                 _id: receiverId
    //             }).lean().exec()
    //             let registrationToken = params.FCMToken
    //             FCM.messaging().sendToDevice(
    //                 //     {
    //                 //     data: {
    //                 //         from: message.from,
    //                 //         group_id: message.group_id,
    //                 //         notification_type: message.notification_type
    //                 //     },
    //                 //     token: params.FCMToken
    //                 // }
    //                 registrationToken, {
    //                 notification: {
    //                     title: message.title,
    //                     body: message.message,
    //                 },
    //                 data: {
    //                     from: message.from,
    //                     group_id: message.group_id,
    //                     notification_type: message.notification_type
    //                 },
    //             }, options
    //             )
    //         } else {
    //             let group = await groupsModel.findOne({
    //                 channel: message.group_id
    //             }).lean().exec()
    //             let members = group.group_members
    //             let ids = []
    //             members.forEach(_member => {
    //                 if (_member._id != message.from) {
    //                     ids.push(_member._id)
    //                 }
    //             })

    //             let receiverAccounts = await accounts.find({
    //                 _id: {
    //                     $in: ids
    //                 }
    //             }).lean().exec()

    //             await receiverAccounts.forEachAsync(async _receiverAccount => {
    //                 let registrationToken = _receiverAccount.FCMToken
    //                 await FCM.messaging().sendToDevice(
    //                     //     {
    //                     //     data: {
    //                     //         from: message.from,
    //                     //         group_id: message.group_id,
    //                     //         notification_type: message.notification_type
    //                     //     },
    //                     //     token: _receiverAccount.FCMToken
    //                     // }
    //                     registrationToken, {
    //                     notification: {
    //                         title: message.title,
    //                         body: message.message,
    //                     },
    //                     data: {
    //                         from: message.from,
    //                         group_id: message.group_id,
    //                         notification_type: message.notification_type
    //                     },
    //                 }, options
    //                 ).catch(e => { console.log('no notification') })
    //             })
    //         }

    //     } catch (error) {
    //         console.log(error)
    //         throw new Error(error.message)
    //     }
    // }

    async  cardexpire(receiverId, message) {
        try {
            let receiver = await accounts.findOne({
                _id: receiverId
            }).lean().exec()
            let registrationToken = receiver.FCMToken
            await this._sendNotification(
                {
                    FCMToken: receiver.FCMToken,
                    message: message,
                    type: "Card Expired"
                }

            )
        } catch (error) {
            throw new Error(error.message)
        }
    }

    // async rejectCall(receiverId, message) {
    //     try {
    //         let receiver = await accounts.findOne({
    //             _id: receiverId
    //         }).lean().exec()
    //         let registrationToken = receiver.FCMToken
    //         await this._sendNotification(
    //             {
    //                 token: receiver.FCMToken,
    //                 message: message,
    //                 type: "CALL_REJECTED"
    //             }
    //         )
    //     } catch (error) {
    //         throw new Error(error.message)
    //     }
    // }

    // async endCall(receiverId, message) {
    //     try {
    //         let receiver = await accounts.findOne({
    //             _id: receiverId
    //         }).lean().exec()
    //         let registrationToken = receiver.FCMToken
    //         await this._sendNotification(
    //             {
    //                 token: receiver.FCMToken,
    //                 message: message,
    //                 type: "CALL_ENDED"
    //             }

    //         )
    //     } catch (error) {
    //         throw new Error(error.message)
    //     }
    // }

    async _sendNotification(params) {
        let registrationToken = params.FCMToken
        FCM.messaging().sendToDevice(
            registrationToken, {
            // notification: {
            //     title: params.type,
            //     body: params.message
            // },
            // data: {
            //     type: params.type,
            //     message: params.message
            // },
            // notification: {
            //     title: params.message.title ? params.message.title : 'Android',
            //     body: params.message.message ? params.message.message : ''
            // },
            data: {
                title: params.message.title ? params.message.title : 'Android',
                body: params.message.message ? params.message.message : '',
                initiater: params.message.from,
                group_id: params.message.group_id,
                notification_type: params.message.notification_type,
            }
        }, options
        )
    }

}

module.exports = Notification
// module.exports = {
//     sendNotification
// }
