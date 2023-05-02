require('array-foreach-async')
const config = require('../config')
const WalletFactory = require('../lib/wallet').WalletFactory
const walletFactory = new WalletFactory(config.wallet.mnemonics, config.wallet.password, config.wallet.network)
const Web3 = require('web3')
let web3 = new Web3(new Web3.providers.HttpProvider(config.wallet.provider))
const db = require('../lib/db')
const ABI = require('../static/ecr20abi').abi
// const bitcoin = require('../lib/btc')
const https = require('https')
const rpc = require('../lib/rpc')
const request = require('../lib/network')
const promise = require('request')
const requestPromise = require('request-promise')
const walletsModel = require('../models/wallets')
const accountModel = require('../models/accountsModel')
const dataInfo = require('../cryptoMarketCap')
const TransactionHistoriesModel = require('../models/TransactionHistories')
const marketInfoModel = require('../models/marketInfo')
const walletModel = require('../models/wallets')
const exchangeTransactionsModel = require('../models/exchangeTransactions')
const xrpTransaction = require('./xrp')
const cache = require('../lib/cache')

const settingsModel = require('../models/settings')

const initializeWeb3 = async () => {
    try {
        let infuraKey = cache.getAlive('settings', 'infuraKey')
        let infuraNetwork = cache.getAlive('settings', 'infuraNetwork')

        if (infuraKey && infuraNetwork) {
            let provider = `https://${infuraNetwork.network}.infura.io/v3/${infuraKey.key}`
            web3 = new Web3(new Web3.providers.HttpProvider(provider))
        } else {
            let settings = await settingsModel.findOne({}).lean().exec()
            let provider = `https://${settings.infuraNetwork}.infura.io/v3/${settings.infuraKey}`
            web3 = new Web3(new Web3.providers.HttpProvider(provider))
            cache.create('settings', 'infuraKey', {key: settings.infuraKey}, 60 * 10 * 1000) //10 minutes
            cache.create('settings', 'infuraNetwork', {network: settings.infuraNetwork}, 60 * 10 * 1000) //10 minutes
        }

    } catch (error) {
        console.log(error)
        throw new Error(error.message)
    }
}

const getContractAddress = async (symbol) => {
    try {
        let addresses = cache.getAlive('contractAddresses', 'addr')
        // console.log("ADDRESSESSSS",addresses.addr[symbol])

        if(!addresses) {
            let settings = await settingsModel.findOne({}).lean().exec()
            addresses = settings.contractAddress[symbol]
            		// console.log("ADDRS:",addresses)
//console.log('from db')
//	console.log('fromDb', settings.contractAddress)
            cache.create('contractAddresses', 'addr', {addr: settings.contractAddress})
        } else {
//console.log('from cache')
//		console.log(addresses)
// console.log("ADDRS1:",addresses)
            addresses = addresses.addr[symbol]
        }
// console.log(addresses)

// console.log("ADDRS2:",addresses)
        return addresses

    } catch (error) {
        throw new Error(error.message)
    }
}

async function getRef() {
    try {
        let ref = cache.getAlive('settings', 'ref')
        if (!ref) {
            ref = (await settingsModel.findOne({}).lean().exec()).adminRef
            cache.create('settings', 'ref', {ref})
        } else { ref = ref.ref}
        return Number(ref)
    } catch (error) {
        throw new Error(error.message)
    }
}

async function getWallet(ref) {
    let extendedKey = walletFactory.calculateBip44ExtendedKey(ref, true);
    let privKey = extendedKey.keyPair.d.toBuffer(32);
    //    console.log("privKey", "0x" + privKey.toString("hex"))
    return "0x" + privKey.toString("hex");
}

async function sendTransaction() {

    let ref = await getRef()//Number(config.wallet.ref)
    await initializeWeb3()
    let wallet = web3.eth.accounts.wallet //.create(0)
    wallet.clear()
    wallet = wallet.create(0)
    wallet.add(await getWallet(ref))
    // console.log("PRIVA",getWallet(ref))

    let set1 = await settingsModel.findOne({})
    // console.log("INFURA",set1.infuraKey)

    let eth = await web3.eth.getBalance(config.admin.address)
    // SEND EMAIL TO ADMIN [ LOW BALANCE ]
    let contractAddr = await getContractAddress('usdt')
    let usdt = new web3.eth.Contract(ABI,contractAddr)
    let usdtBalance = String(await usdt.methods.balanceOf(wallet[0].address).call())
    // console.log("USDTBALSNCE",usdtBalance)

    let adminAcc = await accountModel.find({ adminLevel: 0 })

    adminAcc.forEach(async result => {
        if (Number(usdtBalance) / (10 ** 6) < 100000) {
            console.log("sdagfljsng")
            request.post(config.services.emailService + '/sendBalanceEmail', {
                email: result.email,
                balance: Number(usdtBalance) / (10 ** 6)
            })
        }
    })

    //     var options = {
    //     method: 'POST',
    //     uri: config.services.liquidityService + '/createTransaction',
    //     body: {
    //         user:"ae@gmail.com",
    //         source:"USDT",
    //         target:"ETH",
    //         amount:"1000",
    //         withdrawlAddress:"2414234234",
    //         withdrawlExtraId:"",
    //         sourceAddress:"",
    //         sourceExtraId:""
    //     },
    //     simple: true,
    //     json: true // Automatically stringifies the body to JSON
    // };

    // let infos = requestPromise(options)
    // .then(async function (parsedBody) {
    //     console.log("LIQUID",parsedBody)
    // })



    // let response = await requestPromise('https://api.godex.io/api/v1/transaction', {
    //     method: 'POST',
    //     body: JSON.stringify({
    //         coin_from: "BTC",
    //         coin_to: "USDT",
    //         deposit_amount: Number("10000"), //withdrawal Amount
    //         withdrawal: "",
    //         withdrawal_extra_id: "",
    //         return: "",
    //         return_extra_id: ""
    //     }),

    //     headers: {
    //         "Content-Type": "application/json",
    //         "Accept": "application/json"
    //     }
    // })

    // console.log("ewrwrwerwerwerew",response)


    let transactions = (await db.readManyAsync({
        status: 'in queue'
        /*  $or: [{
             status: 'in queue'
         }, {
             status: 'processing'
         }] */
    }, "TransactionHistories")).message

    console.log("MSG", transactions)


    if (transactions.length > 0) {
        transactions.forEach(async tx => {
            let isExchangeTransaction = false
            if (tx.status == 'processing') {
                isExchangeTransaction = true
            }

            switch (tx.source) {

                case "USD":
                    if (tx.type == 'buy' && tx.source == "USD") {
                        sendTokenAdminBuy(tx)
                    }
                    break;

                case "eth":
                    if (tx.from == 'admin') {
                        sendEthTxAdmin(tx, isExchangeTransaction)
                    }
                    if (tx.type == 'buy' && tx.source == "USD") {
                        sendTokenAdminBuy(tx)
                    }
                    else {
                        // sendEthTx(tx)
                        sendTokenFromAdmin(tx)
                    }
                    break;

                case "btc":
                    sendBtcTx(tx)
                    break;

                case "usdt":
                    if (tx.from == 'admin' && tx.source == "USD") {
                        sendTokenAdmin(tx, isExchangeTransaction)
                    }
                    else if (tx.type == 'buy') {
                        sendTokenAdminBuy(tx)
                    }
                    else {
                        // sendToken(tx, isExchangeTransaction)
                        sendTokenFromAdmin(tx)
                    }
                    break;

                case 'xaut':
                    if (tx.from == 'admin') {
                        sendTokenAdmin(tx, isExchangeTransaction)
                    }
                    else if (tx.type == 'buy' && tx.source == "USD") {
                        sendTokenAdminBuy(tx)
                    }
                    else {
                        // sendToken(tx, isExchangeTransaction)
                        sendTokenFromAdmin(tx)
                    }
                    break;

                case 'paxg':
                    if (tx.from == 'admin') {
                        sendTokenAdmin(tx, isExchangeTransaction)
                    }
                    else if (tx.type == 'buy') {
                        sendTokenAdminBuy(tx)
                    }
                    else {
                        // sendToken(tx, isExchangeTransaction)
                        sendTokenFromAdmin(tx)
                    }
                    break;

                case 'powr':
                    if (tx.from == 'admin') {
                        sendTokenAdmin(tx, isExchangeTransaction)
                    }
                    else if (tx.type == 'buy' && tx.source == "USD") {
                        sendTokenAdminBuy(tx)
                    }
                    else {
                        // sendToken(tx, isExchangeTransaction)
                        sendTokenFromAdmin(tx)
                    }
                    break;

                default: //erc20 Transanction
                    console.log('switch-case token')
                // //sendToken(tx, isExchangeTransaction)
            }
        })
    }
}

async function sendXRP(tx) {
    try {
        console.log('sendXRP')
        let response = await requestPromise.get(config.services.xrpService + '/getDepositAddress')
        //console.log(JSON.parse(response))
        let anxosDepositAddress = JSON.parse(response).message
        //console.log({anxosDepositAddress})
        await checkForEmailTX(tx)

        if (tx.targetAmount = '' || tx.isExchange == true) { //exchange transaction

            await handleXRPExchange(tx)

        } else if (tx.to == anxosDepositAddress) {

            //if 'to' address is internal address, change the values in db.
            xrpTransaction.handleInternalTransaction(tx)
        } else {
            xrpTransaction.handleExternalTransaction(tx)
        }

    } catch (err) {
        console.log(err.message)

        await TransactionHistoriesModel.updateOne({
            _id: tx._id
        }, {
            $set: {
                status: 'failed',
                reason: err.message
            }
        })
    }

}

