/**
 * ///////////////////EXCHANGE CRON/////////////////
 * This cron will execute the second part of the swap.
 * i.e Transferring from the admin.
 * 
 */


const cron = require('node-cron');
const cryptoLib = require('./cron-lib/sendCrypto')
const mongoose = require('mongoose')
const config = require('./config')
const transactionHistoriesModel = require('./models/TransactionHistories')
const exchangeTransactionsModel = require('./models/exchangeTransactions')
const walletModel = require('./models/wallets')
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider(config.wallet.provider))
const ABI = require('./static/ecr20abi').abi
const keyPairs = require('ripple-keypairs')
const RippleAPI = require('ripple-lib').RippleAPI;
const rpc = require('./lib/rpc')
const request = require('request-promise')


let adminKeypairTemp = keyPairs.deriveKeypair(config.seed)
let depositAddressTemp = keyPairs.deriveAddress(adminKeypairTemp.publicKey)

//const rippleApi = require('../app').rippleApi

// connect to ripple
const rippleApi = new RippleAPI({
    server: config.rippleProvider // Public rippled server hosted by Ripple, Inc.
});

function connect() {
    if (rippleApi.isConnected() == false) {
        console.log('connecting to ripple')
        rippleApi.connect().catch(err => {
            console.log(err.message)
            setTimeout(connect())
        })
    }
}
connect()

rippleApi.on('error', (code, message) => {
    console.log(`Connection closed: ${code} : ${message}`)
    rippleApi.disconnect().catch(err => {
        console.log("on Error: " + err.message)
    })
})

rippleApi.on('disconnected', () => {
    console.log('Disconnected')
    setTimeout(() => {
        rippleApi.connect().catch(err => {
            console.log("On disconected: " + err.message)
        })
    }, 5000)
    //rippleApi.connect()
})

rippleApi.on('connected', () => {
    console.log('Connected to ripple provider')

    rippleApi.request('subscribe', {
        streams: ["transactions"]
    }).then(response => {
        //console.log(response)
    }).catch((err) => {
        console.log("on Connected: " + err.message)
    })
})

let isRunning = false
mongoose.connect('mongodb://' + config.db.userName + ':' + config.db.password + '@' + config.db.host + ':' + config.db.port + '/pinksurfing').then(() => {
    console.log('mongo connected')

    cron.schedule('* * * * *', async () => {
        if (!isRunning) {
            await initiate()
        }
    });
})

let transactionsToCheck = []
let _IDS = [];


async function initiate() {
    let transactions = await exchangeTransactionsModel.find({
        status: 'in queue'
    }).lean().exec()
    transactions.forEach(_transaction => {
        if (_IDS.indexOf(_transaction.id) == -1) {
            _IDS.push(_transaction._id)
            transactionsToCheck.push(_transaction)
        }
    })

    await start()
}

async function start() {
    isRunning = true
    while (transactionsToCheck.length > 0) {

        let tx = transactionsToCheck[0]
        console.log(tx)

        switch (tx.target) { //second part of exchange Transaction . i.e from admin 
            case 'eth':
                if (checkConfirmations(tx.source, tx)) {
                    await sendEth(tx)
                    transactionsToCheck.shift()
                    _IDS.shift()
                }
                break;

            case 'btc':
                if (checkConfirmations(tx.source, tx)) {
                    await sendBTC(tx)
                    transactionsToCheck.shift()
                    _IDS.shift()
                }
                break;

            case 'bch':
                if (checkConfirmations(tx.source, tx)) {
                    await sendBCH(tx);
                    transactionsToCheck.shift()
                    _IDS.shift()
                }
                break;

            case 'xrp':
                if (checkConfirmations(tx.source, tx)) {
                    await sendXRP(tx)
                    transactionsToCheck.shift()
                    _IDS.shift()
                }

                break;

            case 'usdt':
                if (checkConfirmations(tx.source, tx)) {
                    await sendToken(tx)
                    transactionsToCheck.shift()
                    _IDS.shift()
                }

                break;

            case 'pax':
                if (checkConfirmations(tx.source, tx)) {
                    await sendToken(tx)
                    transactionsToCheck.shift()
                    _IDS.shift()
                }

                break;

            case 'trx':
                if (checkConfirmations(tx.source, tx)) {
                    await sendTRX(tx)
                    transactionsToCheck.shift()
                    _IDS.shift()
                }
                break;

        }


    }

    isRunning = false;
}

