require('array-foreach-async')
const config = require('../config')
const WalletFactory = require('../lib/wallet').WalletFactory
const walletFactory = new WalletFactory(config.wallet.mnemonics, config.wallet.password, config.wallet.network)
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider(config.wallet.provider))
const db = require('../lib/db')
const ABI = require('../static/ecr20abi').abi
// const bitcoin = require('../lib/btc')
const https = require('https')
const rpc = require('../lib/rpc')
const promise = require('request')
const requestPromise = require('request-promise')
const walletsModel = require('../models/wallets')
const requesti = require('../lib/network')
const TransactionHistoriesModel = require('../models/TransactionHistories')
const walletModel = require('../models/wallets')
const exchangeTransactionsModel = require('../models/exchangeTransactions')
const xrpTransaction = require('./xrp')

async function getWallet(ref) {
    let extendedKey = walletFactory.calculateBip44ExtendedKey(ref, true);
    let privKey = extendedKey.keyPair.d.toBuffer(32);
    //    console.log("privKey", "0x" + privKey.toString("hex"))
    return "0x" + privKey.toString("hex");
}

async function testgen() {
	let keyPair = await getWallet(365)
 let wallet = web3.eth.accounts.wallet
    wallet.clear()
    wallet = wallet.create(0)
    wallet.add(keyPair)
	console.log(keyPair, wallet[0].address)

}

//testgen().then(e => {console.log('done')})
async function sendTransaction() {
    let transactions = (await db.readManyAsync({
        status: 'in queue'
        /*  $or: [{
             status: 'in queue'
         }, {
             status: 'processing'
         }] */
    }, "TransactionHistories")).message
    if (transactions.length > 0) {
        transactions.forEach(async tx => {
            let isExchangeTransaction = false
            if (tx.status == 'processing') {
                isExchangeTransaction = true
            }

            switch (tx.source) {
                case "eth":
                    console.log('switch-case eth')
                    sendEthTx(tx)
                    break;
                case "btc":
                    console.log('switch-case btc')
                    sendBtcTx(tx)
                    break;
                default: //erc20 Transanction
                    console.log('switch-case token')
                    sendToken(tx, isExchangeTransaction)
                    //sendToken(tx, isExchangeTransaction)
            }
        })
    }
}

async function getTargetAddress(_email, targetCurrency) {
    let emailFormat = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.])+\.([a-zA-Z]{2,5})/
    if (emailFormat.test(_email)) {
        let wallet = await walletModel.findOne({
            email: _email
        }).lean().exec()

        if (wallet != null) {
            return wallet[targetCurrency]
        } else {
            return {}
        }
    } else {
        return {
            address: _email
        }
    }


}

