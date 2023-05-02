var express = require('express');
var router = express.Router();
const config = require('../config')
var request = require('request')
var requestPromise = require('request-promise')
var mongoose = require('mongoose')
var rpc = require('../lib/rpc')
const transactionHistoriesModel = require('../models/TransactionHistories')
const exchangeTransactionsModel = require('../models/exchangeTransactions')
const walletsModel = require('../models/wallets')
var db = require('../lib/db')
require('array-foreach-async')



router.get('/getNewAddress', async (req, res) => {
    try {
        let response = (await rpc.postAsync('getnewaddress', []))

        res.send({
            status: 'success',
            address: response.result
        })
    } catch (error) {
        console.log(error)
        res.status(500).send({
            status: 'fail',
            address: ''
        })
    }

})

router.post('/notify', async (req, res) => {
    try {
        console.log('===============/notify==============')
        let receipt = JSON.parse(JSON.stringify(await rpc.postAsync("gettransaction", [req.body.txHash]))).result
        console.log(receipt)
        if (receipt.confirmations != undefined /* && receipt.confirmations == 1 */) {
            console.log(receipt)
            let txFromDb = await transactionHistoriesModel.findOne({
                txHash: req.body.txHash
            }).lean().exec()

            console.log('txHash', req.body.txHash)
            console.log('txFromDb', txFromDb)

            //exchange transaction
            if (txFromDb != null && txFromDb.isExchange == true && txFromDb.isMoonpayTx == false && txFromDb.isLpTransaction == false) {

                if (txFromDb.status == 'waiting_for_confirmation') {
                    await transactionHistoriesModel.updateOne({
                        txHash: req.body.txHash
                    }, {
                        $set: {
                            //status: "pending",
                            BTCconfirmations: 1
                        }
                    })

                    await exchangeTransactionsModel.create({
                        email: txFromDb.email,
                        source: txFromDb.source,
                        target: txFromDb.target,
                        to: txFromDb.targetAddress,
                        sourceAmount: txFromDb.sourceAmount,
                        targetAmount: txFromDb.targetAmount,
                        status: 'in queue',
                        sourceTxHash: receipt.txid,
                        dbId: txFromDb._id,
                        timestamp: new Date().getTime(),
                        BTCconfirmations: 1
                    })

                    /*                     await walletsModel.updateOne({
                                            email: txFromDb.email
                                        }, {
                                            $inc: {
                                                [`btc.fee`]: Number(txFromDb.fee)
                                            }
                                        }) */

                    res.send()

                } else if (txFromDb.status == 'processing') {
                    //update balance of receiver
                    await transactionHistoriesModel.updateOne({
                        _id: txFromDb._id
                    }, {
                        $set: {
                            BTCconfirmations: 1
                        }
                    })
                    res.send()
                }

            } else if (txFromDb != null && txFromDb.isExchange == false && txFromDb.isMoonpayTx == false && txFromDb.isLpTransaction == false) { //tx sent from anxo

                //set confirmations to 1

                await transactionHistoriesModel.updateOne({
                    txHash: req.body.txHash
                }, {
                    $set: {
                        status: 'pending',
                        BTCconfirmations: 1
                    }
                })
                //update balance of sender and receiver - do it in /confirmation
                res.send()


            } else if (txFromDb == null) { //transaction from external
                //create a record
                let details = receipt.details
                let receivedAddress;
                let amountInBTC = 0
                console.log("details", details)
                details.forEach(_detail => {
                    if (_detail.category == 'receive') {
                        //console.log('_Detail', _detail)
                        receivedAddress = _detail.address
                        amountInBTC += Number(_detail.amount)
                    }
                })

                console.log("receivedAddress", receivedAddress)
                let userWallet = await walletsModel.findOne({
                    'btc.address': receivedAddress
                }).lean().exec()

                console.log(userWallet)
                if (userWallet != null) {
                    await transactionHistoriesModel.create({
                        email: userWallet == null ? '' : userWallet.email,
                        from: '',
                        to: receivedAddress,
                        source: 'btc',
                        target: 'btc',
                        sourceAmount: Math.abs(Number(amountInBTC)),
                        targetAmount: Math.abs(Number(amountInBTC)),
                        value: Math.abs(Number(amountInBTC)),
                        currency: 'btc',
                        status: 'pending',
                        txHash: req.body.txHash,
                        error: 'nil',
                        isExchange: false,
                        error: '',
                        reason: '',
                        fee: 0,
                        BTCconfirmations: 1,
                        ref: 0,
                        targetAddress: '',
                        type: 'received',
                    })
                    // await sendPushNotification({
                    //     userEmail: userWallet.email,
                    //     type: 'Transaction Confirmed',
                    //     message: `Received ${Math.abs(Number(amountInBTC))} BTC..`

                    // })
                }

                res.send()

            }

        }

    } catch (error) {
        console.log("ERR:", error)
        res.status(500).send("Error")
    }

})