function checkConfirmations(source, tx) {
    switch (source) {
        case 'btc':
            if (tx.BTCconfirmations > 3) {
                return true
            } else {
                return false
            }
            break;

        case 'bch':
            if (tx.BCHconfirmations > 3) {
                return true
            } else {
                return false
            }
            break;

        default:
            return true
    }
}

async function sendTRX(tx) {
    try {
        /*         let response = await request.post(config.services.trxService + '/depositAddress', {
                    method: 'POST',
                    body: {
                        ref: ref,

                    },
                    json: true,
                    headers: {
                        'content-type': 'application/json'
                    }
                }) */
        let txCheck = await exchangeTransactionsModel.findOne({
            "_id": tx._id
        }).lean().exec()

        if (txCheck.status == 'in queue') {
            let response = await request({
                method: 'POST',
                uri: config.services.trxService + '/transfer',
                body: {
                    ref: 0,
                    to: tx.to,
                    value: tx.targetAmount,
                    dbId: tx.dbId,
                    status: 'processing'
                },
                json: true
            })

            console.log(response)

            if (response.status = 'success') {
                await transactionHistoriesModel.updateOne({
                    txHash: tx.sourceTxHash,
                }, {
                    $set: {
                        txHash: response.message.transaction.txID,
                        status: 'processing',
                        sourceTxHash: tx.sourceTxHash
                    }
                })

                await exchangeTransactionsModel.updateOne({
                    _id: tx._id
                }, {
                    status: 'processing'
                })
            }
        }
    } catch (err) {
        console.log(err)
        await transactionHistoriesModel.updateOne({
            txHash: tx.sourceTxHash,
        }, {
            $set: {
                //txHash: hash,
                status: 'error-2',
                //sourceTxHash: tx.sourceTxHash
                reason: err.message
            }
        })

        await exchangeTransactionsModel.updateOne({
            _id: tx._id
        }, {
            status: 'error',
            reason: err.message
        })
    }

}

async function sendEth(tx) {

    let txHash;
    try {
        let txCheck = await exchangeTransactionsModel.findOne({
            "_id": tx._id
        }).lean().exec()

        if (txCheck.status == 'in queue') {
            let wallet = web3.eth.accounts.wallet
            wallet.clear()
            wallet = wallet.create(0)
            wallet.add(config.wallet.eth.privKey)

            if (tx.to == undefined) {
                throw {
                    'message': 'invalid to address'
                }
            }
            web3.eth.sendTransaction({
                from: wallet[0],
                to: tx.to,
                value: web3.utils.toWei(tx.targetAmount),
                nonce: await web3.eth.getTransactionCount(wallet[0].address, "pending"),
                gasPrice: await web3.eth.getGasPrice(),
                gasLimit: config.wallet.gasLimit

            }).on('transactionHash', async hash => {
                txHash = hash
                console.log('txHash', hash)
                wallet.clear()
                await transactionHistoriesModel.updateOne({
                    txHash: tx.sourceTxHash,
                }, {
                    $set: {
                        txHash: hash,
                        status: 'processing',
                        sourceTxHash: tx.sourceTxHash
                    }
                })

                await exchangeTransactionsModel.updateOne({
                    _id: tx._id
                }, {
                    status: 'processing'
                })
                //replace txHash with this txHash
            })
        }
    } catch (err) {
        console.log(err.message)
        await transactionHistoriesModel.updateOne({
            txHash: tx.sourceTxHash,
        }, {
            $set: {
                //txHash: hash,
                status: 'error-2',
                //sourceTxHash: tx.sourceTxHash
                reason: err.message
            }
        })

        await exchangeTransactionsModel.updateOne({
            _id: tx._id
        }, {
            status: 'error',
            reason: err.message
        })
    }

}