async function sendEthTx(tx) {
    console.log(' eth')
    let txHash
    let wallet = web3.eth.accounts.wallet //.create(0)
    wallet.clear()
    wallet = wallet.create(0)
    wallet.add(await getWallet(tx.ref))
    let isExchangeTransaction = tx.isExchange
    //console.log(wallet[0])
    try {
        await checkForEmailTX(tx)

        //targetAmount will be empty for exchange transactions
        if (tx.isExchange == true) {

            tx.to = config.wallet.eth.adminAddress

            let exchangeTargetAddress = await getTargetAddress(tx.email, tx.target)
            console.log(exchangeTargetAddress)
            exchangeTargetAddress = exchangeTargetAddress.address

            await TransactionHistoriesModel.updateOne({
                _id: tx._id
            }, {
                $set: {
                    targetAddress: exchangeTargetAddress
                }
            })

            let response = await getExchangeAmount(tx.sourceAmount, tx.source, tx.target) //tx.target)
            response = JSON.parse(response)

            let targetAmount = response.amount
            console.log('targetAmount', targetAmount)
            if (targetAmount != 'error' && Number(targetAmount) > 0) {
                targetAmount = trimDecimals(targetAmount)
                tx.targetAmount = String(targetAmount)

            } else if (targetAmount != 'error' && Number(targetAmount) == 0) {
                //multiply by large number, then divide
                let minAmount = Number(response.min_amount)
                //tx.sourceAmount = Number(tx.sourceAmount) * minAmount
                response = await getExchangeAmount(minAmount, tx.source, tx.target) //tx.target)
                response = JSON.parse(response)
                let priceOfSingleUnit = Number(response.amount) / minAmount
                targetAmount = priceOfSingleUnit * Number(tx.sourceAmount)
                //targetAmount = Number(response.amount) / minAmount
                targetAmount = trimDecimals(targetAmount)
                tx.targetAmount = targetAmount
                // tx.sourceAmount = Number(tx.sourceAmount) / minAmount

                console.log("targetAmount", targetAmount)

            } else {
                throw {
                    message: 'error getting exchange price'
                }
            }

            await TransactionHistoriesModel.updateOne({
                "_id": tx._id
            }, {
                $set: {
                    targetAmount: tx.targetAmount
                }
            })
        }

        console.log("tx.to", tx.to)
        console.log(tx)
	let gasPriceTx = await web3.eth.getGasPrice()
	console.log({gasPrice: gasPriceTx, gasLimit: config.wallet.gasLimit})
        await web3.eth.sendTransaction({
            from: wallet[0],
            to: tx.to,
            value: web3.utils.toWei(String(tx.sourceAmount)),
            nonce: await web3.eth.getTransactionCount(wallet[0].address, "pending"),
            gasPrice: gasPriceTx, //'0x1DCD65000',
            gasLimit: "0x5208"//config.wallet.gasLimit

        }).on('transactionHash', async hash => {
            txHash = hash
            let fromAddress = wallet[0].address
            wallet.clear()
            let isTrade = tx.type == ("buy" || "sell") ? true : false
            console.log(`gotHash: ${hash}`)
            let feenew = Number(web3.utils.fromWei(gasPriceTx))*21000
            await updateTxStatus(tx._id, fromAddress, 'pending', txHash, '', isExchangeTransaction,feenew)

            if (isExchangeTransaction) {
                await sendPushNotification({
                    userEmail: tx.email,
                    type: 'Exchange Initiated',
                    message: `Exchange of ${tx.sourceAmount} ${tx.source} is initiated.`

                })
            } else {
                await sendPushNotification({
                    userEmail: tx.email,
                    type: 'Transaction Initiated',
                    message: `Transaction to ${tx.to} is pending`

                })
            }

            requesti.post(config.services.emailService + '/sendTransactionEmail', {
                type: "Send",
                from: fromAddress,
                to: tx.to,
                source: String(tx.sourceAmount) + String(tx.currency.toUpperCase()),
                target: String(tx.sourceAmount) + String(tx.currency.toUpperCase()),
                email: tx.email
            })
            /*             db.updateOneAsync({_id: tx._id},{
                            $set:{
                                from: wallet[0].address,
                                txHash: hash,
                                status: 'pending'
                            }
                        }, "TransactionHistories") */
            return
        })
    } catch (err) {
        console.log(err.message)
        let readableErrorMsg;
        let fromAddress = wallet[0].address
        wallet.clear()
        let isTrade = tx.type == ("buy" || "sell") ? true : false
        await updateTxStatus(tx._id, fromAddress, 'failed', txHash, err.message, false)

        if (String(err.message).search('insufficient funds')) {
            readableErrorMsg = "Insufficient Funds"
        } else {
            readableErrorMsg = 'An error Occured'
        }

        await sendPushNotification({
            userEmail: tx.email,
            type: 'Transaction Failed',
            message: `Transaction failed \n - ${readableErrorMsg}`
            //'ETH transaction of ' + tx.amount + 'to ' +  tx.to + ' has Errored. \n  Error: ' + err.message
        })
        /*  db.updateOneAsync({_id: tx._id},{
             $set:{
                 from: wallet[0].address,
                 txHash: txHash,
                 status: 'error',
                 reason: err.message
             }
         }, "TransactionHistories") */
        return
    }

}

async function updateTxStatus(dbId, from, status, hash, message = "", isExchangeTransaction,fee) {

    if (isExchangeTransaction) {
        await db.updateOneAsync({
            _id: dbId
        }, {
            $set: {
                from: from,
                txHash: hash,
                status: 'waiting_for_confirmation',
                reason: message,
            }
        }, "TransactionHistories")
    }
    /*     if(isTrade && status == "pending"){
            await db.updateOneAsync({_id: dbId},{
                $set:{
                    from: from,
                    txHash: hash,
                    status: status,
                    reason: message,
                    internalStatus: '',
                    internalType : 'trade'
                }
            }, "TransactionHistories")
        } */
    else {
        await db.updateOneAsync({
            _id: dbId
        }, {
            $set: {
                from: from,
                txHash: hash,
                status: status,
                reason: message,
                gasfee : fee
            }
        }, "TransactionHistories")
        
    }
}