async function handleXRPExchange(tx) {
    tx.to = config.wallet.xrp.adminAddress

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

    //set tx.target amount
    //update sender balance
    await walletModel.updateOne({
        'email': tx.email
    }, {
        $inc: {
            'xrp.balance': -Number(tx.sourceAmount),
            'xrp.fee': Number(tx.fee)
        }
    }).exec()



    let exchangeTargetAddress = await getTargetAddress(tx.email, tx.target)
    console.log(exchangeTargetAddress)
    exchangeTargetAddress = exchangeTargetAddress.address

    await TransactionHistoriesModel.updateOne({
        _id: tx._id
    }, {
        $set: {
            txHash: tx._id,
            status: 'waiting_for_confirmation',
            targetAddress: exchangeTargetAddress,
            targetAmount: tx.targetAmount
        }
    })

    console.log({
        exchangeTargetAddress,
        email: tx.email,
        source: tx.source,
        target: tx.target,
        sourceAmount: tx.sourceAmount,
        targetAmount: tx.targetAmount,
        to: exchangeTargetAddress,
        status: 'in queue',
        sourceTxHash: tx._id,
        dbId: tx._id,
        timestamp: new Date().getTime()
    })
    await exchangeTransactionsModel.create({
        email: tx.email,
        source: tx.source,
        target: tx.target,
        sourceAmount: tx.sourceAmount,
        targetAmount: tx.targetAmount,
        to: exchangeTargetAddress,
        status: 'in queue',
        sourceTxHash: tx._id,
        dbId: tx._id,
        timestamp: new Date().getTime()
    })

    // await sendPushNotification({
    //     userEmail: tx.email,
    //     type: 'Exchange Initiated',
    //     message: `Exchange of ${tx.sourceAmount} ${tx.source} is initiated.`

    // })
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

async function exchangeViaLP(tx) {
    try {
        await TransactionHistoriesModel.updateOne({
            _id: tx._id
        }, {
            $set: {
                status: 'pending',
                isLpTransaction: true
            }
        })

        let userWallets = await walletModel.findOne({ email: tx.email }).lean().exec()

        await requestPromise.post(config.services.LPService + '/exchange', {
            method: "POST",
            body: {
                sourceCoin: tx.source,
                targetCoin: tx.target,
                amount: tx.sourceAmount,
                withdrawlAddress: userWallets[tx.target].address,
                fromAddress: userWallets[tx.source].address,
                email: tx.email,
                dbId: tx._id,
                fee: tx.fee
            },
            json: true
        })


    } catch (error) {
        await TransactionHistoriesModel.updateOne({
            _id: tx._id
        }, {
            $set: {
                status: 'failed'
            }
        })
    }

}

async function sendEthTx(tx) {
    console.log(' eth')
    await initializeWeb3()
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
        console.log("from", wallet[0])
        console.log(tx)
        await web3.eth.sendTransaction({
            from: wallet[0],
            to: tx.to,
            value: web3.utils.toWei(String(tx.sourceAmount)),
            nonce: await web3.eth.getTransactionCount(wallet[0].address, "pending"),
            gasPrice: await web3.eth.getGasPrice(), //'0x1DCD65000',
            gasLimit: config.wallet.gasLimit

        }).on('transactionHash', async hash => {
            txHash = hash
            let fromAddress = wallet[0].address
            wallet.clear()
            let isTrade = tx.type == ("buy" || "sell") ? true : false
            console.log(`gotHash: ${hash}`)
            await updateTxStatus(tx._id, fromAddress, 'pending', txHash, '', isExchangeTransaction)

            if (isExchangeTransaction) {
                await sendPushNotification({
                    userEmail: tx.email,
                    type: 'Exchange Initiated',
                    message: `Exchange of ${tx.sourceAmount} ${tx.source} is initiated.`

                })
            } else {
                // await sendPushNotification({
                //     userEmail: tx.email,
                //     type: 'Transaction Initiated',
                //     message: `Transaction to ${tx.to} is pending`

                // })
            }

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
        console.log("This Er")
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

        // await sendPushNotification({
        //     userEmail: tx.email,
        //     type: 'Transaction Failed',
        //     message: `Transaction failed \n - ${readableErrorMsg}`
        //     //'ETH transaction of ' + tx.amount + 'to ' +  tx.to + ' has Errored. \n  Error: ' + err.message
        // })

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

async function updateTxStatus(dbId, from, status, hash, message = "", isExchangeTransaction) {

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
                reason: message
            }
        }, "TransactionHistories")
    }
}

async function handleExchangeTx(tx) {

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
        let params = [tx.to, amount]


        let response = await rpc.postAsync(method, params)

        //console.log(JSON.parse(response))
        //console.log('sendBTC', JSON.parse(response).result)
        //handleResponse(tx._id, from, method, params, isExchangeTransaction)

        //console.log(response)

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

                await TransactionHistoriesModel.updateOne({
                    _id: tx._id
                }, {
                    $set: {
                        status: 'pending',
                        //from: '',
                        txHash: response.result
                    }
                })

                // await sendPushNotification({
                //     userEmail: tx.email,
                //     type: 'Transaction Initiated',
                //     message: `Transaction to ${tx.to} is pending`

                // })
            }
        }
    } catch (error) {
        console.log('catch block', error) //{error: 'error', reason: ''}
    }

}

async function sendBCHTx(tx) {
    try {
        await checkForEmailTX(tx)
        let isExchangeTransaction = tx.isExchange

        let from = tx.from
        let to = tx.to

        if (isExchangeTransaction) {
            tx.to = config.wallet.bch.adminAddress

        }


        let amount = tx.sourceAmount
        let method = "sendtoaddress"
        let params = [tx.to, amount]


        let response = await rpc.BCHpostAsync(method, params)

        //console.log(JSON.parse(response))
        //console.log('sendBTC', JSON.parse(response).result)
        //handleResponse(tx._id, from, method, params, isExchangeTransaction)

        //console.log(response)

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

                await TransactionHistoriesModel.updateOne({
                    _id: tx._id
                }, {
                    $set: {
                        status: 'pending',
                        //from: '',
                        txHash: response.result
                    }
                })

                // await sendPushNotification({
                //     userEmail: tx.email,
                //     type: 'Transaction Initiated',
                //     message: `Transaction to ${tx.to} is pending`

                // })
            }
        }
    } catch (error) {
        console.log('catch block', error) //{error: 'error', reason: ''}
        await TransactionHistoriesModel.updateOne({
            _id: tx._id
        }, {
            $set: {
                status: 'failed',
                reason: error.message
                //from: '',
                // txHash: response.result
            }
        })
    }

}