async function sendBTC(tx) {
    try {

        let txCheck = await exchangeTransactionsModel.findOne({
            "_id": tx._id
        }).lean().exec()

        if (txCheck.status == 'in queue') {
            //truncate - only 8 decimals are allowed
            tx.targetAmount = Number(tx.targetAmount) * (10 ** 8)
            tx.targetAmount = Math.trunc(tx.targetAmount)
            tx.targetAmount = Number(tx.targetAmount) / (10 ** 6)


            let method = "sendtoaddress"
            let params = [tx.to, tx.targetAmount]


            let response = await rpc.postAsync(method, params)

            if (response.error == null) {
                await transactionHistoriesModel.updateOne({
                    txHash: tx.sourceTxHash,
                }, {
                    $set: {
                        txHash: response.result,
                        status: 'processing',
                        sourceTxHash: tx.sourceTxHash,

                    }
                })

                await exchangeTransactionsModel.updateOne({
                    _id: tx._id
                }, {
                    status: 'processing'
                })
            }
        }

    } catch (err) {
        console.log(err.message)
        await transactionHistoriesModel.updateOne({
            txHash: tx.sourceTxHash,
        }, {
            $set: {
                //txHash: hash,
                status: 'error-2',
                //sourceTxHash: tx.sourceTxHash
                reason: err.message
            }
        })

        await exchangeTransactionsModel.updateOne({
            _id: tx._id
        }, {
            status: 'error',
            reason: err.message
        })
    }
}

async function sendBCH(tx) {
    try {

        let txCheck = await exchangeTransactionsModel.findOne({
            "_id": tx._id
        }).lean().exec()

        if (txCheck.status == 'in queue') {
            //truncate - only 8 decimals are allowed
            tx.targetAmount = Number(tx.targetAmount) * (10 ** 8)
            tx.targetAmount = Math.trunc(tx.targetAmount)
            tx.targetAmount = Number(tx.targetAmount) / (10 ** 6)

            let method = "sendtoaddress"
            let params = [tx.to, tx.targetAmount]

            await exchangeTransactionsModel.updateOne({
                _id: tx._id
            }, {
                status: 'processing'
            })

            let response = await rpc.BCHpostAsync(method, params)

            if (response.error == null) {
                await transactionHistoriesModel.updateOne({
                    txHash: tx.sourceTxHash,
                }, {
                    $set: {
                        txHash: response.result,
                        status: 'processing',
                        sourceTxHash: tx.sourceTxHash
                    }
                })

                /*             await exchangeTransactionsModel.updateOne({
                                _id: tx._id
                            }, {
                                status: 'processing'
                            }) */
            }
        }

    } catch (err) {
        console.log(err.message)
        await transactionHistoriesModel.updateOne({
            txHash: tx.sourceTxHash,
        }, {
            $set: {
                //txHash: hash,
                status: 'error-2',
                //sourceTxHash: tx.sourceTxHash
                reason: err.message
            }
        })

        await exchangeTransactionsModel.updateOne({
            _id: tx._id
        }, {
            status: 'error',
            reason: err.message
        })
    }
}

async function sendToken(tx) {
    let txHash;
    try {

        let txCheck = await exchangeTransactionsModel.findOne({
            "_id": tx._id
        }).lean().exec()

        if (txCheck.status == 'in queue') {

            let wallet = web3.eth.accounts.wallet
            wallet.clear()
            wallet = wallet.create(0)
            wallet.add(config.wallet[tx.target].privKey)

            let contractAddres = await getTokenContract(tx.target)

            if (tx.to == undefined) {
                throw {
                    'message': 'invalid to address'
                }
            }

            let instance = await new web3.eth.Contract(ABI, contractAddres)
            let tokenDecimal = await getTokenDecimal(tx.target)

            if (String(tx.targetAmount).indexOf('.') > -1) {
                tx.targetAmount = Number(tx.targetAmount) * (10 ** 6) //raise to 10 power 6
                tx.targetAmount = Math.trunc(tx.targetAmount) //remove digits after decimal point
                tokenDecimal -= 6 //reduce the decimalPoint digits
            }

            let amountAsBn = web3.utils.toBN(tx.targetAmount)
            let BN10 = web3.utils.toBN(10)
            let decimalBN = web3.utils.toBN(tokenDecimal)
            let decimalUnitsBN = BN10.pow(decimalBN)
            let amountToTransfer = amountAsBn.mul(decimalUnitsBN)

            //let targetAmount = Number(tx.targetAmount) * (10 ** Number(tokenDecimal))
            let targetAmount = amountToTransfer;

            instance.methods.transfer(tx.to, targetAmount).send({
                    from: wallet[0].address,
                    gas: config.wallet.gasLimit
                })
                .on('transactionHash', async hash => {
                    txHash = hash
                    await transactionHistoriesModel.updateOne({
                        txHash: tx.sourceTxHash,
                    }, {
                        $set: {
                            txHash: hash,
                            status: 'processing',
                            sourceTxHash: tx.sourceTxHash
                        }
                    })

                    await exchangeTransactionsModel.updateOne({
                        _id: tx._id
                    }, {
                        status: 'processing'
                    })


                })
        }
    } catch (err) {
        console.log(err.message)
        await transactionHistoriesModel.updateOne({
            txHash: tx.sourceTxHash,
        }, {
            $set: {
                //txHash: hash,
                status: 'error-2',
                //sourceTxHash: tx.sourceTxHash
                reason: err.message
            }
        })

        await exchangeTransactionsModel.updateOne({
            _id: tx._id
        }, {
            status: 'error-2',
            reason: err.message
        })
    }


}