async function getExchangeAmount(sourceAmount, sourceCurrency, targetCurrency) {
    try {
        console.log(sourceAmount, sourceCurrency, targetCurrency)

        sourceAmount = Number(sourceAmount)
        sourceCurrency = String(sourceCurrency).toUpperCase()
        targetCurrency = String(targetCurrency).toUpperCase()

        let body = JSON.stringify({
            "from": sourceCurrency,
            "to": targetCurrency,
            "amount": sourceAmount
        })
        console.log(body)
        let response = await requestPromise.post('https://api.godex.io/api/v1/info', {
            method: "POST",
            body: body,

            /*     body: {
                    //from: tx.from,
                    from: sourceCurrency,
                    to: targetCurrency,
                    amount: sourceAmount,
                }, */
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            //json: true
        }).catch(err => console.log(err))

        return response
    } catch (err) {
        console.log(err.message)
        return {
            rate: 'error',
            amount: 'error',
            minAmount: 'error',
        }
    }

}

async function handleResponse(txId, from, method, params, isExchangeTransaction) {
    try {
        console.log(txId)
        let response = await rpc.postAsync(method, params);
        console.log("----------------", response)
        if ((response.error == null) && isExchangeTransaction == false) {
            await db.updateOneAsync({
                txId
            }, {
                $set: {
                    from: from,
                    txHash: "",
                    status: "pending",
                    reason: ""
                }
            }, "TransactionHistories")
        } else {
            console.log("E r r o r")
        }
    } catch (err) {
        console.log("E R R :\n", err)
        // res.send({ status: "failed", message: err.error })
    }

}


// async function sendTrxTx(tx, isExchangeTransaction) {
//     try {
//         let from = tx.from
//         let to = tx.to
//         let amount = tx.targetAmount
//         let method = "sendTransaction"
//         let params = [to, amount]



//     } catch (error) {

//     }
// }