let transactionsToCheck = []
let isRunning = false

router.post('/confirmTransaction', async (req, res) => {
    console.log('//////////////////////confirmTransaction//////////////////')
    let data = await transactionHistoriesModel.find({
        $and: [{
            BTCconfirmations: {
                $lt: 4
            }
        }, {
            BTCconfirmations: {
                $gte: 1
            }
        }, {
            status: {
                $ne: 'failed'
            }
        }]

    }).lean().exec()

    // transactionsToCheck = transactionsToCheck.concat(data)
    // console.log('isRUnning', isRunning)
    // console.log("transactionsToCheck", transactionsToCheck.length)
    if (!isRunning) {
        transactionsToCheck = transactionsToCheck.concat(data)
        console.log('isRUnning', isRunning)
        console.log("transactionsToCheck", transactionsToCheck.length)
        await checkConfirmations()
    }
    res.send()


})

// async function sendPushNotification(params) {
//     /*     console.log('sendNotification')
//         console.log(params) */
//     try{
//     let response = await requestPromise.post(config.services.notificationService + '/pushNotificationToMobile', {
//         method: "POST",
//         body: {
//             userEmail: params.userEmail,
//             message: params.message,
//             type: params.type
//         },
//         headers: {
//             'content-type': 'application/json'
//         },
//         json: true
//     })}catch (error) {
//             console.log("ERR:", error)
//             return
//     }

//     //console.log(response.message)
//     //return
// }