async function sendXRP(tx) {

    try {
        let txCheck = await exchangeTransactionsModel.findOne({
            "_id": tx._id
        }).lean().exec()

        if (txCheck.status == 'in queue') {
            await walletModel.updateOne({
                'email': tx.email
            }, {
                $inc: {
                    'xrp.balance': Number(tx.targetAmount)
                }
            }).exec()


            await transactionHistoriesModel.updateOne({
                _id: tx.dbId
            }, {
                $set: {
                    //txHash: result.tx_json.hash,
                    status: 'completed',
                    sourceTxHash: tx.sourceTxHash
                }
            })

            await exchangeTransactionsModel.updateOne({
                _id: tx._id
            }, {
                status: 'processing'
            })



            await sendPushNotification({
                userEmail: tx.email,
                type: 'Exchange Completed',
                message: `Exchange of ${tx.sourceAmount} ${tx.source}  for ${tx.targetAmount} ${tx.target} is completed.`

            })

        }
    } catch (err) {
        console.log(err)
        await exchangeTransactionsModel.updateOne({
            _id: tx._id
        }, {
            status: 'error-2',
            reason: err.message
        })
    }

    /*     try {

            let destinationTag = tx.extraId

            let from = depositAddressTemp

            if (rippleApi.isConnected() == false) {
                throw "ripple api is not connected"
            }

            let txObject = {
                "source": {
                    "address": from,
                    "amount": {
                        "value": String(tx.targetAmount),
                        "currency": "XRP",
                    }
                },
                "destination": {
                    "address": to,
                    "minAmount": {
                        "value": String(tx.targetAmount),
                        "currency": "XRP",
                    },
                    //"tag": Number(destinationTag)
                },
                //"DestinationTag": Number(destinationTag)
            }

            if (destinationTag != undefined && destinationTag != '') {
                txObject.destination.tag = destinationTag
            }

            let unsignedTransaction = await rippleApi.preparePayment(from, txObject)

            let adminKeypair = keyPairs.deriveKeypair(config.seed)

            let signedTransaction = await rippleApi.sign(unsignedTransaction.txJSON, adminKeypair)
            //console.log(signedTransaction)

            let result = await rippleApi.submit(signedTransaction.signedTransaction)


            await transactionHistoriesModel.updateOne({
                _id: tx.dbId
            }, {
                $set: {
                    txHash: result.tx_json.hash,
                    status: 'processing',
                    sourceTxHash: tx.sourceTxHash
                }
            })

            console.log('submitted:', result)
        } catch (err) {
            console.log(err.message)
            await transactionHistoriesModel.updateOne({
                _id: tx.dbId
            }, {
                $set: {
                    //txHash: hash,
                    status: 'error-2',
                    //sourceTxHash: tx.sourceTxHash
                    reason: err.message
                }
            })
        } */
}

function getTokenContract(_currency) {
    let address;
    let contracts = config.wallet.contracts
    contracts.forEach(_contract => {
        if (_contract.symbol == _currency) {
            address = _contract.address
            return
        }
    })
    return address
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

async function sendPushNotification(params) {
    /*     console.log('sendNotification')
        console.log(params) */
    let response = await request.post(config.services.notificationService + '/pushNotificationToMobile', {
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