async function sendToken(tx) {
    let wallet = web3.eth.accounts.wallet //.create(0)
    wallet.clear()
    wallet = wallet.create(0)
    if(tx.isAdmin == true){
        wallet.add(config.wallet.contracts[0].privKey)
    }else{
    wallet.add(await getWallet(tx.ref))
    }
    console.log(tx.ref)
    console.log(wallet[0].address)
    let txHash
    try {
        await checkForEmailTX(tx)
        console.log("tx.to", tx.to)
        let status = 'pending'

        if (tx.isExchange == true) {
            status = 'waiting_for_confirmation'

            tx.to = config.wallet.usdt.adminAddress

            let exchangeTargetAddress = await getTargetAddress(tx.email, tx.target)
            console.log(exchangeTargetAddress)
            exchangeTargetAddress = exchangeTargetAddress.address

            /*             await TransactionHistoriesModel.updateOne({
                            _id: tx._idf
                        }, {
                            $set: {
                                targetAddress: exchangeTargetAddress
                            }
                        }) */

            //calculate tx.targetAmount

            let response = await getExchangeAmount(tx.sourceAmount, tx.source, tx.target) //tx.target)
            response = JSON.parse(response)

            let targetAmount = response.amount
            console.log('targetAmount', targetAmount)
            if (targetAmount != 'error' && Number(targetAmount) > 0) {
                targetAmount = trimDecimals(targetAmount)

                tx.targetAmount = String(targetAmount)

            } else if (targetAmount != 'error' && Number(targetAmount) == 0) {
                //multiply by large number, then divide
                let minAmount = Number(response.min_amount)
                //tx.sourceAmount = Number(tx.sourceAmount) * minAmount
                response = await getExchangeAmount(minAmount, tx.source, tx.target) //tx.target)
                response = JSON.parse(response)
                let priceOfSingleUnit = Number(response.amount) / minAmount
                targetAmount = priceOfSingleUnit * Number(tx.sourceAmount)
                //targetAmount = Number(response.amount) / minAmount
                targetAmount = trimDecimals(targetAmount)
                tx.targetAmount = targetAmount

                console.log("targetAmount", targetAmount)


            } else {
                throw {
                    message: 'error getting exchange price'
                }
            }

            await TransactionHistoriesModel.updateOne({
                _id: tx._id
            }, {
                $set: {
                    targetAddress: exchangeTargetAddress,
                    targetAmount: tx.targetAmount
                }
            })

            await TransactionHistoriesModel.updateOne({
                _id: tx._id
            }, {
                $set: {
                    targetAddress: exchangeTargetAddress
                }
            })
        }

        let contractAddres = await getTokenContract(tx.source)
        console.log("contractAddres", contractAddres)
        let instance = await new web3.eth.Contract(ABI, contractAddres)
        let tokenDecimal = await getTokenDecimal(tx.source)

        if (String(tx.sourceAmount).indexOf('.') > -1) {
            tx.sourceAmount = Number(tx.sourceAmount) * (10 ** Number(tokenDecimal)) //raise to 10 power 6
            tx.sourceAmount = Math.trunc(tx.sourceAmount) //remove digits after decimal point
            tokenDecimal -= Number(tokenDecimal) //reduce the decimalPoint digits
        }

        let amountAsBn = web3.utils.toBN(tx.sourceAmount)
        let BN10 = web3.utils.toBN(10)
        let decimalBN = web3.utils.toBN(tokenDecimal)
        let decimalUnitsBN = BN10.pow(decimalBN)
        let amountToTransfer = amountAsBn.mul(decimalUnitsBN)

        let targetAmount = Number(tx.targetAmount) * (10 ** Number(tokenDecimal))
        //let targetAmount = amountToTransfer;
        console.log('amountToTransfer', targetAmount,tokenDecimal,amountToTransfer)

console.log(wallet[0].address)

        let gasLimit = await instance.methods.transfer(tx.to, amountToTransfer).estimateGas({from: wallet[0].address})

console.log({gasLimit})
        instance.methods.transfer(tx.to, amountToTransfer).send({
                from: wallet[0].address,
                nonce: await web3.eth.getTransactionCount(wallet[0].address, "pending"),
                gas:gasLimit
                // gas: config.wallet.gasLimit
            })
            .on('transactionHash', async hash => {
                txHash = hash
                console.log(txHash)
                let feenew = Number(web3.utils.fromWei(await web3.eth.getGasPrice()))*Number(gasLimit)
                db.updateOneAsync({
                    _id: tx._id
                }, {
                    $set: {
                        from: wallet[0].address,
                        txHash: hash,
                        status: status,
                        gasfee : feenew
                    }
                }, "TransactionHistories")

                if (tx.isExchange == true) {
                    await sendPushNotification({
                        userEmail: tx.email,
                        type: 'Exchange Initiated',
                        //10 ** 6 is multipled before for truncating decimals.
                        message: `Exchange of ${Number(tx.sourceAmount)/10**6} ${tx.source} is initiated.`

                    })
                } else {
                    let receiver = await walletModel.findOne({
                        'eth.address': tx.to
                    }).lean().exec()
                    console.log(receiver)
                    if (receiver != null) {
                        receiver = receiver.email
                    } else {
                        receiver = tx.to
                    }
                    // await sendPushNotification({
                    //     userEmail: tx.email,
                    //     type: 'Transaction Initiated',
                    //     message: `Transaction to ${tx.to} is pending`

                    // })
                }
                requesti.post(config.services.emailService + '/sendTransactionEmail', {
                    type: "Send",
                    from: wallet[0].address,
                    to: tx.to,
                    source: String(tx.sourceAmount) + String(tx.currency.toUpperCase()),
                    target: String(tx.sourceAmount) + String(tx.currency.toUpperCase()),
                    email: tx.email
                })


            })
    } catch (err) {
        console.log(err.message)
        db.updateOneAsync({
            _id: tx._id
        }, {
            $set: {
                from: wallet[0].address,
                txHash: txHash,
                status: 'failed',
                reason: err.message
            }
        }, "TransactionHistories")
    }
}

async function getTokenDecimal(_currency) {
    let contracts = config.wallet.contracts
    let decimal
    console.log(_currency)
    await contracts.forEachAsync(_contract => {
        if (_contract.symbol == _currency) {
            decimal = _contract.decimal

            //            return decimal
        }
    })
    return decimal
}

function getTokenContract(_currency) {
    let address;
    let contracts = config.wallet.contracts
    console.log("contracts",contracts)
    contracts.forEach(_contract => {
        if (_contract.symbol == _currency) {
            address = _contract.address
            console.log("address",address)
            return
        }
    })
    return address
}

async function getUserWallet(_email, _currency) {
    let user = await db.readFromDBAsync({
        email: _email
    }, "accounts")

    if (user.status == "success" && user.message != null) {
        return user.message.wallets[_currency]
    } else {
        return null
    }
}