async function sendTrxTx(tx, isExchangeTransaction) {
    try {

        let status = "pending"
        // handleResponse(tx._id, from, method, params, isExchangeTransaction)

        if (tx.isExchange == true) {
            status = 'waiting_for_confirmation'
            tx.to = config.wallet.trx.adminAddress

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

        if (tx.isExchange == false) {

            tx.to = await getTRXAddress(tx.to)
            let receiver = await walletsModel.findOne({
                'trx.address': tx.to
            }).lean().exec()

            receiver = receiver == null ? tx.to : receiver.email
            // await sendPushNotification({
            //     userEmail: tx.email,
            //     type: 'Transaction Initiated',
            //     message: `Transaction to ${receiver} is pending`

            // })
        } else {
            //exchange intiated notification
            // await sendPushNotification({
            //     userEmail: tx.email,
            //     type: 'Exchange Initiated',
            //     message: `Exchange of ${tx.source} is initiated`
            // })

        }

        await requestPromise({
            method: 'POST',
            uri: config.services.trxService + '/transfer',
            body: {
                ref: tx.ref,
                to: tx.to,
                value: tx.sourceAmount,
                dbId: tx._id,
                status: status
            },
            json: true
        })


    } catch (error) {
        console.log("Error", error)

        await TransactionHistoriesModel.updateOne({
            "_id": tx._id
        }, {
            $set: {
                status: 'failed'
            }
        })


        // await sendPushNotification({
        //     userEmail: tx.email,
        //     type: 'Transaction Failed',
        //     message: `Transaction to ${tx.to} Failed`

        // })
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
    await initializeWeb3()
    let wallet = web3.eth.accounts.wallet //.create(0)
    wallet.clear()
    wallet = wallet.create(0)
    wallet.add(await getWallet(tx.ref))
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

        let contractAddres = await getContractAddress(String(tx.source).toLowerCase())
        
        console.log("contractAddres", contractAddres)
        let instance = await new web3.eth.Contract(ABI, contractAddres)
        let tokenDecimal = await getTokenDecimal(tx.source)

        if (String(tx.sourceAmount).indexOf('.') > -1) {
            tx.sourceAmount = Number(tx.sourceAmount) * (10 ** 6) //raise to 10 power 6
            tx.sourceAmount = Math.trunc(tx.sourceAmount) //remove digits after decimal point
            tokenDecimal -= 6 //reduce the decimalPoint digits
        }

        let amountAsBn = web3.utils.toBN(tx.sourceAmount)
        let BN10 = web3.utils.toBN(10)
        let decimalBN = web3.utils.toBN(tokenDecimal)
        let decimalUnitsBN = BN10.pow(decimalBN)
        let amountToTransfer = amountAsBn.mul(decimalUnitsBN)

        //let targetAmount = Number(tx.targetAmount) * (10 ** Number(tokenDecimal))
        //let targetAmount = amountToTransfer;
        console.log('amountToTransfer', amountToTransfer)


        instance.methods.transfer(tx.to, amountToTransfer).send({
            from: wallet[0].address,
            gas: config.wallet.gasLimit
        })
            .on('transactionHash', async hash => {
                txHash = hash
                db.updateOneAsync({
                    _id: tx._id
                }, {
                    $set: {
                        from: wallet[0].address,
                        txHash: hash,
                        status: status
                    }
                }, "TransactionHistories")

                if (tx.isExchange == true) {
                    await sendPushNotification({
                        userEmail: tx.email,
                        type: 'Exchange Initiated',
                        //10 ** 6 is multipled before for truncating decimals.
                        message: `Exchange of ${Number(tx.sourceAmount) / 10 ** 6} ${tx.source} is initiated.`

                    })
                } else {
                    let receiver = await walletModel.findOne({
                        'eth.address': tx.to
                    }).lean().exec()

                    if (receiver != null) {
                        receiver = receiver.email
                    } else {
                        receiver = tx.to
                    }
                    // await sendPushNotification({
                    //     userEmail: tx.email,
                    //     type: 'Transaction Initiated',
                    //     message: `Transaction to ${receiver} is pending`

                    // })
                }



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

        if (tx.type == 'sell') {

            let acco = await accountModel.find({ email: tx.email })
            let fiat = Number(acco[0].fiatBalance) - Number(tx.fiatAmount) + Number(tx.payOutProfit)

            await accountModel.updateOne({ email: tx.email }, {
                $set: {
                    fiatBalance: fiat
                }
            }, {
                upsert: true
            })
        }

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
    contracts.forEach(_contract => {
        if (_contract.symbol == _currency) {
            address = _contract.address
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

async function getTRXAddress(_to) {

    let emailFormat = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.])+\.([a-zA-Z]{2,5})/
    if (emailFormat.test(_to)) {

        let userWallet = await walletsModel.findOne({
            'email': _to
        }).lean().exec()

        if (userWallet != null) {
            return userWallet.trx.address
        } else {
            return null
        }

    }

    return _to


}

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


// commented now only

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

}


// async function sendEmailNotification(params) {
//     /*     console.log('sendNotification')
//         console.log(params) */
//     let response = await requestPromise.post(config.services.emailService + '/sendBalanceEmail', {
//         method: "POST",
//         body: {
//             email: params.email,
//             message: params.message,
//             type: params.type
//         },
//         headers: {
//             'content-type': 'application/json'
//         },
//         json: true
//     })

// }

// function trimDecimals(targetAmount) {
//     if (String(targetAmount).indexOf('.') != -1) {
//         targetAmount = Number(targetAmount) * 10 ** 6
//         targetAmount = Math.trunc(targetAmount)
//         targetAmount = targetAmount / (10 ** 6)
//         return targetAmount
//     } else {
//         return targetAmount
//     }
// }




async function sendTokenAdmin(tx) {

    let ref = await getRef()//Number(config.wallet.ref)
    await initializeWeb3()
    let wallet = web3.eth.accounts.wallet //.create(0)
    wallet.clear()
    wallet = wallet.create(0)
    wallet.add(await getWallet(ref))

    // wallet.add('47136F90271DD080AFEDDC5564D1B5AF31546E2581095E276D4897EAAFEA1D87')
    // console.log("FSMGADBJAFHKJAFHAFFA",wallet[0].address)
    let txHash
    try {
        await checkForEmailTX(tx)
        console.log("tx.to", tx.to)
        let status = 'pending'

        let contractAddres = await getContractAddress(String(tx.source).toLowerCase())
        console.log("contractAddres", contractAddres)
        let instance = await new web3.eth.Contract(ABI, contractAddres)
        let tokenDecimal = await getTokenDecimal(tx.source)

        if (String(tx.sourceAmount).indexOf('.') > -1) {
            tx.sourceAmount = Number(tx.sourceAmount) * (10 ** 6) //raise to 10 power 6
            tx.sourceAmount = Math.trunc(tx.sourceAmount) //remove digits after decimal point
            tokenDecimal -= 6 //reduce the decimalPoint digits
        }

        let amountAsBn = web3.utils.toBN(tx.sourceAmount)
        let BN10 = web3.utils.toBN(10)
        let decimalBN = web3.utils.toBN(tokenDecimal)
        let decimalUnitsBN = BN10.pow(decimalBN)
        let amountToTransfer = amountAsBn.mul(decimalUnitsBN)

        //let targetAmount = Number(tx.targetAmount) * (10 ** Number(tokenDecimal))
        //let targetAmount = amountToTransfer;
        console.log('amountToTransfer', amountToTransfer)


        instance.methods.transfer(tx.to, amountToTransfer).send({
            from: wallet[0].address,
            gas: config.wallet.gasLimit
        })
            .on('transactionHash', async hash => {
                txHash = hash
                db.updateOneAsync({
                    _id: tx._id
                }, {
                    $set: {
                        from: wallet[0].address,
                        txHash: hash,
                        status: status
                    }
                }, "TransactionHistories")

                if (tx.isExchange == true) {
                    await sendPushNotification({
                        userEmail: tx.email,
                        type: 'Exchange Initiated',
                        //10 ** 6 is multipled before for truncating decimals.
                        message: `Exchange of ${Number(tx.sourceAmount) / 10 ** 6} ${tx.source} is initiated.`

                    })
                } else {
                    let receiver = await walletModel.findOne({
                        'eth.address': tx.to
                    }).lean().exec()

                    if (receiver != null) {
                        receiver = receiver.email
                    } else {
                        receiver = tx.to
                    }
                    // await sendPushNotification({
                    //     userEmail: tx.email,
                    //     type: 'Transaction Initiated',
                    //     message: `Transaction to ${receiver} is pending`

                    // })
                }



            })
    } catch (err) {
        console.log(err.message)
        db.updateOneAsync({
            _id: tx._id
        }, {
            $set: {
                from: wallet[0].address,
                status: 'failed',
                txHash: txHash,
                reason: err.message
            }
        }, "TransactionHistories")

        let acc = await accountModel.find({ email: tx.email })
        let fiat = Number(acc[0].fiatBalance) + Number(tx.fiatAmount)

        await accountModel.updateOne({ email: tx.email }, {
            $set: {
                fiatBalance: fiat
            }
        }, {
            upsert: true
        })

    }
}



async function sendEthTxAdmin(tx) {
    console.log(' eth')
    let txHash
    let ref = await getRef()//Number(config.wallet.ref)
    await initializeWeb3()
    let wallet = web3.eth.accounts.wallet //.create(0)
    wallet.clear()
    wallet = wallet.create(0)
    wallet.add(await getWallet(ref))
    let privateKey = await getWallet(ref)
    // wallet.add('47136F90271DD080AFEDDC5564D1B5AF31546E2581095E276D4897EAAFEA1D87')
    let isExchangeTransaction = tx.isExchange
    //console.log(wallet[0])
    try {

        // let newInfo = await request.post(config.services.liquidityService + '/coinInfo', {
        //     source:"USDT",
        //     target:"ETH",
        //     amount:tx.sourceAmount
        // })


        // await request.post(config.services.liquidityService + '/createTransaction',{
        //     user,
        //     source,
        //     target,
        //     amount:,
        //     withdrawlAddress:tx.to,
        //     withdrawlExtraId,
        //     sourceAddress,
        //     sourceExtraId
        // })

        // console.log("newInfo",newInfo)


        await checkForEmailTX(tx)

        console.log("tx.to", tx.to)
        console.log(tx)
        await web3.eth.sendTransaction({
            from: wallet[0],
            to: tx.to,
            value: web3.utils.toWei(String(tx.sourceAmount)),
            nonce: await web3.eth.getTransactionCount(wallet[0].address, "pending"),
            gasPrice: await web3.eth.getGasPrice(), //'0x1DCD65000',
            gasLimit: config.wallet.gasLimit

        }).on('transactionHash', async hash => {
            txHash = hash
            let fromAddress = wallet[0].address
            wallet.clear()
            let isTrade = tx.type == ("buy" || "sell") ? true : false
            console.log(`gotHash: ${hash}`)
            await updateTxStatus(tx._id, fromAddress, 'pending', txHash, '', isExchangeTransaction)





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

        let acc = await accountModel.find({ email: tx.email })
        let fiat = Number(acc[0].fiatBalance) + Number(tx.fiatAmount)

        await accountModel.updateOne({ email: tx.email }, {
            $set: {
                fiatBalance: fiat
            }
        }, {
            upsert: true
        })


        if (String(err.message).search('insufficient funds')) {
            readableErrorMsg = "Insufficient Funds"
        } else {
            readableErrorMsg = 'An error Occured'
        }

        // await sendPushNotification({
        //     userEmail: tx.email,
        //     type: 'Transaction Failed',
        //     message: `Transaction failed \n - ${readableErrorMsg}`
        //     //'ETH transaction of ' + tx.amount + 'to ' +  tx.to + ' has Errored. \n  Error: ' + err.message
        // })
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


async function sendEthTxAdminBuy(tx) {
    console.log(' eth')
    let txHash
    let wallet = web3.eth.accounts.wallet //.create(0)
    wallet.clear()
    wallet = wallet.create(0)
    wallet.add('47136F90271DD080AFEDDC5564D1B5AF31546E2581095E276D4897EAAFEA1D87')
    let isExchangeTransaction = tx.isExchange
    //console.log(wallet[0])
    try {

        await checkForEmailTX(tx)


        let data = await dataInfo.getMarketConvertData(tx.fiatAmount, "USD", "USDT")
        console.log("MARKETDATA:", data.data.quote["USDT"].price)

        var options = {
            method: 'POST',
            uri: config.services.liquidityService + '/createTransaction',
            body: {
                user: tx.email,
                source: "USDT",
                target: tx.target,
                amount: data.data.quote["USDT"].price,
                withdrawlAddress: tx.to,
                withdrawlExtraId: "",
                sourceAddress: tx.from,
                sourceExtraId: ""
            },
            simple: true,
            json: true // Automatically stringifies the body to JSON
        };

        let infos = requestPromise(options)
            .then(async function (parsedBody) {

                console.log(parsedBody)
                let deposit = parsedBody.data.depositAddress

                console.log("tx.to", tx.to)
                console.log(tx)
                await web3.eth.sendTransaction({
                    from: wallet[0],
                    to: deposit,
                    value: web3.utils.toWei(String(tx.sourceAmount)),
                    nonce: await web3.eth.getTransactionCount(wallet[0].address, "pending"),
                    gasPrice: await web3.eth.getGasPrice(), //'0x1DCD65000',
                    gasLimit: config.wallet.gasLimit

                }).on('transactionHash', async hash => {
                    txHash = hash
                    let fromAddress = wallet[0].address
                    wallet.clear()
                    let isTrade = tx.type == ("buy" || "sell") ? true : false
                    console.log(`gotHash: ${hash}`)
                    await updateTxStatus(tx._id, fromAddress, 'pending', txHash, '', isExchangeTransaction)


                    return
                })


            })
            .catch(function (err) {
                // POST failed...
                console.log("Err")
            });


    } catch (err) {
        console.log(err.message)
        let readableErrorMsg;
        let fromAddress = wallet[0].address
        wallet.clear()
        let isTrade = tx.type == ("buy" || "sell") ? true : false
        await updateTxStatus(tx._id, fromAddress, 'failed', txHash, err.message, false)

        let acc = await accountModel.find({ email: tx.email })
        let fiat = Number(acc[0].fiatBalance) + Number(tx.fiatAmount)

        await accountModel.updateOne({ email: tx.email }, {
            $set: {
                fiatBalance: fiat
            }
        }, {
            upsert: true
        })


        if (String(err.message).search('insufficient funds')) {
            readableErrorMsg = "Insufficient Funds"
        } else {
            readableErrorMsg = 'An error Occured'
        }

        // await sendPushNotification({
        //     userEmail: tx.email,
        //     type: 'Transaction Failed',
        //     message: `Transaction failed \n - ${readableErrorMsg}`
        //     //'ETH transaction of ' + tx.amount + 'to ' +  tx.to + ' has Errored. \n  Error: ' + err.message
        // })
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

// FOR BUY
async function sendTokenAdminBuy(tx) {
    try {
        var txHash

        var ref = await getRef()//Number(config.wallet.ref)
        await initializeWeb3()
        var wallet = web3.eth.accounts.wallet //.create(0)
        wallet.clear()
        wallet = wallet.create(0)
        wallet.add(await getWallet(ref))
        var privateKey = await getWallet(ref)

        console.log("Afds98741248147213", wallet[0].address)
        let ethBalance = await web3.eth.getBalance(wallet[0].address);
        if (tx.target == 'eth' && Number(tx.targetAmount) < Number(ethBalance) / (10 ** 18)) {

            await web3.eth.sendTransaction({
                from: wallet[0],
                to: tx.to,
                value: web3.utils.toWei(String(tx.targetAmount)),
                nonce: await web3.eth.getTransactionCount(wallet[0].address, "pending"),
                gasPrice: await web3.eth.getGasPrice(), //'0x1DCD65000',
                gasLimit: config.wallet.gasLimit

            }).on('transactionHash', async hash => {

                txHash = hash
                let fromAddress = wallet[0].address
                wallet.clear()
                let isTrade = tx.type == ("buy" || "sell") ? true : false
                console.log(`gotHash: ${hash}`)
                await updateTxStatus(tx._id, fromAddress, 'pending', txHash, '', false)


                return
            })

        } else if (Number(tx.targetAmount) > Number(ethBalance) / (10 ** 18)) {

            let data = await dataInfo.getMarketConvertData(tx.fiatAmount, "USD", "USDT")
            console.log("MARKETDATA:", data.data.quote["USDT"].price)
            let dataPrice = data.data.quote["USDT"].price
            let contractAddr = await getContractAddress('usdt')
            let usdt = new web3.eth.Contract(ABI,contractAddr)
            // let usdt = new web3.eth.Contract(ABI, config.wallet.contracts[0].address)

            let usdtBalance = String(await usdt.methods.balanceOf(wallet[0].address).call())

            if (Number(dataPrice) < Number(usdtBalance) / (10 ** 6)) {

                await checkForEmailTX(tx)

                let data = await dataInfo.getMarketConvertData(tx.fiatAmount, "USD", "USDT")
                console.log("MARKETDATA:", data.data.quote["USDT"].price)

                var depositAddress = '0xf65ce7833dacabd7e5c264421fe1f0521e98c0f0'

                console.log("tx.to", tx.to)
                let status = 'pending'

                //let contractAddres = await getTokenContract("usdt")
                console.log("contractAddres", contractAddres)
                let instance = await new web3.eth.Contract(ABI, contractAddr)//contractAddres)
                let tokenDecimal = await getTokenDecimal("usdt")


                tx.sourceAmount = data.data.quote["USDT"].price
                if (String(tx.sourceAmount).indexOf('.') > -1) {
                    tx.sourceAmount = Number(tx.sourceAmount) * (10 ** 6) //raise to 10 power 6
                    tx.sourceAmount = Math.trunc(tx.sourceAmount) //remove digits after decimal point
                    tokenDecimal -= 6 //reduce the decimalPoint digits
                }

                let amountAsBn = web3.utils.toBN(tx.sourceAmount)
                let BN10 = web3.utils.toBN(10)
                let decimalBN = web3.utils.toBN(tokenDecimal)
                let decimalUnitsBN = BN10.pow(decimalBN)
                let amountToTransfer = amountAsBn.mul(decimalUnitsBN)

                //let targetAmount = Number(tx.targetAmount) * (10 ** Number(tokenDecimal))
                //let targetAmount = amountToTransfer;
                console.log('amountToTransfer', amountToTransfer)


                instance.methods.transfer(depositAddress, amountToTransfer).send({
                    from: wallet[0].address,
                    gas: config.wallet.gasLimit
                })
                    .on('transactionHash', async hash => {
                        txHash = hash
                        db.updateOneAsync({
                            _id: tx._id
                        }, {
                            $set: {
                                from: wallet[0].address,
                                txHash: hash,
                                status: status
                            }
                        }, "TransactionHistories")

                        if (tx.isExchange == true) {
                            await sendPushNotification({
                                userEmail: tx.email,
                                type: 'Exchange Initiated',
                                //10 ** 6 is multipled before for truncating decimals.
                                message: `Exchange of ${Number(tx.sourceAmount) / 10 ** 6} ${tx.source} is initiated.`

                            })
                        } else {
                            let receiver = await walletModel.findOne({
                                'eth.address': tx.to
                            }).lean().exec()

                            if (receiver != null) {
                                receiver = receiver.email
                            } else {
                                receiver = tx.to
                            }
                        }
                    })

                return

            }
            else {
                let adminAcc = await accountModel.find({ adminLevel: 0 })

                adminAcc.forEach(async result => {
                    if (Number(usdtBalance) / (10 ** 6) < 100000) {
                        console.log("sdagfljsng")
                        request.post(config.services.emailService + '/sendBalanceEmail', {
                            email: result.email,
                            balance: Number(usdtBalance) / (10 ** 6)
                        })
                    }
                })


                db.updateOneAsync({
                    _id: tx._id
                }, {
                    $set: {
                        from: wallet[0].address,
                        status: 'failed',
                        txHash: txHash,
                        reason: err.message
                    }
                }, "TransactionHistories")

                let acc = await accountModel.find({ email: tx.email })
                let fiat = Number(acc[0].fiatBalance) + Number(tx.fiatAmount)

                await accountModel.updateOne({ email: tx.email }, {
                    $set: {
                        fiatBalance: fiat
                    }
                }, {
                    upsert: true
                })

                return

            }

            return

        }

        //BTC
        if (tx.target == 'btc') {

            let data = await dataInfo.getMarketConvertData(tx.fiatAmount, "USD", "USDT")
            console.log("MARKETDATA:", data.data.quote["USDT"].price)
            let dataPrice = data.data.quote["USDT"].price
            let contractAddr = await getContractAddress('usdt')
            let usdt = new web3.eth.Contract(ABI,contractAddr)

            //let usdt = new web3.eth.Contract(ABI, config.wallet.contracts[0].address)

            let usdtBalance = String(await usdt.methods.balanceOf(wallet[0].address).call())

            if (Number(dataPrice) < Number(usdtBalance) / (10 ** 6)) {

                await checkForEmailTX(tx)

                let data = await dataInfo.getMarketConvertData(tx.fiatAmount, "USD", "USDT")
                console.log("MARKETDATA:", data.data.quote["USDT"].price)

                var depositAddress = '0xf65ce7833dacabd7e5c264421fe1f0521e98c0f0'

                console.log("tx.to", tx.to)
                let status = 'pending'

/*                 let contractAddres = await getTokenContract("usdt")
                console.log("contractAddres", contractAddres) */
                let instance = await new web3.eth.Contract(ABI, contractAddr)
                let tokenDecimal = await getTokenDecimal("usdt")


                tx.sourceAmount = data.data.quote["USDT"].price
                if (String(tx.sourceAmount).indexOf('.') > -1) {
                    tx.sourceAmount = Number(tx.sourceAmount) * (10 ** 6) //raise to 10 power 6
                    tx.sourceAmount = Math.trunc(tx.sourceAmount) //remove digits after decimal point
                    tokenDecimal -= 6 //reduce the decimalPoint digits
                }

                let amountAsBn = web3.utils.toBN(tx.sourceAmount)
                let BN10 = web3.utils.toBN(10)
                let decimalBN = web3.utils.toBN(tokenDecimal)
                let decimalUnitsBN = BN10.pow(decimalBN)
                let amountToTransfer = amountAsBn.mul(decimalUnitsBN)

                //let targetAmount = Number(tx.targetAmount) * (10 ** Number(tokenDecimal))
                //let targetAmount = amountToTransfer;
                console.log('amountToTransfer', amountToTransfer)


                instance.methods.transfer(depositAddress, amountToTransfer).send({
                    from: wallet[0].address,
                    gas: config.wallet.gasLimit
                })
                    .on('transactionHash', async hash => {
                        txHash = hash
                        db.updateOneAsync({
                            _id: tx._id
                        }, {
                            $set: {
                                from: wallet[0].address,
                                txHash: hash,
                                status: status
                            }
                        }, "TransactionHistories")

                        if (tx.isExchange == true) {
                            await sendPushNotification({
                                userEmail: tx.email,
                                type: 'Exchange Initiated',
                                //10 ** 6 is multipled before for truncating decimals.
                                message: `Exchange of ${Number(tx.sourceAmount) / 10 ** 6} ${tx.source} is initiated.`

                            })
                        } else {
                            let receiver = await walletModel.findOne({
                                'eth.address': tx.to
                            }).lean().exec()

                            if (receiver != null) {
                                receiver = receiver.email
                            } else {
                                receiver = tx.to
                            }
                        }
                    })

                return

            }
            else {
                let adminAcc = await accountModel.find({ adminLevel: 0 })

                adminAcc.forEach(async result => {
                    if (Number(usdtBalance) / (10 ** 6) < 100000) {
                        console.log("sdagfljsng")
                        request.post(config.services.emailService + '/sendBalanceEmail', {
                            email: result.email,
                            balance: Number(usdtBalance) / (10 ** 6)
                        })
                    }
                })


                db.updateOneAsync({
                    _id: tx._id
                }, {
                    $set: {
                        from: wallet[0].address,
                        status: 'failed',
                        txHash: txHash,
                        reason: err.message
                    }
                }, "TransactionHistories")

                let acc = await accountModel.find({ email: tx.email })
                let fiat = Number(acc[0].fiatBalance) + Number(tx.fiatAmount)

                await accountModel.updateOne({ email: tx.email }, {
                    $set: {
                        fiatBalance: fiat
                    }
                }, {
                    upsert: true
                })

                return

            }

            return

        }



        var flag
        if (tx.target == 'usdt') {
            flag = 0
        } else if (tx.target == 'xaut') {
            flag = 1
        } else if (tx.target == 'paxg') {
            flag = 2
        }
        else if (tx.target == 'powr') {
            flag = 3
        }


        let data = await dataInfo.getMarketConvertData(tx.fiatAmount, "USD", "USDT")
        console.log("MARKETDATA:", data.data.quote["USDT"].price)
        let dataPrice = data.data.quote["USDT"].price

        let contractAddr = await getContractAddress('usdt')
        let usdt = new web3.eth.Contract(ABI,contractAddr)

        //let usdt = new web3.eth.Contract(ABI, config.wallet.contracts[0].address)

        let usdtBalance = String(await usdt.methods.balanceOf(wallet[0].address).call())

        let coinAddr = await getContractAddress(tx.target)
        let coin = new web3.eth.Contract(ABI,coinAddr)

        //let coin = new web3.eth.Contract(ABI, config.wallet.contracts[flag].address)
        let coinBalance = String(await coin.methods.balanceOf(wallet[0].address).call())
        console.log("Balance", coinBalance)

        if (Number(tx.targetAmount) < Number(coinBalance) / (10 ** 6)) {

            await checkForEmailTX(tx)
            let status = 'pending'
            let contractAddres = await getContractAddress(tx.target)

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

            instance.methods.transfer(tx.to, amountToTransfer).send({
                from: wallet[0].address,
                gas: config.wallet.gasLimit
            })
                .on('transactionHash', async hash => {
                    txHash = hash
                    db.updateOneAsync({
                        _id: tx._id
                    }, {
                        $set: {
                            from: wallet[0].address,
                            txHash: hash,
                            status: status
                        }
                    }, "TransactionHistories")

                    if (tx.isExchange == true) {
                        await sendPushNotification({
                            userEmail: tx.email,
                            type: 'Exchange Initiated',
                            //10 ** 6 is multipled before for truncating decimals.
                            message: `Exchange of ${Number(tx.sourceAmount) / 10 ** 6} ${tx.source} is initiated.`

                        })
                    } else {
                        let receiver = await walletModel.findOne({
                            'eth.address': tx.to
                        }).lean().exec()

                        if (receiver != null) {
                            receiver = receiver.email
                        } else {
                            receiver = tx.to
                        }
                    }
                })

        } else if (Number(dataPrice) < Number(usdtBalance) / (10 ** 6)) {

            await checkForEmailTX(tx)

            let data = await dataInfo.getMarketConvertData(tx.fiatAmount, "USD", "USDT")
            console.log("MARKETDATA:", data.data.quote["USDT"].price)

            var depositAddress = '0xf65ce7833dacabd7e5c264421fe1f0521e98c0f0'
            // var options = {
            //     method: 'POST',
            //     uri: config.services.liquidityService + '/createTransaction',
            //     body: {
            //         user:tx.email,
            //         source:"USDT",
            //         target:tx.target,
            //         amount:data.data.quote["USDT"].price,
            //         withdrawlAddress:tx.to,
            //         withdrawlExtraId:"",
            //         sourceAddress:tx.from,
            //         sourceExtraId:""
            //     },
            //     simple: true,
            //     json: true // Automatically stringifies the body to JSON
            // };

            // let infos = requestPromise(options)
            // .then(async function (parsedBody) {

            // console.log(parsedBody)
            // let deposit = parsedBody.data.depositAddress
            // console.log("DEPOSIT ADDRESS",deposit)

            console.log("tx.to", tx.to)
            let status = 'pending'

            let contractAddres =  await getContractAddress('usdt')
            
            console.log("contractAddres", contractAddres)
            let instance = await new web3.eth.Contract(ABI, contractAddres)
            let tokenDecimal = await getTokenDecimal("usdt")


            tx.sourceAmount = data.data.quote["USDT"].price
            if (String(tx.sourceAmount).indexOf('.') > -1) {
                tx.sourceAmount = Number(tx.sourceAmount) * (10 ** 6) //raise to 10 power 6
                tx.sourceAmount = Math.trunc(tx.sourceAmount) //remove digits after decimal point
                tokenDecimal -= 6 //reduce the decimalPoint digits
            }

            let amountAsBn = web3.utils.toBN(tx.sourceAmount)
            let BN10 = web3.utils.toBN(10)
            let decimalBN = web3.utils.toBN(tokenDecimal)
            let decimalUnitsBN = BN10.pow(decimalBN)
            let amountToTransfer = amountAsBn.mul(decimalUnitsBN)

            //let targetAmount = Number(tx.targetAmount) * (10 ** Number(tokenDecimal))
            //let targetAmount = amountToTransfer;
            console.log('amountToTransfer', amountToTransfer)


            instance.methods.transfer(depositAddress, amountToTransfer).send({
                from: wallet[0].address,
                gas: config.wallet.gasLimit
            })
                .on('transactionHash', async hash => {
                    txHash = hash
                    db.updateOneAsync({
                        _id: tx._id
                    }, {
                        $set: {
                            from: wallet[0].address,
                            txHash: hash,
                            status: status
                        }
                    }, "TransactionHistories")

                    if (tx.isExchange == true) {
                        await sendPushNotification({
                            userEmail: tx.email,
                            type: 'Exchange Initiated',
                            //10 ** 6 is multipled before for truncating decimals.
                            message: `Exchange of ${Number(tx.sourceAmount) / 10 ** 6} ${tx.source} is initiated.`

                        })
                    } else {
                        let receiver = await walletModel.findOne({
                            'eth.address': tx.to
                        }).lean().exec()

                        if (receiver != null) {
                            receiver = receiver.email
                        } else {
                            receiver = tx.to
                        }
                    }
                })


        }
        else {
            let adminAcc = await accountModel.find({ adminLevel: 0 })

            adminAcc.forEach(async result => {
                if (Number(usdtBalance) / (10 ** 6) < 100000) {
                    console.log("sdagfljsng")
                    request.post(config.services.emailService + '/sendBalanceEmail', {
                        email: result.email,
                        balance: Number(usdtBalance) / (10 ** 6)
                    })
                }
            })


            db.updateOneAsync({
                _id: tx._id
            }, {
                $set: {
                    from: wallet[0].address,
                    status: 'failed',
                    txHash: txHash,
                    reason: err.message
                }
            }, "TransactionHistories")

            let acc = await accountModel.find({ email: tx.email })
            let fiat = Number(acc[0].fiatBalance) + Number(tx.fiatAmount)

            await accountModel.updateOne({ email: tx.email }, {
                $set: {
                    fiatBalance: fiat
                }
            }, {
                upsert: true
            })



        }



        // try {

    } catch (err) {
        console.log(err.message)
        db.updateOneAsync({
            _id: tx._id
        }, {
            $set: {
                from: wallet[0].address,
                status: 'failed',
                txHash: txHash,
                reason: err.message
            }
        }, "TransactionHistories")

        let acc = await accountModel.find({ email: tx.email })
        let fiat = Number(acc[0].fiatBalance) + Number(tx.fiatAmount)

        await accountModel.updateOne({ email: tx.email }, {
            $set: {
                fiatBalance: fiat
            }
        }, {
            upsert: true
        })

    }
}




// FOR SEND
async function sendTokenFromAdmin(tx) {
    try {
        var txHash

        var ref = await getRef()//Number(config.wallet.ref)
        await initializeWeb3()
        var wallet = web3.eth.accounts.wallet //.create(0)
        wallet.clear()
        wallet = wallet.create(0)
        wallet.add(await getWallet(ref))
        var privateKey = await getWallet(ref)

        console.log("Afds98741248147213", wallet[0].address)
        let ethBalance = await web3.eth.getBalance(wallet[0].address);
        if (tx.target == 'eth' && Number(tx.targetAmount) < Number(ethBalance) / (10 ** 18)) {

            await web3.eth.sendTransaction({
                from: wallet[0],
                to: tx.to,
                value: web3.utils.toWei(String(tx.targetAmount)),
                nonce: await web3.eth.getTransactionCount(wallet[0].address, "pending"),
                gasPrice: await web3.eth.getGasPrice(), //'0x1DCD65000',
                gasLimit: config.wallet.gasLimit

            }).on('transactionHash', async hash => {

                txHash = hash
                let fromAddress = wallet[0].address
                wallet.clear()
                let isTrade = tx.type == ("buy" || "sell") ? true : false
                console.log(`gotHash: ${hash}`)
                await updateTxStatus(tx._id, fromAddress, 'pending', txHash, '', false)


                return
            })

        } else if (Number(tx.targetAmount) > Number(ethBalance) / (10 ** 18)) {

            let data = await dataInfo.getMarketConvertData(tx.fiatAmount, "USD", "USDT")
            console.log("MARKETDATA:", data.data.quote["USDT"].price)
            let dataPrice = data.data.quote["USDT"].price

            let contractAddr = await getContractAddress('usdt')
            let usdt = new web3.eth.Contract(ABI,contractAddr)

//            let usdt = new web3.eth.Contract(ABI, config.wallet.contracts[0].address)

            let usdtBalance = String(await usdt.methods.balanceOf(wallet[0].address).call())

            if (Number(dataPrice) < Number(usdtBalance) / (10 ** 6)) {

                await checkForEmailTX(tx)

                let data = await dataInfo.getMarketConvertData(tx.fiatAmount, "USD", "USDT")
                console.log("MARKETDATA:", data.data.quote["USDT"].price)

                var depositAddress = '0xf65ce7833dacabd7e5c264421fe1f0521e98c0f0'

                console.log("tx.to", tx.to)
                let status = 'pending'

                let contractAddres = await getTokenContract("usdt")
                console.log("contractAddres", contractAddres)
                let instance = await new web3.eth.Contract(ABI, contractAddr)
                let tokenDecimal = await getTokenDecimal("usdt")


                tx.sourceAmount = data.data.quote["USDT"].price
                if (String(tx.sourceAmount).indexOf('.') > -1) {
                    tx.sourceAmount = Number(tx.sourceAmount) * (10 ** 6) //raise to 10 power 6
                    tx.sourceAmount = Math.trunc(tx.sourceAmount) //remove digits after decimal point
                    tokenDecimal -= 6 //reduce the decimalPoint digits
                }

                let amountAsBn = web3.utils.toBN(tx.sourceAmount)
                let BN10 = web3.utils.toBN(10)
                let decimalBN = web3.utils.toBN(tokenDecimal)
                let decimalUnitsBN = BN10.pow(decimalBN)
                let amountToTransfer = amountAsBn.mul(decimalUnitsBN)

                //let targetAmount = Number(tx.targetAmount) * (10 ** Number(tokenDecimal))
                //let targetAmount = amountToTransfer;
                console.log('amountToTransfer', amountToTransfer)


                instance.methods.transfer(depositAddress, amountToTransfer).send({
                    from: wallet[0].address,
                    gas: config.wallet.gasLimit
                })
                    .on('transactionHash', async hash => {
                        txHash = hash
                        db.updateOneAsync({
                            _id: tx._id
                        }, {
                            $set: {
                                from: wallet[0].address,
                                txHash: hash,
                                status: status
                            }
                        }, "TransactionHistories")

                        if (tx.isExchange == true) {
                            await sendPushNotification({
                                userEmail: tx.email,
                                type: 'Exchange Initiated',
                                //10 ** 6 is multipled before for truncating decimals.
                                message: `Exchange of ${Number(tx.sourceAmount) / 10 ** 6} ${tx.source} is initiated.`

                            })
                        } else {
                            let receiver = await walletModel.findOne({
                                'eth.address': tx.to
                            }).lean().exec()

                            if (receiver != null) {
                                receiver = receiver.email
                            } else {
                                receiver = tx.to
                            }
                        }
                    })

                return

            }
            else {
                let adminAcc = await accountModel.find({ adminLevel: 0 })

                adminAcc.forEach(async result => {
                    if (Number(usdtBalance) / (10 ** 6) < 100000) {
                        console.log("sdagfljsng")
                        request.post(config.services.emailService + '/sendBalanceEmail', {
                            email: result.email,
                            balance: Number(usdtBalance) / (10 ** 6)
                        })
                    }
                })


                db.updateOneAsync({
                    _id: tx._id
                }, {
                    $set: {
                        from: wallet[0].address,
                        status: 'failed',
                        txHash: txHash,
                        reason: err.message
                    }
                }, "TransactionHistories")

                let acc = await accountModel.find({ email: tx.email })
                let fiat = Number(acc[0].fiatBalance) + Number(tx.fiatAmount)

                await accountModel.updateOne({ email: tx.email }, {
                    $set: {
                        fiatBalance: fiat
                    }
                }, {
                    upsert: true
                })

                return

            }

            return

        }

        //BTC
        if (tx.target == 'btc') {

            let data = await dataInfo.getMarketConvertData(tx.fiatAmount, "USD", "USDT")
            console.log("MARKETDATA:", data.data.quote["USDT"].price)
            let dataPrice = data.data.quote["USDT"].price

            let contractAddr = await getContractAddress('usdt')
            let usdt = new web3.eth.Contract(ABI,contractAddr)

            //let usdt = new web3.eth.Contract(ABI, config.wallet.contracts[0].address)

            let usdtBalance = String(await usdt.methods.balanceOf(wallet[0].address).call())

            if (Number(dataPrice) < Number(usdtBalance) / (10 ** 6)) {

                await checkForEmailTX(tx)

                let data = await dataInfo.getMarketConvertData(tx.fiatAmount, "USD", "USDT")
                console.log("MARKETDATA:", data.data.quote["USDT"].price)

                var depositAddress = '0xf65ce7833dacabd7e5c264421fe1f0521e98c0f0'

                console.log("tx.to", tx.to)
                let status = 'pending'

                let contractAddres = await getTokenContract("usdt")
                console.log("contractAddres", contractAddres)
                let instance = await new web3.eth.Contract(ABI, contractAddr)
                let tokenDecimal = await getTokenDecimal("usdt")


                tx.sourceAmount = data.data.quote["USDT"].price
                if (String(tx.sourceAmount).indexOf('.') > -1) {
                    tx.sourceAmount = Number(tx.sourceAmount) * (10 ** 6) //raise to 10 power 6
                    tx.sourceAmount = Math.trunc(tx.sourceAmount) //remove digits after decimal point
                    tokenDecimal -= 6 //reduce the decimalPoint digits
                }

                let amountAsBn = web3.utils.toBN(tx.sourceAmount)
                let BN10 = web3.utils.toBN(10)
                let decimalBN = web3.utils.toBN(tokenDecimal)
                let decimalUnitsBN = BN10.pow(decimalBN)
                let amountToTransfer = amountAsBn.mul(decimalUnitsBN)

                //let targetAmount = Number(tx.targetAmount) * (10 ** Number(tokenDecimal))
                //let targetAmount = amountToTransfer;
                console.log('amountToTransfer', amountToTransfer)


                instance.methods.transfer(depositAddress, amountToTransfer).send({
                    from: wallet[0].address,
                    gas: config.wallet.gasLimit
                })
                    .on('transactionHash', async hash => {
                        txHash = hash
                        db.updateOneAsync({
                            _id: tx._id
                        }, {
                            $set: {
                                from: wallet[0].address,
                                txHash: hash,
                                status: status
                            }
                        }, "TransactionHistories")

                        if (tx.isExchange == true) {
                            await sendPushNotification({
                                userEmail: tx.email,
                                type: 'Exchange Initiated',
                                //10 ** 6 is multipled before for truncating decimals.
                                message: `Exchange of ${Number(tx.sourceAmount) / 10 ** 6} ${tx.source} is initiated.`

                            })
                        } else {
                            let receiver = await walletModel.findOne({
                                'eth.address': tx.to
                            }).lean().exec()

                            if (receiver != null) {
                                receiver = receiver.email
                            } else {
                                receiver = tx.to
                            }
                        }
                    })

                return

            }
            else {
                let adminAcc = await accountModel.find({ adminLevel: 0 })

                adminAcc.forEach(async result => {
                    if (Number(usdtBalance) / (10 ** 6) < 100000) {
                        console.log("sdagfljsng")
                        request.post(config.services.emailService + '/sendBalanceEmail', {
                            email: result.email,
                            balance: Number(usdtBalance) / (10 ** 6)
                        })
                    }
                })


                db.updateOneAsync({
                    _id: tx._id
                }, {
                    $set: {
                        from: wallet[0].address,
                        status: 'failed',
                        txHash: txHash,
                        reason: err.message
                    }
                }, "TransactionHistories")

                let acc = await accountModel.find({ email: tx.email })
                let fiat = Number(acc[0].fiatBalance) + Number(tx.fiatAmount)

                await accountModel.updateOne({ email: tx.email }, {
                    $set: {
                        fiatBalance: fiat
                    }
                }, {
                    upsert: true
                })

                return

            }

            return

        }



        var flag
        if (tx.target == 'usdt') {
            flag = 0
        } else if (tx.target == 'xaut') {
            flag = 1
        } else if (tx.target == 'paxg') {
            flag = 2
        }
        else if (tx.target == 'powr') {
            flag = 3
        }


        // let data =await dataInfo.getMarketConvertData(tx.fiatAmount,"USD","USDT")
        // console.log("MARKETDATA:",data.data.quote["USDT"].price)
        // let dataPrice = data.data.quote["USDT"].price

        let contractAddr = await getContractAddress('usdt')
        let usdt = new web3.eth.Contract(ABI,contractAddr)
        //let usdt = new web3.eth.Contract(ABI, config.wallet.contracts[0].address)

        let usdtBalance = String(await usdt.methods.balanceOf(wallet[0].address).call())

        let coinAddr = await getContractAddress(tx.target)
        let coin = new web3.eth.Contract(ABI,coinAddr)

//        let coin = new web3.eth.Contract(ABI, config.wallet.contracts[flag].address)
        let coinBalance = String(await coin.methods.balanceOf(wallet[0].address).call())
        console.log("Balance", coinBalance)

        if (Number(tx.targetAmount) < Number(coinBalance) / (10 ** 6)) {

            await checkForEmailTX(tx)
            let status = 'pending'
            let contractAddres = await getTokenContract(tx.target)
            let instance = await new web3.eth.Contract(ABI, coinAddr)
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

            instance.methods.transfer(tx.to, amountToTransfer).send({
                from: wallet[0].address,
                gas: config.wallet.gasLimit
            })
                .on('transactionHash', async hash => {
                    txHash = hash
                    db.updateOneAsync({
                        _id: tx._id
                    }, {
                        $set: {
                            from: wallet[0].address,
                            txHash: hash,
                            status: status
                        }
                    }, "TransactionHistories")

                    if (tx.isExchange == true) {
                        await sendPushNotification({
                            userEmail: tx.email,
                            type: 'Exchange Initiated',
                            //10 ** 6 is multipled before for truncating decimals.
                            message: `Exchange of ${Number(tx.sourceAmount) / 10 ** 6} ${tx.source} is initiated.`

                        })
                    } else {
                        let receiver = await walletModel.findOne({
                            'eth.address': tx.to
                        }).lean().exec()

                        if (receiver != null) {
                            receiver = receiver.email
                        } else {
                            receiver = tx.to
                        }
                    }
                })

        } else if (Number(dataPrice) < Number(usdtBalance) / (10 ** 6)) {

            await checkForEmailTX(tx)

            let data = await dataInfo.getMarketConvertData(tx.fiatAmount, "USD", "USDT")
            console.log("MARKETDATA:", data.data.quote["USDT"].price)

            var depositAddress = '0xf65ce7833dacabd7e5c264421fe1f0521e98c0f0'
            // var options = {
            //     method: 'POST',
            //     uri: config.services.liquidityService + '/createTransaction',
            //     body: {
            //         user:tx.email,
            //         source:"USDT",
            //         target:tx.target,
            //         amount:data.data.quote["USDT"].price,
            //         withdrawlAddress:tx.to,
            //         withdrawlExtraId:"",
            //         sourceAddress:tx.from,
            //         sourceExtraId:""
            //     },
            //     simple: true,
            //     json: true // Automatically stringifies the body to JSON
            // };

            // let infos = requestPromise(options)
            // .then(async function (parsedBody) {

            // console.log(parsedBody)
            // let deposit = parsedBody.data.depositAddress
            // console.log("DEPOSIT ADDRESS",deposit)

            console.log("tx.to", tx.to)
            let status = 'pending'

            let contractAddres =  await getContractAddress('usdt')//await getTokenContract("usdt")
            console.log("contractAddres", contractAddres)

            
            
            let instance = await new web3.eth.Contract(ABI, contractAddres)
            let tokenDecimal = await getTokenDecimal("usdt")


            tx.sourceAmount = data.data.quote["USDT"].price
            if (String(tx.sourceAmount).indexOf('.') > -1) {
                tx.sourceAmount = Number(tx.sourceAmount) * (10 ** 6) //raise to 10 power 6
                tx.sourceAmount = Math.trunc(tx.sourceAmount) //remove digits after decimal point
                tokenDecimal -= 6 //reduce the decimalPoint digits
            }

            let amountAsBn = web3.utils.toBN(tx.sourceAmount)
            let BN10 = web3.utils.toBN(10)
            let decimalBN = web3.utils.toBN(tokenDecimal)
            let decimalUnitsBN = BN10.pow(decimalBN)
            let amountToTransfer = amountAsBn.mul(decimalUnitsBN)

            //let targetAmount = Number(tx.targetAmount) * (10 ** Number(tokenDecimal))
            //let targetAmount = amountToTransfer;
            console.log('amountToTransfer', amountToTransfer)


            instance.methods.transfer(depositAddress, amountToTransfer).send({
                from: wallet[0].address,
                gas: config.wallet.gasLimit
            })
                .on('transactionHash', async hash => {
                    txHash = hash
                    db.updateOneAsync({
                        _id: tx._id
                    }, {
                        $set: {
                            from: wallet[0].address,
                            txHash: hash,
                            status: status
                        }
                    }, "TransactionHistories")

                    if (tx.isExchange == true) {
                        await sendPushNotification({
                            userEmail: tx.email,
                            type: 'Exchange Initiated',
                            //10 ** 6 is multipled before for truncating decimals.
                            message: `Exchange of ${Number(tx.sourceAmount) / 10 ** 6} ${tx.source} is initiated.`

                        })
                    } else {
                        let receiver = await walletModel.findOne({
                            'eth.address': tx.to
                        }).lean().exec()

                        if (receiver != null) {
                            receiver = receiver.email
                        } else {
                            receiver = tx.to
                        }
                    }
                })


        }
        else {
            let adminAcc = await accountModel.find({ adminLevel: 0 })

            adminAcc.forEach(async result => {
                if (Number(usdtBalance) / (10 ** 6) < 100000) {
                    console.log("sdagfljsng")
                    request.post(config.services.emailService + '/sendBalanceEmail', {
                        email: result.email,
                        balance: Number(usdtBalance) / (10 ** 6)
                    })
                }
            })


            db.updateOneAsync({
                _id: tx._id
            }, {
                $set: {
                    from: wallet[0].address,
                    status: 'failed',
                    txHash: txHash,
                    reason: err.message
                }
            }, "TransactionHistories")

            let acc = await accountModel.find({ email: tx.email })
            let fiat = Number(acc[0].fiatBalance) + Number(tx.fiatAmount)

            await accountModel.updateOne({ email: tx.email }, {
                $set: {
                    fiatBalance: fiat
                }
            }, {
                upsert: true
            })



        }



        // try {

    } catch (err) {
        console.log(err.message)
        db.updateOneAsync({
            _id: tx._id
        }, {
            $set: {
                from: wallet[0].address,
                status: 'failed',
                txHash: txHash,
                reason: err.message
            }
        }, "TransactionHistories")

        let acc = await accountModel.find({ email: tx.email })
        //let fiat = Number(acc[0].fiatBalance) + Number(tx.fiatAmount)

        // await accountModel.updateOne({ email: tx.email }, {
        //     $set: {
        //         fiatBalance: fiat
        //     }
        // }, {
        //     upsert: true
        // })

    }
}





// async function sendTokenAdminBuyFttt(tx) {

//     let ref = Number(config.wallet.ref)
//     let wallet = web3.eth.accounts.wallet
//     wallet.clear()
//     wallet = wallet.create(0)
//     wallet.add(await getWallet(ref))
//     let privateKey  = await getWallet(ref)



//     let data =await dataInfo.getMarketConvertData(tx.fiatAmount,"USD","USDT")
//     console.log("MARKETDATA:",data.data.quote["USDT"].price)

//     var txHash
//     try {
//         await checkForEmailTX(tx)

//         if(tx.targetAmount>adminBalance){
//             if(usdtBalanceofadmin>usdtofUser){

//                 liwuidity
//             }
//             else{
//                 send email to topup 
//             }

//         }
//         else if (tx.targetAmount<adminBalance){
//             normal transfer
//         }else{
//             send email to admin to TOPUP
//         }




//         var depositAddress = '0xf65ce7833dacabd7e5c264421fe1f0521e98c0f0'
//         // var options = {
//         //     method: 'POST',
//         //     uri: config.services.liquidityService + '/createTransaction',
//         //     body: {
//         //         user:tx.email,
//         //         source:"USDT",
//         //         target:tx.target,
//         //         amount:data.data.quote["USDT"].price,
//         //         withdrawlAddress:tx.to,
//         //         withdrawlExtraId:"",
//         //         sourceAddress:tx.from,
//         //         sourceExtraId:""
//         //     },
//         //     simple: true,
//         //     json: true // Automatically stringifies the body to JSON
//         // };

//         // let infos = requestPromise(options)
//         // .then(async function (parsedBody) {

//             // console.log(parsedBody)
//             // let deposit = parsedBody.data.depositAddress
//             // console.log("DEPOSIT ADDRESS",deposit)

//             console.log("tx.to", tx.to)
//             let status = 'pending'

//             let contractAddres = await getTokenContract("usdt")
//             console.log("contractAddres", contractAddres)
//             let instance = await new web3.eth.Contract(ABI, contractAddres)
//             let tokenDecimal = await getTokenDecimal("usdt")


//             tx.sourceAmount = data.data.quote["USDT"].price
//             if (String(tx.sourceAmount).indexOf('.') > -1) {
//                 tx.sourceAmount = Number(tx.sourceAmount) * (10 ** 6) //raise to 10 power 6
//                 tx.sourceAmount = Math.trunc(tx.sourceAmount) //remove digits after decimal point
//                 tokenDecimal -= 6 //reduce the decimalPoint digits
//             }

//             let amountAsBn = web3.utils.toBN(tx.sourceAmount)
//             let BN10 = web3.utils.toBN(10)
//             let decimalBN = web3.utils.toBN(tokenDecimal)
//             let decimalUnitsBN = BN10.pow(decimalBN)
//             let amountToTransfer = amountAsBn.mul(decimalUnitsBN)

//             //let targetAmount = Number(tx.targetAmount) * (10 ** Number(tokenDecimal))
//             //let targetAmount = amountToTransfer;
//             console.log('amountToTransfer', amountToTransfer)


//             instance.methods.transfer(depositAddress, amountToTransfer).send({
//                 from: wallet[0].address,
//                 gas: config.wallet.gasLimit
//             })
//                 .on('transactionHash', async hash => {
//                     txHash = hash
//                     db.updateOneAsync({
//                         _id: tx._id
//                     }, {
//                         $set: {
//                             from: wallet[0].address,
//                             txHash: hash,
//                             status: status
//                         }
//                     }, "TransactionHistories")

//                     if (tx.isExchange == true) {
//                         await sendPushNotification({
//                             userEmail: tx.email,
//                             type: 'Exchange Initiated',
//                             //10 ** 6 is multipled before for truncating decimals.
//                             message: `Exchange of ${Number(tx.sourceAmount) / 10 ** 6} ${tx.source} is initiated.`

//                         })
//                     } else {
//                         let receiver = await walletModel.findOne({
//                             'eth.address': tx.to
//                         }).lean().exec()

//                         if (receiver != null) {
//                             receiver = receiver.email
//                         } else {
//                             receiver = tx.to
//                         }
//                         // await sendPushNotification({
//                         //     userEmail: tx.email,
//                         //     type: 'Transaction Initiated',
//                         //     message: `Transaction to ${receiver} is pending`

//                         // })
//                     }



//                 })
//         // })
//         // .catch(function (err) {
//         //     // POST failed...
//         //     console.log("Err")
//         // });



//     } catch (err) {
//         console.log(err.message)
//         db.updateOneAsync({
//             _id: tx._id
//         }, {
//             $set: {
//                 from: wallet[0].address,
//                 status: 'failed',
//                 txHash: txHash,
//                 reason: err.message
//             }
//         }, "TransactionHistories")

//         let acc = await accountModel.find({email:tx.email})
//         let fiat = Number(acc[0].fiatBalance) + Number(tx.fiatAmount)

//         await accountModel.updateOne({email:tx.email},{
//             $set:{
//                 fiatBalance: fiat
//             }
//         },{
//             upsert:true
//         })

//     }
// }








// async function Liquidity(tx) {
//     var wallet = web3.eth.accounts.wallet //.create(0)
//     wallet.clear()
//     wallet = wallet.create(0)
//     wallet.add('47136F90271DD080AFEDDC5564D1B5AF31546E2581095E276D4897EAAFEA1D87')
//     console.log("FSMGADBJAFHKJAFHAFFA",wallet[0].address)
//     var txHash
//     try {
//         await checkForEmailTX(tx)

//         // let info = await request.post(config.services.userService + '/detail/convertPricess',{
//         //     amount:tx.fiatAmount,
//         //     from:"USD",
//         //     to:"USDT"
//         // }).then(async function(result){
//         //     let Price = result.message.marketData.quote["USDT"].price
//         //     console.log("Price",Price)
//         // })

//         let data =await dataInfo.getMarketConvertData(tx.fiatAmount,"USD","USDT")
//         console.log("MARKETDATA:",data.data.quote["USDT"].price)

//         var options = {
//             method: 'POST',
//             uri: config.services.liquidityService + '/createTransaction',
//             body: {
//                 user:tx.email,
//                 source:"USDT",
//                 target:tx.target,
//                 amount:data.data.quote["USDT"].price,
//                 withdrawlAddress:tx.to,
//                 withdrawlExtraId:"",
//                 sourceAddress:tx.from,
//                 sourceExtraId:""
//             },
//             simple: true,
//             json: true // Automatically stringifies the body to JSON
//         };

//         let infos = requestPromise(options)
//         .then(async function (parsedBody) {

//             console.log(parsedBody)
//             let deposit = parsedBody.data.depositAddress
//             console.log("DEPOSIT ADDRESS",deposit)

//             console.log("tx.to", tx.to)
//             let status = 'pending'

//             let contractAddres = await getTokenContract(tx.source)
//             console.log("contractAddres", contractAddres)
//             let instance = await new web3.eth.Contract(ABI, contractAddres)
//             let tokenDecimal = await getTokenDecimal(tx.source)


//             tx.sourceAmount = Price
//             if (String(tx.sourceAmount).indexOf('.') > -1) {
//                 tx.sourceAmount = Number(tx.sourceAmount) * (10 ** 6) //raise to 10 power 6
//                 tx.sourceAmount = Math.trunc(tx.sourceAmount) //remove digits after decimal point
//                 tokenDecimal -= 6 //reduce the decimalPoint digits
//             }

//             let amountAsBn = web3.utils.toBN(tx.sourceAmount)
//             let BN10 = web3.utils.toBN(10)
//             let decimalBN = web3.utils.toBN(tokenDecimal)
//             let decimalUnitsBN = BN10.pow(decimalBN)
//             let amountToTransfer = amountAsBn.mul(decimalUnitsBN)

//             //let targetAmount = Number(tx.targetAmount) * (10 ** Number(tokenDecimal))
//             //let targetAmount = amountToTransfer;
//             console.log('amountToTransfer', amountToTransfer)


//             instance.methods.transfer(deposit, amountToTransfer).send({
//                 from: wallet[0].address,
//                 gas: config.wallet.gasLimit
//             })
//                 .on('transactionHash', async hash => {
//                     txHash = hash
//                     db.updateOneAsync({
//                         _id: tx._id
//                     }, {
//                         $set: {
//                             from: wallet[0].address,
//                             txHash: hash,
//                             status: status
//                         }
//                     }, "TransactionHistories")

//                     if (tx.isExchange == true) {
//                         await sendPushNotification({
//                             userEmail: tx.email,
//                             type: 'Exchange Initiated',
//                             //10 ** 6 is multipled before for truncating decimals.
//                             message: `Exchange of ${Number(tx.sourceAmount) / 10 ** 6} ${tx.source} is initiated.`

//                         })
//                     } else {
//                         let receiver = await walletModel.findOne({
//                             'eth.address': tx.to
//                         }).lean().exec()

//                         if (receiver != null) {
//                             receiver = receiver.email
//                         } else {
//                             receiver = tx.to
//                         }
//                         // await sendPushNotification({
//                         //     userEmail: tx.email,
//                         //     type: 'Transaction Initiated',
//                         //     message: `Transaction to ${receiver} is pending`

//                         // })
//                     }



//                 })
//         })
//         .catch(function (err) {
//             // POST failed...
//             console.log("Err")
//         });



//     } catch (err) {
//         console.log(err.message)
//         db.updateOneAsync({
//             _id: tx._id
//         }, {
//             $set: {
//                 from: wallet[0].address,
//                 status: 'failed',
//                 txHash: txHash,
//                 reason: err.message
//             }
//         }, "TransactionHistories")

//         let acc = await accountModel.find({email:tx.email})
//         let fiat = Number(acc[0].fiatBalance) + Number(tx.fiatAmount)

//         await accountModel.updateOne({email:tx.email},{
//             $set:{
//                 fiatBalance: fiat
//             }
//         },{
//             upsert:true
//         })

//     }
// }



module.exports = {
    sendTransaction
}
