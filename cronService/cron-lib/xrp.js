const TransactionHistoriesModel = require('../models/TransactionHistories')
const walletModel = require('../models/wallets')
const requestPromise = require('request-promise')
const config = require('../config')
const mongo = require('mongodb')

async function handleInternalTransaction(tx) {
    try {

        let amount = tx.sourceAmount

        await sendPushNotification({
            userEmail: tx.email,
            type: 'Transaction Initiated',
            message: `Transaction to ${tx.to} is Pending`

        })

        await TransactionHistoriesModel.updateOne({
            _id: tx._id
        }, {
            status: 'pending'
        })

        //update sender balance
        await walletModel.updateOne({
            'email': tx.email
        }, {
            $inc: {
                'xrp.balance': -Number(tx.sourceAmount),
                'xrp.fee' : Number(tx.fee)
            }
        })

        //add admin commission
        

        //update receiver balance
        await walletModel.updateOne({
            'xrp.destinationTag': tx.destinationTag
        }, {
            $inc: {
                'xrp.balance': Number(amount)
            }
        }).exec()
        
        //update sender's transaction history
        await TransactionHistoriesModel.updateOne({
            _id: tx._id
        }, {
            status: 'completed'
        })
       
        //get receiver details
        let receiver = await walletModel.findOne({
            'xrp.destinationTag': tx.destinationTag
        }).lean().exec()
        
        //add entry for receiver
        await TransactionHistoriesModel.create({
            email: receiver.email,
            ref: 0,
            from: tx.from,
            to: tx.to,
            source: 'xrp',
            target: 'xrp',
            sourceAmount: amount,
            targetAmount: amount,
            type: 'received',
            value: amount,
            currency: 'xrp',
            txHash: '-',
            status: 'completed',
            error: 'nil',
            reason: '',
            isExchange: 'false',
            destinationTag: tx.destinationTag

        })

        

        await sendPushNotification({
            userEmail: tx.email,
            type: 'Transaction Confirmed',
            message: `Sent ${amount} XRP to ${tx.to}`

        })

        await sendPushNotification({
            userEmail: receiver.email,
            type: 'Transaction Confirmed',
            message: `Received ${amount} xrp from ${tx.from}`

        })
    } catch (err) {
        console.log(err)
    }

    //update Transaction status
}

async function handleExternalTransaction(tx) {
    try {
        // post transaction to xrp module
        let response = await requestPromise.post(config.services.xrpService + '/transfer', {
            method: "POST",
            body: {
                //from: tx.from,
                to: tx.to,
                value: tx.sourceAmount,
                destinationTag: tx.destinationTag,
                id: tx._id
            },
            json: true
        })

        if (response.status == 'success') {
            await TransactionHistoriesModel.updateOne({
                _id: tx._id
            }, {
                $set: {
                    status: 'pending'
                }
            })

            await sendPushNotification({
                userEmail: tx.email,
                type: 'Transaction Initiated',
                message: `Transaction to ${tx.to} is Pending`

            })

        } else {
            await TransactionHistoriesModel.updateOne({
                _id: tx._id
            }, {
                $set: {
                    status: 'failed',
                    reason: response.message
                }
            })

            await sendPushNotification({
                userEmail: tx.email,
                type: 'Transaction Failed',
                message: `Transaction to ${tx.to} failed`

            })
            
                   
        }

    } catch (err) {
        throw err.message
    }

}
async function sendPushNotification(params) {
    /*     console.log('sendNotification')
        console.log(params) */
    let response = await requestPromise.post(config.services.notificationService + '/pushNotificationToMobile', {
        method: "POST",
        body: {
            userEmail: params.userEmail,
            message: params.message,
            type: params.type
        },
        headers: {
            'content-type': 'application/json'
        },
        json: true
    })

    //console.log(response.message)
    //return
}

module.exports = {
    handleInternalTransaction,
    handleExternalTransaction
}