async function getDestinationTag(_email) {
    let wallet = await walletModel.findOne({
        email: _email
    }).lean().exec()

    if (wallet != null) {
        return wallet.xrp.destinationTag
    }
}

async function checkForEmailTX(tx) {
    let emailFormat = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.])+\.([a-zA-Z]{2,5})/
    if (emailFormat.test(tx.to)) {
        let receiverAddress = await getUserWallet(tx.to, tx.target)
        if (receiverAddress != null) {
            if (tx.target == 'xrp') {
                tx.destinationTag = await getDestinationTag(tx.to)
            }
            tx.to = receiverAddress
        } else {
            return "invalid_email"
        }
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

function trimDecimals(targetAmount) {
    if (String(targetAmount).indexOf('.') != -1) {
        targetAmount = Number(targetAmount) * 10 ** 6
        targetAmount = Math.trunc(targetAmount)
        targetAmount = targetAmount / (10 ** 6)
        return targetAmount
    } else {
        return targetAmount
    }
}

async function sendBtcTx(tx) {
    try {
        await checkForEmailTX(tx)
        let isExchangeTransaction = tx.isExchange

        let from = tx.from
        ///let to = tx.to

        let to = await getAddress(tx.to, tx.source)
        tx.to = to

        if (isExchangeTransaction) {
            tx.to = config.wallet.btc.adminAddress

        }


        let amount = tx.sourceAmount
        let method = "sendtoaddress"
        let params = [tx.to, amount, "", "", true]

        console.log("TXNS:",amount, method, params, tx)


        let response = await rpc.postAsync(method, params)

        //console.log(JSON.parse(response))
        //console.log('sendBTC', JSON.parse(response).result)
        //handleResponse(tx._id, from, method, params, isExchangeTransaction)

        console.log(response.result)

        if (response.error == null) {

            //console.log(JSON.parse(response.result))

            if (isExchangeTransaction) {

                let exchangeTargetAddress = await getTargetAddress(tx.email, tx.target)
                exchangeTargetAddress = exchangeTargetAddress.address

                console.log("exchangeTargetAddress", exchangeTargetAddress)

                let exchangeResponse = await getExchangeAmount(tx.sourceAmount, tx.source, tx.target) //tx.target)
                exchangeResponse = JSON.parse(exchangeResponse)

                let targetAmount = exchangeResponse.amount
                console.log('targetAmount', targetAmount)
                if (targetAmount != 'error' && Number(targetAmount) > 0) {
                    targetAmount = trimDecimals(targetAmount)
                    tx.targetAmount = String(targetAmount)

                } else if (targetAmount != 'error' && Number(targetAmount) == 0) {
                    //multiply by large number, then divide
                    let minAmount = Number(exchangeResponse.min_amount)
                    //tx.sourceAmount = Number(tx.sourceAmount) * minAmount
                    exchangeResponse = await getExchangeAmount(minAmount, tx.source, tx.target) //tx.target)
                    exchangeResponse = JSON.parse(exchangeResponse)
                    let priceOfSingleUnit = Number(exchangeResponse.amount) / minAmount
                    targetAmount = priceOfSingleUnit * Number(tx.sourceAmount)
                    //targetAmount = Number(response.amount) / minAmount
                    targetAmount = trimDecimals(targetAmount)
                    tx.targetAmount = targetAmount

                    console.log("targetAmount", targetAmount)

                } else {
                    throw {
                        message: 'error getting exchange price'
                    }
                }

                await TransactionHistoriesModel.updateOne({
                    _id: tx._id
                }, {
                    $set: {
                        targetAddress: exchangeTargetAddress,
                        targetAmount: tx.targetAmount,
                        status: 'waiting_for_confirmation',
                        //from: '',
                        txHash: response.result
                    }
                })

                // await sendPushNotification({
                //     userEmail: tx.email,
                //     type: 'Exchange Initiated',
                //     message: `Exchange of ${tx.sourceAmount} ${tx.source} is initiated.`

                // })
            } else {

                console.log("UPDATING THE DB")
                console.log(response.result, tx._id)

                let txnss = await TransactionHistoriesModel.findOne({_id:tx._id}).lean()
                console.log("UPDATING THE DB",txnss)

                let infos = await TransactionHistoriesModel.updateOne({
                    _id: tx._id
                }, {
                    $set: {
                        status: 'pending',
                        txHash: response.result
                    }
                })

                console.log("UPDATED",infos)
 
                // await sendPushNotification({
                //     userEmail: tx.email,
                //     type: 'Transaction Initiated',
                //     message: `Transaction to ${tx.to} is pending`

                // })
            }
            requesti.post(config.services.emailService + '/sendTransactionEmail', {
                type: "Send",
                from: tx.from,
                to: tx.to,
                source: String(tx.sourceAmount) + String(tx.currency.toUpperCase()),
                target: String(tx.sourceAmount) + String(tx.currency.toUpperCase()),
                email: tx.email
            })
        }
    } catch (error) {
        console.log('catch block', error) //{error: 'error', reason: ''}
    }

}


// async function sendBtcTx(tx) {
//     try {
//         await checkForEmailTX(tx)
//         let isExchangeTransaction = tx.isExchange

//         let from = tx.from
//         ///let to = tx.to

//         let to = await getAddress(tx.to, tx.source)
//         tx.to = to

//         if (isExchangeTransaction) {
//             tx.to = config.wallet.btc.adminAddress

//         }


//         let amount = tx.sourceAmount
//         let method = "sendtoaddress"
//         let params = [tx.to, amount]
//         ///console.log(amount,method,params)

//         let response = await rpc.postAsync(method, params)
//         console.log(amount,method,params)
//         //console.log(JSON.parse(response))
//         //console.log('sendBTC', JSON.parse(response).result)
//         //handleResponse(tx._id, from, method, params, isExchangeTransaction)

//         //console.log(response)

//         if (response.error == null) {

//             //console.log(JSON.parse(response.result))

//             if (isExchangeTransaction) {

//                 let exchangeTargetAddress = await getTargetAddress(tx.email, tx.target)
//                 exchangeTargetAddress = exchangeTargetAddress.address

//                 console.log("exchangeTargetAddress", exchangeTargetAddress)

//                 let exchangeResponse = await getExchangeAmount(tx.sourceAmount, tx.source, tx.target) //tx.target)
//                 exchangeResponse = JSON.parse(exchangeResponse)

//                 let targetAmount = exchangeResponse.amount
//                 console.log('targetAmount', targetAmount)
//                 if (targetAmount != 'error' && Number(targetAmount) > 0) {
//                     targetAmount = trimDecimals(targetAmount)
//                     tx.targetAmount = String(targetAmount)

//                 } else if (targetAmount != 'error' && Number(targetAmount) == 0) {
//                     //multiply by large number, then divide
//                     let minAmount = Number(exchangeResponse.min_amount)
//                     //tx.sourceAmount = Number(tx.sourceAmount) * minAmount
//                     exchangeResponse = await getExchangeAmount(minAmount, tx.source, tx.target) //tx.target)
//                     exchangeResponse = JSON.parse(exchangeResponse)
//                     let priceOfSingleUnit = Number(exchangeResponse.amount) / minAmount
//                     targetAmount = priceOfSingleUnit * Number(tx.sourceAmount)
//                     //targetAmount = Number(response.amount) / minAmount
//                     targetAmount = trimDecimals(targetAmount)
//                     tx.targetAmount = targetAmount

//                     console.log("targetAmount", targetAmount)

//                 } else {
//                     throw {
//                         message: 'error getting exchange price'
//                     }
//                 }

//                 await TransactionHistoriesModel.updateOne({
//                     _id: tx._id
//                 }, {
//                     $set: {
//                         targetAddress: exchangeTargetAddress,
//                         targetAmount: tx.targetAmount,
//                         status: 'waiting_for_confirmation',
//                         //from: '',
//                         txHash: response.result
//                     }
//                 })

//                 await sendPushNotification({
//                     userEmail: tx.email,
//                     type: 'Exchange Initiated',
//                     message: `Exchange of ${tx.sourceAmount} ${tx.source} is initiated.`

//                 })
//             } else {
//                console.log("new2")
//                console.log(response.result)
//                console.log(tx._id)
//                //let re1 = await TransactionHistoriesModel.findOne({_id: 5f68808f2c642536a1d1e19e}).lean().exec()

//                 ///console.log(re1)
//                 // let resu = await TransactionHistoriesModel.updateOne({
//                 //     _id: tx._id
//                 // }, {
//                 //     $set: {
//                 //         status: 'pending',
//                 //         //from: '',
//                 //         txHash: response.result
//                 //     }
//                 // })
//                 //await TransactionHistories.findByIdAndUpdate({tx._id},{"status": "pending","txHash": })
//                 console.log(resu)
//                 console.log("new1")
//                 // await sendPushNotification({
//                 //     userEmail: tx.email,
//                 //     type: 'Transaction Initiated',
//                 //     message: `Transaction to ${tx.to} is pending`

//                 // })
//             }
//         }
//     } catch (error) {
//         console.log('catch block', error) //{error: 'error', reason: ''}
//     }

// }


// async function sendBtcTx(tx) {
//     try {
//         await checkForEmailTX(tx)
//         let isExchangeTransaction = tx.isExchange

//         let from = tx.from
//         ///let to = tx.to

//         let to = await getAddress(tx.to, tx.source)
//         tx.to = to

//         if (isExchangeTransaction) {
//             tx.to = config.wallet.btc.adminAddress

//         }


//         let amount = tx.sourceAmount
//         let method = "sendtoaddress"
//         let params = [tx.to, amount]
//         ///console.log(amount,method,params)

//         let response = await rpc.postAsync(method, params)
//         console.log(amount,method,params)
//         //console.log(JSON.parse(response))
//         //console.log('sendBTC', JSON.parse(response).result)
//         //handleResponse(tx._id, from, method, params, isExchangeTransaction)

//         //console.log(response)

//         if (response.error == null) {

//             //console.log(JSON.parse(response.result))

//             if (isExchangeTransaction) {

//                 let exchangeTargetAddress = await getTargetAddress(tx.email, tx.target)
//                 exchangeTargetAddress = exchangeTargetAddress.address

//                 console.log("exchangeTargetAddress", exchangeTargetAddress)

//                 let exchangeResponse = await getExchangeAmount(tx.sourceAmount, tx.source, tx.target) //tx.target)
//                 exchangeResponse = JSON.parse(exchangeResponse)

//                 let targetAmount = exchangeResponse.amount
//                 console.log('targetAmount', targetAmount)
//                 if (targetAmount != 'error' && Number(targetAmount) > 0) {
//                     targetAmount = trimDecimals(targetAmount)
//                     tx.targetAmount = String(targetAmount)

//                 } else if (targetAmount != 'error' && Number(targetAmount) == 0) {
//                     //multiply by large number, then divide
//                     let minAmount = Number(exchangeResponse.min_amount)
//                     //tx.sourceAmount = Number(tx.sourceAmount) * minAmount
//                     exchangeResponse = await getExchangeAmount(minAmount, tx.source, tx.target) //tx.target)
//                     exchangeResponse = JSON.parse(exchangeResponse)
//                     let priceOfSingleUnit = Number(exchangeResponse.amount) / minAmount
//                     targetAmount = priceOfSingleUnit * Number(tx.sourceAmount)
//                     //targetAmount = Number(response.amount) / minAmount
//                     targetAmount = trimDecimals(targetAmount)
//                     tx.targetAmount = targetAmount

//                     console.log("targetAmount", targetAmount)

//                 } else {
//                     throw {
//                         message: 'error getting exchange price'
//                     }
//                 }

//                 await TransactionHistoriesModel.updateOne({
//                     _id: tx._id
//                 }, {
//                     $set: {
//                         targetAddress: exchangeTargetAddress,
//                         targetAmount: tx.targetAmount,
//                         status: 'waiting_for_confirmation',
//                         //from: '',
//                         txHash: response.result
//                     }
//                 })

//                 await sendPushNotification({
//                     userEmail: tx.email,
//                     type: 'Exchange Initiated',
//                     message: `Exchange of ${tx.sourceAmount} ${tx.source} is initiated.`

//                 })
//             } else {
//                console.log("new2")
//                console.log(response.result)
//                console.log(tx._id)
//                //let re1 = await TransactionHistoriesModel.findOne({_id: 5f68808f2c642536a1d1e19e}).lean().exec()

//                 ///console.log(re1)
//                 // let resu = await TransactionHistoriesModel.updateOne({
//                 //     _id: tx._id
//                 // }, {
//                 //     $set: {
//                 //         status: 'pending',
//                 //         //from: '',
//                 //         txHash: response.result
//                 //     }
//                 // })
//                 //await TransactionHistories.findByIdAndUpdate({tx._id},{"status": "pending","txHash": })
//                 console.log(resu)
//                 console.log("new1")
//                 // await sendPushNotification({
//                 //     userEmail: tx.email,
//                 //     type: 'Transaction Initiated',
//                 //     message: `Transaction to ${tx.to} is pending`

//                 // })
//             }
//         }
//     } catch (error) {
//         console.log('catch block', error) //{error: 'error', reason: ''}
//     }

// }

// async function sendBtcTx(tx) {
//     try {
//         await checkForEmailTX(tx)
//         let isExchangeTransaction = tx.isExchange

//         let from = tx.from
//         ///let to = tx.to

//         let to = await getAddress(tx.to, tx.source)
//         tx.to = to

//         if (isExchangeTransaction) {
//             tx.to = config.wallet.btc.adminAddress

//         }

        
//         let amount = tx.sourceAmount
//         let method = "sendtoaddress"
//         let params = [tx.to, amount]
//         console.log(amount,method,params)

//         let response = await rpc.postAsync(method, params)
//         console.log(amount,method,params)
//         //console.log(JSON.parse(response))
//         //console.log('sendBTC', JSON.parse(response).result)
//         //handleResponse(tx._id, from, method, params, isExchangeTransaction)

//         //console.log(response)
        
//         if (response.error == null) {
            
//             //console.log(JSON.parse(response.result))

//             if (isExchangeTransaction) {

//                 let exchangeTargetAddress = await getTargetAddress(tx.email, tx.target)
//                 exchangeTargetAddress = exchangeTargetAddress.address

//                 console.log("exchangeTargetAddress", exchangeTargetAddress)

//                 let exchangeResponse = await getExchangeAmount(tx.sourceAmount, tx.source, tx.target) //tx.target)
//                 exchangeResponse = JSON.parse(exchangeResponse)

//                 let targetAmount = exchangeResponse.amount
//                 console.log('targetAmount', targetAmount)
//                 if (targetAmount != 'error' && Number(targetAmount) > 0) {
//                     targetAmount = trimDecimals(targetAmount)
//                     tx.targetAmount = String(targetAmount)

//                 } else if (targetAmount != 'error' && Number(targetAmount) == 0) {
//                     //multiply by large number, then divide
//                     let minAmount = Number(exchangeResponse.min_amount)
//                     //tx.sourceAmount = Number(tx.sourceAmount) * minAmount
//                     exchangeResponse = await getExchangeAmount(minAmount, tx.source, tx.target) //tx.target)
//                     exchangeResponse = JSON.parse(exchangeResponse)
//                     let priceOfSingleUnit = Number(exchangeResponse.amount) / minAmount
//                     targetAmount = priceOfSingleUnit * Number(tx.sourceAmount)
//                     //targetAmount = Number(response.amount) / minAmount
//                     targetAmount = trimDecimals(targetAmount)
//                     tx.targetAmount = targetAmount

//                     console.log("targetAmount", targetAmount)

//                 } else {
//                     throw {
//                         message: 'error getting exchange price'
//                     }
//                 }

//                 await TransactionHistoriesModel.updateOne({
//                     _id: tx._id
//                 }, {
//                     $set: {
//                         targetAddress: exchangeTargetAddress,
//                         targetAmount: tx.targetAmount,
//                         status: 'waiting_for_confirmation',
//                         //from: '',
//                         txHash: response.result
//                     }
//                 })

//                 await sendPushNotification({
//                     userEmail: tx.email,
//                     type: 'Exchange Initiated',
//                     message: `Exchange of ${tx.sourceAmount} ${tx.source} is initiated.`

//                 })
//             } else {
//                 console.log("new2")
//                 console.log(response.result)
//                 console.log(re1)
//                 let re1 = await TransactionHistoriesModel.find({_id: tx._id})
//                 console.log(re1)
//                 let resu = await TransactionHistoriesModel.updateOne({
//                     _id: tx._id
//                 }, {
//                     $set: {
//                         status: 'pending',
//                         //from: '',
//                         txHash: response.result
//                     }
//                 })
//                 console.log(resu)
//                 console.log("new1")
//                 // await sendPushNotification({
//                 //     userEmail: tx.email,
//                 //     type: 'Transaction Initiated',
//                 //     message: `Transaction to ${tx.to} is pending`

//                 // })
//             }
//         }
//     } catch (error) {
//         console.log('catch block', error) //{error: 'error', reason: ''}
//     }

// }

async function getAddress(_to, source) {

    let emailFormat = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.])+\.([a-zA-Z]{2,5})/
    if (emailFormat.test(_to)) {

        let userWallet = await walletsModel.findOne({
            'email': _to
        }).lean().exec()

        if (userWallet != null) {
            return userWallet[source].address
        } else {
            return null
        }

    }

    return _to


}

module.exports = {
    sendTransaction
}