async function checkConfirmations() {
    let transaction
    try {
        isRunning = true
        while (transactionsToCheck.length != 0) {
            //isRunning = true
            transaction = transactionsToCheck[0]
            console.log('transaction', transaction)
            var receipt = JSON.parse(JSON.stringify(await rpc.postAsync("gettransaction", [transaction.txHash]))).result

            //if (receipt.error == null) {

            console.log('confirmations', receipt.confirmations)

            await transactionHistoriesModel.updateOne({
                _id: transaction._id
            }, {
                $set: {
                    BTCconfirmations: receipt.confirmations
                }
            })

            if (receipt.confirmations == 3 || receipt.confirmations > 3) {

                //update sender balance
                //update receiver balance
                //update fee amount
                let currentTransaction = await transactionHistoriesModel.findOne({
                    _id: transaction._id
                }).lean().exec()

                if (currentTransaction.status != 'completed' &&
                    currentTransaction.status != 'waiting_for_confirmation' && currentTransaction.status != 'waiting_for_confirmation_') { //additional check. Should not accidentally update fee twice

                    let from = await getAddress(transaction.from)
                    let to = await getAddress(transaction.to)

                    let senderWallet = await walletsModel.findOne({
                        'btc.address': from
                    }).lean().exec()

                    let receiverWallet = await walletsModel.findOne({
                        'btc.address': to
                    }).lean().exec()

                    // This is if, BTC is the received amount
                    if (currentTransaction.isExchange) {
                        console.log(currentTransaction)
                        console.log('currentTransaction.isExchange')
                        let exchangeTargetBalance = await walletsModel.findOne({
                            'btc.address': currentTransaction.targetAddress
                        }).lean().exec()

                        if (exchangeTargetBalance != null) {
                            let balanceAfterExchange = Number(exchangeTargetBalance.btc.balance) + Number(currentTransaction.targetAmount)

                            await walletsModel.updateOne({
                                'btc.address': currentTransaction.targetAddress
                            }, {
                                $set: {
                                    'btc.balance': balanceAfterExchange
                                }
                            })

                            // await sendPushNotification({
                            //     userEmail: currentTransaction.email,
                            //     type: 'Exchange Completed',
                            //     message: `Exchange of ${currentTransaction.sourceAmount} ${currentTransaction.source} for ${currentTransaction.targetAmount} ${currentTransaction.target} is completed.`

                            // })
                        }

                    }


                    if (senderWallet != null) {
                        //update sender balance
                        // (-) fee amount
                        console.log('senderWallet')
                        //let senderBalance = await getBTCBalance(senderWallet.btc.address)

                        //console.log("senderBalance", senderBalance)
                        //if (senderBalance != NaN)
                        if (currentTransaction.source == 'btc') {
                            let senderBalance = Number(senderWallet.btc.balance)
                            senderBalance -= Number(currentTransaction.sourceAmount)
                            await walletsModel.updateOne({
                                email: senderWallet.email
                            }, {

                                'btc.balance': senderBalance

                                //'bch.balance': Number(senderBalance)
                            })
                        }
                        await transactionHistoriesModel.updateOne({
                            _id: transaction._id
                        }, {
                            $set: {
                                status: 'completed'
                            }
                        })
                        console.log("id3", transaction._id)
                        if (currentTransaction.isExchange) {


                            /*                             let exchangeTargetBalance = await walletsModel.findOne({
                                                            'btc.address': currentTransaction.targetAddress
                                                        }).lean().exec()


                                                        let balanceAfterExchange = Number(exchangeTargetBalance.btc.balance) + Number(currentTransaction.targetAmount)

                                                        await walletsModel.updateOne({
                                                            'btc.address': currentTransaction.targetAddress
                                                        }, {
                                                            $set: {
                                                                'btc.balance': balanceAfterExchange
                                                            }
                                                        })

                                                        await sendPushNotification({
                                                            userEmail: currentTransaction.email,
                                                            type: 'Exchange Completed',
                                                            message: `Exchange of ${currentTransaction.sourceAmount} ${currentTransaction.source} for ${currentTransaction.targetAmount} ${currentTransaction.target} is completed.`

                                                        }) */
                        } else {
                            //  await sendPushNotification({
                            //     userEmail: senderWallet.email,
                            //     type: 'Transaction Confirmed',
                            //     message: `Sent ${currentTransaction.sourceAmount} BTC.`

                            // })
                        }
                    }

                    if (receiverWallet != null) {

                        console.log('receiverWallet')
                        //let receiverBalance = await getBTCBalance(receiverWallet.btc.address)
                        //console.log('receiverBalance', receiverBalance)
                        //if (receiverBalance != NaN)
                        let receiverBalance = Number(receiverWallet.btc.balance)
                        receiverBalance += Number(currentTransaction.targetAmount)
                        await walletsModel.updateOne({
                            email: receiverWallet.email
                        }, {

                            'btc.balance': receiverBalance


                        })

                        if (currentTransaction.isExchange) {

                            // await sendPushNotification({
                            //     userEmail: receiverWallet.email,
                            //     type: 'Exchange Completed',
                            //     message: `Exchange of ${currentTransaction.sourceAmount} ${currentTransaction.source} for ${currentTransaction.targetAmount} ${currentTransaction.target} is completed.`

                            // })
                        } else if (currentTransaction.isExchange == false) {
                            /**if isExchange == false  and receiverWallet != null means, create a entry in transaction history collection for receiver.
                             * This transaction is received from internal user
                             * */
                            let txExistCheck = await transactionHistoriesModel.findOne({
                                $and: [{
                                        email: receiverWallet.email
                                    },
                                    {
                                        txHash: currentTransaction.txHash
                                    }
                                ]
                            }).lean().exec()

                            if (txExistCheck == null) {
                                await transactionHistoriesModel.create({
                                    email: receiverWallet.email,
                                    from: '',
                                    to: receiverWallet.btc.address,
                                    source: 'btc',
                                    target: 'btc',
                                    sourceAmount: currentTransaction.targetAmount,
                                    targetAmount: currentTransaction.targetAmount,
                                    value: currentTransaction.targetAmount,
                                    currency: 'btc',
                                    status: 'completed',
                                    txHash: currentTransaction.txHash,
                                    error: 'nil',
                                    isExchange: false,
                                    error: '',
                                    reason: '',
                                    fee: 0,
                                    BTCconfirmations: receipt.confirmations,
                                    ref: 0,
                                    targetAddress: '',
                                    type: 'received',
                                    timestamp: new Date().getTime()
                                })

                                // await sendPushNotification({
                                //     userEmail: receiverWallet.email,
                                //     type: 'Transaction Confirmed',
                                //     message: `Received ${currentTransaction.sourceAmount} BTC..`

                                // })
                            }
                        }

                    }

                    //update transaction fee of 'email from transaction'
                    if (currentTransaction.source == 'btc') {
                        await walletsModel.updateOne({
                            email: transaction.email
                        }, {
                            $inc: {
                                'btc.fee': Number(transaction.fee)
                            }
                        })
                    }


                    await transactionHistoriesModel.updateOne({
                        _id: transaction._id
                    }, {
                        $set: {
                            status: 'completed'
                        }
                    })

                    //update btc balance, fee
                } else if (currentTransaction.status == 'waiting_for_confirmation') {

                    let userWallet = await walletsModel.findOne({
                        email: currentTransaction.email
                    }).lean().exec()
                    let currentBalance = userWallet.btc.balance
                    let balanceAfterExchange = Number(currentBalance) - Number(currentTransaction.sourceAmount)
                    await walletsModel.updateOne({
                        email: currentTransaction.email
                    }, {
                        $set: {
                            'btc.balance': balanceAfterExchange,
                        },

                        $inc: {
                            'btc.fee': Number(currentTransaction.fee)
                        }
                    })

                    //following status is a hotFix
                    await transactionHistoriesModel.updateOne({
                        _id: currentTransaction._id
                    }, {
                        $set: {
                            status: 'waiting_for_confirmation_'
                        }
                    })
                }



                await exchangeTransactionsModel.updateOne({
                    dbId: transaction._id
                }, {
                    $set: {
                        BTCconfirmations: receipt.confirmations
                    }
                })


            }
            /*             } else {
                            console.log("Error")
                        } */
            transactionsToCheck.shift()
        }

        isRunning = false;


        //if (data.length > 0) {
        //await transactionsToCheck.forEachAsync(async transaction => {

        // });
        // }

    } catch (error) {
        console.log("ERR:", error)
        isRunning = false;
        await transactionHistoriesModel.updateOne({
            _id: transaction._id
        }, {
            status: 'failed'
        })

        transactionsToCheck.shift()


        //res.status(500).status("Erro
    }
}

async function getBTCBalance(_address) {
    let from = _address
    let method = "listunspent"
    let params = [1, 9999999, [from]]

    try {
        let response = await rpc.postAsync(method, params)
        console.log("getBTCBalance", response)
        if (response.error == null && response.result.length > -1) {
            let dummyArray = []
            let balance = 0
            let utxos = response.result
            utxos = dummyArray.concat(utxos)

            utxos.forEach(_utxo => {
                balance += Number(_utxo.amount)
            })

            console.log('balance', balance)
            return Number(balance)

        } else {
            return 0
        }
    } catch (err) {
        console.log(err)
        throw NaN
    }

}


router.get('/getAdminBalance', async (req, res) => {

    try{
        let adminBalance = await getBTCBalance(config.admin.btcaddress)

        return res.status(200).send({
            status:"Success",
            message:adminBalance
        })

    }
    catch(error){
        return res.status(500).send({
            status:"Fail",
            error:"Error"
        })
    }

})


/**
 * 
 * @param {string} _from 
 * @returns {string} Returns address || null
 */
async function getAddress(_from) {

    let emailFormat = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.])+\.([a-zA-Z]{2,5})/
    if (emailFormat.test(_from)) {

        let userWallet = await walletsModel.findOne({
            'email': _from
        }).lean().exec()

        if (userWallet != null) {
            return userWallet.btc.address
        } else {
            return null
        }

    }

    return _from


}
////////////////////////////////////////////////////////////////////////////////////////////

router.post('/send', async (req, res) => {
    let {
        from,
        to,
        amount,
        tx
    } = req.body

    console.log(req.body)

    let response = await rpc.postAsync(method, params)

    //await checkForEmailTX(tx)
    //handleResponse(tx._id, from, method, params, isExchangeTransaction)

    if (response.error != null) {
        await TransactionHistoriesModel.updateOne({
            _id: tx._id
        }, {
            $set: {
                status: 'pending',
                from: ''
            }
        })

        // if (isExchangeTransaction) {
        //     await sendPushNotification({
        //         userEmail: tx.email,
        //         type: 'Exchange Initiated',
        //         message: `Exchange of ${tx.sourceAmount} ${tx.source} is initiated.`

        //     })
        // } else {
        //     await sendPushNotification({
        //         userEmail: tx.email,
        //         type: 'Transaction Initiated',
        //         message: `Transaction to ${tx.to} is pending`

        //     })
        // }
    }
})

module.exports = router;
