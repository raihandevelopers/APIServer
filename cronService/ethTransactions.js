const Web3 = require('web3')
const config = require('./config')
const requesti = require('./lib/network')
const db = require('./lib/db')
const ABI = require('./static/ecr20abi').abi
let abiDecoder = require('abi-decoder')
abiDecoder.addABI(ABI)
const web3Key = config.wallet.web3Key
var options = {
    timeout: 30000, // ms

    // Useful for credentialed urls, e.g: ws://username:password@localhost:8546
    /* headers: {
    authorization: 'Basic username:password'
    },*/

    // Useful if requests result are large
    clientConfig: {
        maxReceivedFrameSize: 100000000, // bytes - default: 1MiB
        maxReceivedMessageSize: 100000000, // bytes - default: 8MiB
    },

    // Enable auto reconnection
    reconnect: {
        auto: true,
        delay: 5000, // ms
        maxAttempts: 5,
        onTimeout: false
    }
};


let providerUrl = `wss://mainnet.infura.io/ws/v3/${web3Key}` //config.wallet.network == 'livenet' ? `wss://mainnet.infura.io/ws/v3/${web3Key}` : `wss://mainnet.infura.io/ws/v3/${web3Key}`
let providerUrl2 = `wss://mainnet.infura.io/ws/v3/${config.wallet.web3Keys.key2}`
let providerUrl3 = `wss://eth-mainnet.ws.alchemyapi.io/v2/eYZjTySgegD1KYmtdqMqeYYAX-wzQrPX`//'wss://eth-mainnet.ws.alchemyapi.io/v2/yYklSv-B8Iavt94N8TMa7GqY_FiwLOwY'//`wss://mainnet.infura.io/ws/v3/${config.wallet.web3Keys.key3}`
let providerUrl4 = `wss://mainnet.infura.io/ws/v3/${config.wallet.web3Keys.key4}`

let providerBackupUrl2 = `wss://mainnet.infura.io/ws/v3/${config.wallet.web3Keys.backups.key2}`
let providerBackupUrl3 = `wss://mainnet.infura.io/ws/v3/${config.wallet.web3Keys.backups.key3}`
let providerBackupUrl4 = `wss://mainnet.infura.io/ws/v3/${config.wallet.web3Keys.backups.key4}`
let providerBackupUrl5 = `wss://mainnet.infura.io/ws/v3/${config.wallet.web3Keys.backups.key5}`
let providerBackupUrl6 = `wss://mainnet.infura.io/ws/v3/${config.wallet.web3Keys.backups.key6}`

const web3 = new Web3(new Web3.providers.WebsocketProvider(providerUrl, options))


const web3_instance2 = new Web3(new Web3.providers.WebsocketProvider(providerUrl2, options))
const web3_instance3 = new Web3(new Web3.providers.WebsocketProvider(providerUrl3, options))
const web3_instance4 = new Web3(new Web3.providers.WebsocketProvider(providerUrl4, options))

const web3_backupInstance2 = new Web3(new Web3.providers.WebsocketProvider(providerBackupUrl2, options))
const web3_backupInstance3 = new Web3(new Web3.providers.WebsocketProvider(providerBackupUrl3, options))
const web3_backupInstance4 = new Web3(new Web3.providers.WebsocketProvider(providerBackupUrl4, options))
const web3_backupInstance5 = new Web3(new Web3.providers.WebsocketProvider(providerBackupUrl5, options))
const web3_backupInstance6 = new Web3(new Web3.providers.WebsocketProvider(providerBackupUrl6, options))

const controller = require('./cron-lib/ethController')
const requestPromise = require('request-promise')
const transactionHistoryModel = require('./models/TransactionHistories')
const exchangeTransactionsModel = require('./models/exchangeTransactions')
const accountsModel = require('./models/accountsModel')
const walletsModel = require('./models/wallets')
require('array-foreach-async')
const mongoose = require('mongoose')

mongoose.connect('mongodb://' + config.db.userName + ':' + config.db.password + '@' + config.db.host + ':' + config.db.port + '/pinkSurf').then(() => {
    init()
})

mongoose.connection.on('error', () => {
    mongoose.disconnect()
})

mongoose.connection.on('disconnected', () => {
    mongoose.connect('mongodb://' + config.db.userName + ':' + config.db.password + '@' + config.db.host + ':' + config.db.port + '/pinkSurf')
})



let TransactionsToAdd = []
let pendingTokenTransactions = []
let BlocksToCheck = []
let latestBlock
let lastCheckedBlockNumber
let initialBlock = config.receiveCron.initialBlock == '0' ? 'latest' : config.receiveCron.initialBlock
let isRunning = false

let backOff = 0
async function init() {
    let contracts = []
    let contractData = config.wallet.contracts
    contractData.forEach(_contractData => {
        contracts.push(_contractData.address)
    })


    /* let contractNames = Object.keys(contractData)
    contractNames.forEach(_contractName =>{
        contracts.push(contractData[_contractName])
    }) */

    //console.log(contracts)
    /*     let block = await     web3.eth.getBlock('latest')
        console.log(block) */
    web3.eth.subscribe('newBlockHeaders').on('data', async blockHeader => {
        if ((new Date().getTime() - backOff) > 30000) { //30 seconds backOff  infura
            console.log('\n======================= \nBlocksToCheck', BlocksToCheck.length)
            console.log('pendingTransactions :', TransactionsToAdd.length)
            console.log('lastCheckedBlockNumber', lastCheckedBlockNumber)
            //console.log(latestBlock)
            /* 
                    if (latestBlock == undefined) {
                        latestBlock = await web3.eth.getBlock(initialBlock)
                        lastCheckedBlockNumber = (latestBlock.number - 1)
                        BlocksToCheck.push(latestBlock)
                    }
    
                    latestBlock = await web3.eth.getBlock(Number(latestBlock.number) + 1)
                    if (latestBlock != null) 
                        BlocksToCheck.push(latestBlock)
    
    
                    while (latestBlock != null) {
    
                        latestBlock = await web3.eth.getBlock(Number(latestBlock.number) + 1)
                        if (latestBlock != null) {
                            BlocksToCheck.push(latestBlock)
                        }
    
                    }
    
                    if (!isRunning) {
                        await checkBlocks()
                    }
             */

            //infura


            if (latestBlock == undefined) {

                latestBlock = await web3_instance2.eth.getBlock(initialBlock, true)



                BlocksToCheck.push(latestBlock)
                lastCheckedBlockNumber = (latestBlock.number - 1)
            }

            //        let recentBlock = await web3.eth.getBlock('latest')
            try {
                latestBlock = await web3_instance2.eth.getBlock((Number(latestBlock.number) + 1),true)
            } catch (error) {
                console.log(error)
                latestBlock = await web3_backupInstance2.eth.getBlock(Number(latestBlock.number) + 1, true)
            }



            if (latestBlock == null) {
                try {
                    latestBlock = await web3_instance2.eth.getBlock(lastCheckedBlockNumber,true)
                } catch (error) {
                    console.log(error)
                    latestBlock = await web3_backupInstance2.eth.getBlock(lastCheckedBlockNumber,true)
                }

            } else {
                console.log('Latest Pending Block: ', latestBlock.number)
                BlocksToCheck.push(latestBlock)
               //if(!isRunning){
			 //checkBlocks()
	       //}

            }


        }

    }).on('error', err => {
        console.log(err)
        backOff = new Date().getTime()
        //  await wait(30000)
    })
    setInterval(() => {if (isRunning == false){checkBlocks()}},15000)
    const wait = (timeToDelay) => new Promise((resolve) => setTimeout(resolve, timeToDelay));
    var isTokenrunning = false
    
    async function checkBlocks() {
        try{
            while (BlocksToCheck.length > 0) {
                //TODO add wait()
                //await wait(2000)
                isRunning = true
                let block = BlocksToCheck[0]
                if (Number(block.number) <= Number(lastCheckedBlockNumber)) {
                    BlocksToCheck.shift()
                    break;
                } else if (Number(block.number) > Number(lastCheckedBlockNumber)) {
                    BlocksToCheck.shift()
                    console.log('checking Block: ', block.number)
                    lastCheckedBlockNumber = block.number
                    console.log("block.transactions",block.transactions.length)
                    await block.transactions.forEachAsync(async txHash => {
                        //await wait(200)
                        let tx = txHash
                       //console.log("tx",tx.hash)
                        // try {
                        //     tx = await web3_instance3.eth.getTransactionReceipt(txHash)
                        // } catch (error) {
                        //     console.log(error)
                        //     try {
                        //         tx = await web3_backupInstance3.eth.getTransactionReceipt(txHash)
                        //     } catch (error) {
                        //         console.log(error)
                        //         tx = await web3_backupInstance5.eth.getTransactionReceipt(txHash)
                                
                        //     }
    
                        // }
                        // if(tx.hash == '0x6ef4a1843ce974ed04c6c4ab427940f55bea5eee1523e5316baf8349ed6f0b9a'){
                        //     console.log("tx.to",tx.to)
                        // }
                        //tx.hash = tx.transactionHash
                        let wallets = await getWalletAddress()
                        //console.log("wallets",wallets)
                        let txFromDb = await transactionHistoryModel.findOne({
                            'txHash': tx.hash
                        }).lean().exec()
                        //console.log("txFromDb",txFromDb)
                        //console.log("tx.to",tx.to)
                        // if(tx.to && contracts.indexOf(tx.to)>=0){
                        //     console.log("tx.to",tx.to)
                        // }
                        // if(tx.to == '0xdAC17F958D2ee523a2206206994597C13D831ec7'){
                        //     console.log("tx.to",tx.to)
                        // }
                        if (txFromDb != null && txFromDb.isMoonpayTx == true) {
                            //hotFix
                            //leave this block empty
                            //don't proceed if this is a moonpayTx
    
                            // get source, target
                            //update balance
    
                        } else if (txFromDb != null && txFromDb.isLpTransaction == true) {
    
                            console.log("ASdasd")
    
                        } else if (tx.to && wallets.indexOf(await web3.utils.toChecksumAddress(tx.to)) >= 0) {
                            console.log("111111111")
                            /* ||  wallets.indexOf(tx.from) >= 0 change this to array of contractAddress*/ //){
                            console.log('Ether Transaction found', tx.to)
    
                            //console.log("dasgjsg", tx)
    
                            TransactionsToAdd.push(tx)
    
    
    
                            addEthTransaction()
    
                        } else if (tx.to && contracts.indexOf(await web3.utils.toChecksumAddress(tx.to)) >= 0) {
                            //ERC20 Transactions
                            console.log("2222222")
                            pendingTokenTransactions.push(tx)
                            if (isTokenrunning == false) {
                                await checkTokenTransaction()
                            }
    
    
                        }
    
                        if (tx.from && wallets.indexOf(await web3.utils.toChecksumAddress(tx.from)) >= 0) {
                            console.log("333333333")
                            // Transaction sent from wallet got confirmed
                            
                            console.log('Transaction Confirmed:', tx.hash)
    
                            /* let txn = (await db.readFromDBAsync({
                                'txHash': tx.hash
                            }, "accounts")).message */
    
                            let txFromDb = await transactionHistoryModel.findOne({
                                txHash: tx.hash
                            }).lean().exec()
    
                            /**
                             * Check for Exchange Transaction
                             */
    
                            //console.log('txFromDb', txFromDb)
    
                            if (txFromDb != null && txFromDb.isExchange == true) {
                                //this if block not used in pinksurf
                                //console.log('isExchange', txFromDb.isExchange)
                                if (txFromDb.status == 'waiting_for_confirmation' && txFromDb.source == "eth") {
                                    console.log('status == waiting_for_confirmation')
                                    //if status == waiting_for_confirmation it means, trasaction is sent to admin.
                                    ////create new entry in temp db
                                    await exchangeTransactionsModel.create({
                                        email: txFromDb.email,
                                        source: txFromDb.source,
                                        target: txFromDb.target,
                                        to: txFromDb.targetAddress,
                                        sourceAmount: txFromDb.sourceAmount,
                                        targetAmount: txFromDb.targetAmount,
                                        status: 'in queue',
                                        sourceTxHash: tx.hash,
                                        dbId: txFromDb._id
                                    })
    
                                    let balance = await web3.eth.getBalance(tx.from)
    
                                    if (txFromDb.admin != 'admin') {
                                        await walletsModel.updateOne({
                                            'email': txFromDb.email
                                        }, {
                                            $set: {
                                                'eth.balance': String(balance),
                                            },
                                            $inc: {
                                                'eth.fee': Number(txFromDb.fee)
                                            }
                                        })
                                    }
    
                                    // await walletsModel.updateOne({
                                    //     'email': txFromDb.email
                                    // }, {
                                    //     $set: {
                                    //         'eth.balance': String(balance),
                                    //     },
                                    //     $inc: {
                                    //         'eth.fee': Number(txFromDb.fee)
                                    //     }
                                    // })
    
                                    //commission
    
                                    //////////////////////////////////////////////////////////////
                                    //there, send the other coin, then set this transaction status to processing
                                    //set this txHash to targetCurrecnt txHash
                                    //add  sourceHash = tx.hash
    
                                } else if (txFromDb.status == 'processing' && txFromDb.target == "eth") {
                                    //if status == processing it means, the transaction is sent from admin
                                    //change it to completed.
    
                                    console.log("444444444444")
                                    let balance = await web3.eth.getBalance(txFromDb.targetAddress)
    
                                    if (txFromDb.admin != 'admin') {
    
                                        await walletsModel.updateOne({
                                            'eth.address': txFromDb.targetAddress
                                        }, {
                                            $set: {
                                                'eth.balance': String(balance)
                                            }
                                        })
                                    }
    
    
                                    await transactionHistoryModel.updateOne({
                                        txHash: tx.hash
                                    }, {
                                        $set: {
                                            status: 'completed'
                                        }
                                    })
    
                                    /* await sendPushNotification({
                                        userEmail: txFromDb.email,
                                        type: 'Exchange Completed',
                                        message: `Exchange of ${txFromDb.sourceAmount} ${txFromDb.source}  for ${txFromDb.targetAmount} ${txFromDb.target} is completed.`
    
                                    }) */
                                }
    
    
                            } else { //Normal send/Receive transaction
                                let status = 'completed'
                                console.log("555555555555555555")
                                let balance = await web3_instance2.eth.getBalance(tx.from)
    
                                let user = (await db.readFromDBAsync({
                                    'wallets.eth': tx.from
                                }, "accounts")).message
    
                                await db.updateOneAsync({
                                    $and: [{
                                        "txHash": tx.hash
                                    },
                                    {
                                        "email": user.email
                                    },
                                    ]
                                }, {
                                    $set: {
                                        status: status,
                                    }
                                }, "TransactionHistories")
    
    
                                db.updateOneAsync({
                                    email: user.email
                                }, {
                                    $set: {
                                        'eth.balance': String(balance)
                                    }
                                }, "wallets")
    
                                if (txFromDb != null) {
    
                                    if (txFromDb.admin != 'admin') {
                                        await walletsModel.updateOne({
                                            email: txFromDb.email
                                        }, {
                                            $inc: {
                                                [`eth.fee`]: Number(txFromDb.fee)
                                            }
                                        })
                                    }
    
    
    
    
                                }
                                if (contracts.indexOf(tx.to) == -1) { //Do not send notification, if it is a contract transaction
    
                                    if (txFromDb.admin != 'admin') {
                                        let receiverWallet = await walletsModel.findOne({
                                            'eth.address': tx.to
                                        }).lean().exec()
                                        let receiver;
    
                                        //hotfix  - But it'll work
                                        if (receiverWallet != null) {
                                            receiver = receiverWallet.email
                                        } else {
                                            receiver = tx.to
                                        }
                                    }
    
                                    // let receiverWallet = await walletsModel.findOne({
                                    //     'eth.address': tx.to
                                    // }).lean().exec()
                                    // let receiver;
    
                                    // //hotfix  - But it'll work
                                    // if (receiverWallet != null) {
                                    //     receiver = receiverWallet.email
                                    // } else {
                                    //     receiver = tx.to
                                    // }
    
    
                                    // await sendPushNotification({
                                    //     userEmail: user.email,
                                    //     type: 'Transaction Confirmed',
                                    //     message: `Sent ${txFromDb.sourceAmount} ETH to ${receiver}`
                                    // })
                                }
    
    
    
    
                            }
    
    
                        }
    
                    })
                    //                BlocksToCheck.shift()
                }
    
            }
            isRunning = false
        }catch{
            isRunning = false
        }
        
    }

    async function checkTokenTransaction() {
        console.log("checkTokenTransaction")
        //console.log('contract address found', tx.to)
        isTokenrunning = true
        try{
            while (pendingTokenTransactions.length > 0) {
                let tx
                try {
                        tx = await web3_instance3.eth.getTransactionReceipt(pendingTokenTransactions[0].hash)
                    } catch (error) {
                        console.log(error)
                        try {
                            tx = await web3_backupInstance3.eth.getTransactionReceipt(pendingTokenTransactions[0].hash)
                        } catch (error) {
                            console.log(error)
                            tx = await web3_backupInstance5.eth.getTransactionReceipt(pendingTokenTransactions[0].hash)
                            
                        }
    
                    }
                //let tx = pendingTokenTransactions[0] //transaction from chain
                if (tx.status == true) {
                    tx.to = web3.utils.toChecksumAddress(tx.to)
                    tx.from = web3.utils.toChecksumAddress(tx.from)
                    //console.log("tx.to",tx.to)
                    //console.log("config.wallet.contracts",config.wallet.contracts)
                    // console.log("contracts.indexOf(tx.to)",contracts.indexOf(tx.to))
                    let contractData = config.wallet.adminAddress//contracts[contracts.indexOf(tx.to)]
                    //console.log("contractData",contractData)
                    let txReceipt
                    //await wait(200)
                    txReceipt = tx
                    tx.hash = txReceipt.transactionHash
                    txReceipt.hash = txReceipt.transactionHash
                    console.log("txReceipt.hash", txReceipt.transactionHash)
                    //this uses most requests
                    // try {
                    //     txReceipt = await web3_instance4.eth.getTransactionReceipt(tx.hash)
                    // } catch (error) {
                    //     try {
                    //         txReceipt = await web3_backupInstance4.eth.getTransactionReceipt(tx.hash)    
                    //     } catch (error) {
                    //         txReceipt = await web3_backupInstance6.eth.getTransactionReceipt(tx.hash)
                    //     }
    
                    // }
                    let events = (abiDecoder.decodeLogs(txReceipt.logs))
                    let user
                    let extractedEvent = {}
                    let tokenDetails = findTokenName(tx.to)
                    let tokenDecimals = tokenDetails.decimal
                    let tokenName = tokenDetails.symbol
                    let senderBalance, receiverBalance
    
                    let txFromDb = await transactionHistoryModel.findOne({
                        txHash: tx.hash
                    }).lean().exec()
    
                    //console.log("234234234234234")
                    //console.log("Transaction From DB : ", txFromDb)
                    // console.log("events",events)
                    await events.forEachAsync(async _event => {
    
                        if (_event["name"] == "Transfer") {
                            // console.log("_event",_event)
                            await _event.events.forEachAsync(async param => {
                                extractedEvent[param.name] = param.value
                            })
    
                            extractedEvent.to = web3.utils.toChecksumAddress(extractedEvent.to)
    
                            user = (await db.readFromDBAsync({
                                'wallets.eth': web3.utils.toChecksumAddress(extractedEvent.to)
                            }, "accounts")).message
    
                            // console.log(extractedEvent)
                            if (extractedEvent.to != contractData/*.adminAddress*/ && txFromDb == null) { //txFromDb will be null if received from external
                                // user = (await db.readFromDBAsync({
                                //     'wallets.eth': extractedEvent.to
                                // }, "accounts")).message
                                //console.log("USERS", user)
                                if (user != null) {
                                    console.log("TXNS UPDATED")
    
                                    await db.insert({
                                        from: extractedEvent.from,
                                        to: extractedEvent.to,
                                        source: tokenName,
                                        target: tokenName,
                                        sourceAmount: Number(extractedEvent.value) / (10 ** tokenDecimals),
                                        targetAmount: Number(extractedEvent.value) / (10 ** tokenDecimals),
                                        status : 'completed',
                                        error: 'nil',
                                        reason: '',
                                        data: '',
                                        txHash: tx.hash,
                                        value: Number(extractedEvent.value) / (10 ** tokenDecimals),
                                        currency: tokenName,
                                        type: 'received',
                                        email: user.email,
                                        txId: tx.hash,
                                        ref: "0",
                                        timestamp: new Date().getTime()
                                    }, "TransactionHistories")
    
                                    // NEWLY
                                    // let newUser = await walletsModel.findOne({
                                    //     'eth.address': extractedEvent.from
                                    // }).lean().exec()
    
                                    // await requesti.post(config.services.emailService + '/sendTransactionEmail', {
                                    //     type: "Received",
                                    //     from: extractedEvent.from,
                                    //     source: String(Number(extractedEvent.value) / (10 ** tokenDecimals)) + String(tokenName),
                                    //     email: user.email
                                    // })
                                }
                                // await sendPushNotification({
                                //     userEmail: user.email,
                                //     type: 'Transaction Received',
                                //     message: `Received ${tokenName} from ${tx.from} `
                                // })
                            } else {
                                //address is admin's
    
    
                                //Handle Exchange Transaction
                                if (txFromDb != null && txFromDb.isExchange == true) {
                                    //this if-block not used in pinksurf
                                    if (txFromDb.status == 'waiting_for_confirmation') {
    
                                        //if status == waiting_for_confirmation it means, trasaction is sent to admin.
                                        ////create new entry in temp db
                                        await exchangeTransactionsModel.create({
                                            email: txFromDb.email,
                                            source: txFromDb.source,
                                            target: txFromDb.target,
                                            to: txFromDb.targetAddress,
                                            sourceAmount: txFromDb.sourceAmount,
                                            targetAmount: txFromDb.targetAmount,
                                            status: 'in queue',
                                            sourceTxHash: tx.hash,
                                            dbId: txFromDb._id,
                                            timestamp: new Date().getTime()
                                        })
    
                                        if (txFromDb.admin != 'admin') {
                                            await walletsModel.updateOne({
                                                email: txFromDb.email
                                            }, {
                                                $inc: {
                                                    [`${tokenName}.fee`]: Number(txFromDb.fee)
                                                }
                                            })
                                        }
    
    
                                        let erc20 = new web3.eth.Contract(ABI, tx.to)
                                        let senderBalance = String(await erc20.methods.balanceOf(extractedEvent.from).call())
    
                                        if (txFromDb.admin != 'admin') {
                                            await walletsModel.updateOne({
                                                email: txFromDb.email
                                            }, {
                                                $set: {
                                                    [`${tokenName}.balance`]: Number(senderBalance) / (10 ** tokenDecimals)
                                                }
                                            })
                                        }
    
    
                                        //commission
    
                                        //1. update sender balance
                                        /*  let erc20 = new web3.eth.Contract(ABI, tx.to) //checkTo
                                        senderBalance = String(await erc20.methods.balanceOf(tx.from).call())
         */
    
    
    
    
                                    } else if (txFromDb.status == 'processing') {
                                        //if status == processing it means, the transaction is sent from admin
                                        //1. change txStatus to completed.
                                        //2. update balance
    
                                        let erc20 = new web3.eth.Contract(ABI, tx.to)
    
                                        let receiverBalance = String(await erc20.methods.balanceOf(extractedEvent.to).call())
                                        await transactionHistoryModel.updateOne({
                                            txHash: tx.hash
                                        }, {
                                            $set: {
                                                status: 'completed'
                                            }
                                        })
    
    
                                        if (txFromDb.admin != 'admin') {
                                            await walletsModel.updateOne({
                                                email: txFromDb.email
                                            }, {
                                                $set: {
                                                    [`${tokenName}.balance`]: Number(receiverBalance) / (10 ** tokenDecimals)
                                                }
                                            })
                                        }
    
    
    
                                        await sendPushNotification({
                                            userEmail: txFromDb.email,
                                            type: 'Exchange Completed',
                                            message: `Exchange of ${txFromDb.sourceAmount} ${txFromDb.source}  for ${txFromDb.targetAmount} ${txFromDb.target} is completed.`
    
                                        })
    
                                    } else if (txFromDb.isMoonpayTx) {
    
                                        let erc20 = new web3.eth.Contract(ABI, tx.to)
    
                                        let receiverBalance = String(await erc20.methods.balanceOf(extractedEvent.to).call())
                                        await transactionHistoryModel.updateOne({
                                            txHash: tx.hash
                                        }, {
                                            $set: {
                                                status: 'completed'
                                            }
                                        })
    
    
                                        if (txFromDb.admin != 'admin') {
                                            await walletsModel.updateOne({
                                                email: txFromDb.email
                                            }, {
                                                $set: {
                                                    [`${tokenName}.balance`]: Number(receiverBalance) / (10 ** tokenDecimals)
                                                }
                                            })
                                        }
    
    
    
                                        let receivedAmount = Number(extractedEvent.value) / (10 ** tokenDecimals)
                                        await sendPushNotification({
                                            userEmail: txFromDb.email,
                                            type: 'Moonpay Transaction Completed',
                                            message: `Recceived ${receivedAmount} ${tokenName} from moonpay.`
    
                                        })
                                    }
                                    /*  controller.handleAdminAddressTransaction(tx)
                                     user.email = "admin" */
                                }
                            }
    
                        }
                    })
                    /////////////////////////
                    /////////////////////////ADded///////////////////////////////////////////
                    //find receiver enIL ADD IT BELOW
                    //console.log("extractedEvent",extractedEvent)
                    let receiverTxCheck = null
                    let receiverEmail = await walletsModel.findOne({
                        'eth.address': extractedEvent.to
                    }).lean().exec()
                    if (receiverEmail != null) {
                        receiverTxCheck = await transactionHistoryModel.findOne({
                            $and: [{
                                txHash: tx.hash
                            },
                            {
                                $or: [{
                                    to: extractedEvent.to
                                },
                                {
                                    targetAddress: extractedEvent.to
                                }
    
                                ]
                            },
                            {
                                email: receiverEmail.email
                            }
                            ]
                        }).lean().exec()
                    }
                    /*             let receiverTxCheck = await transactionHistoryModel.findOne({
                                    $and: [{
                                            txHash: tx.txHash
                                        },
                                        {
                                            to: extractedEvent.to
                                        }
                                    ]
                                }).lean().exec() */
                    if (receiverEmail != null && receiverTxCheck == null) {
                        let tokensReceived = Number(extractedEvent.value) / (10 ** tokenDecimals)
                        await transactionHistoryModel.create({
                            email: user.email,
                            from: extractedEvent.from,
                            to: extractedEvent.to,
                            source: tokenName,
                            target: tokenName,
                            sourceAmount: Number(extractedEvent.value) / (10 ** tokenDecimals),
                            targetAmount: Number(extractedEvent.value) / (10 ** tokenDecimals),
                            status: 'completed',
                            error: 'nil',
                            reason: '',
                            data: '',
                            txHash: tx.hash,
                            value: Number(extractedEvent.value) / (10 ** tokenDecimals),
                            currency: tokenName,
                            type: 'received',
                            txId: tx.hash,
                            ref: "0",
                            timestamp: new Date().getTime()
                        })
                        console.log('newly added block')
    
                        // if (txFromDb != null && txFromDb.isExchange == false) {
                        //     await sendPushNotification({
                        //         userEmail: user.email,
                        //         type: 'Transaction Confirmed',
                        //         message: `Received ${tokensReceived} ${tokenName}. `
                        //     })
                        // }
                        console.log("afvhganjfashkfm,ajgfafv")
    
                    }
                    /////////////////////////ADded///////////////////////////////////////////
    
                    if (await isInternalTransaction(tx.hash)) {
                        let a = await db.updateOneAsync({
                            $and: [{
                                txHash: tx.hash
                            },
                            {
                                $and: [{
                                    status: {
                                        $ne: 'completed'
                                    }
                                }, {
                                    status: {
                                        $ne: 'waiting_for_confirmation'
                                    }
                                }, {
                                    status: {
                                        $ne: 'processing'
                                    }
                                }]
    
                            }
                            ]
                        }, {
                            $set: {
                                status: 'completed'
                            }
    
                        }, "TransactionHistories")
                    }
    
    
    
                    if (await isExchangeTransaction(tx.hash)) {
                        await db.updateOneAsync({
                            $and: [{
                                txHash: tx.hash
                            },
                            {
                                $and: [{
                                    status: {
                                        $ne: 'completed'
                                    }
                                }, {
                                    status: {
                                        $ne: 'waiting_for_confirmation'
                                    }
                                }, {
                                    status: {
                                        $ne: 'processing'
                                    }
                                }]
    
                            }
                            ]
                        }, {
                            $set: {
                                status: 'completed'
                            }
    
                        }, "TransactionHistories")
    
                        //update balance
                        /*                 db.updateOneAsync({
                                            email: user.email
                                        }, {
                                            $set: {
                                                'eth.balance': String(balance)
                                            }
                                        }, "wallets") */
    
                        /*                 await sendPushNotification({
                                            userEmail: user.email,
                                            type: 'Transaction Confirmed',
                                            message: `Received ${tokenName} from moonpay`//${tx.from}`
                                        }) */
                    }
    
                    ////////////////////
    
    
                    //update sender/receivers token balance
                    let erc20 = new web3_instance4.eth.Contract(ABI, tx.to) //checkTo
                    senderBalance = String(await erc20.methods.balanceOf(tx.from).call())
                    //console.log("extractedEvent",extractedEvent)
                    try {
                        receiverBalance = String(await erc20.methods.balanceOf(extractedEvent.to).call())
                    } catch { }
    
                    let senderAccount = await accountsModel.findOne({
                        'wallets.eth': tx.from
                    }).lean().exec()
                    /*             let senderAccount = (await db.readFromDBAsync({
                                    'wallets.eth': tx.from
                                }, "accounts")).message */
                    if (user != null) {
                        console.log("user != null", user)
                        await walletsModel.updateOne({
                            email: user.email
                        }, {
                            $set: {
                                [`${tokenName}.balance`]: Number(receiverBalance) / (10 ** tokenDecimals)
                            }
                        })
                    }
    
    
    
                    //console.log('above sender account', senderAccount)
                    if (senderAccount != null) {
                        await db.updateOneAsync({
                            email: senderAccount.email
                        }, {
                            $set: {
                                [`${tokenName}.balance`]: Number(senderBalance) / (10 ** tokenDecimals)
                            }
                        }, "wallets")
    
                        if (txFromDb != null && txFromDb.isExchange == false) {
    
                            if (txFromDb.admin != 'admin') {
                                let receiver = await walletsModel.findOne({
                                    'eth.address': extractedEvent.to
                                }).lean().exec()
                                if (receiver != null) {
                                    receiver = receiver.email
                                } else {
                                    receiver = extractedEvent.to
                                }
                            }
    
    
                            // console.log('isExchange', txFromDb.isExchange)
                            // await sendPushNotification({
                            //     userEmail: senderAccount.email,
                            //     type: 'Transaction Confirmed',
                            //     message: `Sent ${Number(extractedEvent.value) / (10 ** tokenDecimals)} ${tokenName} to ${receiver}`
                            // })
                        }
    
                    }
    
                    if (txFromDb != null && txFromDb.isExchange == false) {
    
                        if (txFromDb.admin != 'admin') {
                            await walletsModel.updateOne({
                                email: txFromDb.email
                            }, {
                                $inc: {
                                    [`${tokenName}.fee`]: Number(txFromDb.fee)
                                }
                            })
                        }
    
                    }
                    //console.log('above User', user)
                    if (user != null && user.email != 'admin') {
                        let instance = new web3_instance4.eth.Contract(ABI, tx.to)
                        let balance = await instance.methods.balanceOf(extractedEvent.to).call()
                        if (user != null) {
                            await db.updateOneAsync({
                                email: user.email
                            }, {
                                $set: {
                                    [`${tokenName}.balance`]: Number(balance) / (10 ** tokenDecimals)
                                }
                            }, "wallets")
    
    
                        }
                    }
    
    
    
    
                    pendingTokenTransactions.shift()
                } else {
                    pendingTokenTransactions.shift()
                }
            }
            isTokenrunning = false
        }catch(e){ 
            console.log("error",e)
            isTokenrunning = false
        }
       
    }


    async function isExchangeTransaction(txHash) {

        let result = (await db.readFromDBAsync({
            txHash: txHash
        }, "TransactionHistories")).message
        if (result == null || undefined || '') {
            return false
        }
        return true
    }

    async function isInternalTransaction(Hash) {

        let result = (await db.readFromDBAsync({
            txHash: Hash
        }, "TransactionHistories")).message
        if (result == null || undefined || '') {
            return false
        }
        return true
    }

    async function getWalletAddress() {
        let userList = (await db.readManyAsync({}, "accounts")).message

        //            console.log(userList)
        let wallets = []
        userList.forEach(user => {
            //console.log(user)
            if (user.wallets) {
                wallets.push(user.wallets.eth)
            }
        })

        return wallets

    }

    function findTokenName(address) {
        let contracts = config.wallet.contracts
        let symbol;
        let contractDetails
        contracts.forEach(_contract => {
            if (String(_contract.address).toLowerCase() == String(address).toLowerCase()) {
                symbol = _contract.symbol
                contractDetails = _contract
            }
        })
        return contractDetails
    }

    async function isTransactionMine(hash, email) {
        let result = (await db.readFromDBAsync({
            $and: [{
                txHash: hash
            }, {
                email: email
            }]

        }, "TransactionHistories")).message
        if (result == null || undefined || '') {
            return false
        }
        return true
    }

    async function addEthTransaction() {

        while (TransactionsToAdd.length > 0) {
            let tx = TransactionsToAdd[0]
            tx.to = web3.utils.toChecksumAddress(tx.to)
            tx.from = web3.utils.toChecksumAddress(tx.from)
            //tx.hash = tx.transactionHash
            let user = (await db.readFromDBAsync({
                'wallets.eth': tx.to
            }, "accounts")).message
            //check for moonpayTransaction

            let txFromDb = await transactionHistoryModel.findOne({
                txHash: tx.hash
            }).lean().exec()



            if (txFromDb != null && txFromDb.status == 'processing') {
                //if status == processing it means, the transaction is sent from admin
                //change it to completed.

                let balance
                try {
                    balance = await web3_instance4.eth.getBalance(tx.to)
                } catch (error) {
                    balance = await web3_backupInstance4.eth.getBalance(tx.to)
                }


                if (txFromDb.admin != 'admin') {
                    await walletsModel.updateOne({
                        'eth.address': txFromDb.targetAddress
                    }, {
                        $set: {
                            'eth.balance': String(balance)
                        }
                    })
                }





                await transactionHistoryModel.updateOne({
                    txHash: tx.hash
                }, {
                    $set: {
                        status: 'completed'
                    }
                })

                // await sendPushNotification({
                //     userEmail: txFromDb.email,
                //     type: 'Exchange Completed',
                //     message: `Exchange of ${txFromDb.sourceAmount} ${txFromDb.source}  for ${txFromDb.targetAmount} ${txFromDb.target} is completed.`

                // })
            } else if (await isTransactionMine(tx.hash, user.email)) { //transaction not initiated from 'to address'
                let balance
                try {
                    balance = await web3_instance4.eth.getBalance(tx.to)
                } catch (error) {
                    balance = await web3_backupInstance4.eth.getBalance(tx.to)
                }

                db.updateOneAsync({
                    email: user.email
                }, {
                    $set: {
                        'eth.balance': String(balance)
                    }
                }, "wallets")


                await transactionHistoryModel.updateOne({
                    txHash: tx.hash
                }, {
                    $set: {
                        status: 'completed'
                    }
                })





                /*                 await sendPushNotification({ //commented on 09042020
                                    userEmail: user.email,
                                    type: 'Transaction Confirmed',
                                    message: `Received Ether from ${tx.from}` //${tx.from}`
                                }) */
            } else {


                //             if (isExchangeTransaction(tx.hash)) {
                // /*                 await db.updateOneAsync({
                //                     txHash: tx.hash
                //                 }, {
                //                     $set: {
                //                         status: 'completed'
                //                     }

                //                 }, "TransactionHistories") */

                //                 //update balance



                //             } 
                // let txtemp = await web3.eth.getTransaction(tx.transactionHash)
                // tx.value = txtemp.value
                await db.insert({
                    from: tx.from,
                    to: tx.to,
                    source: 'eth',
                    target: 'eth',
                    sourceAmount: web3.utils.fromWei(String(tx.value)),
                    targetAmount: web3.utils.fromWei(String(tx.value)),
                    status: 'completed',
                    error: 'nil',
                    txHash: tx.hash,
                    type: 'received',
                    email: user.email,
                    currency: 'eth',
                    data: '',
                    ref: '0',
                    reason: "",
                    value: web3.utils.fromWei(String(tx.value)),
                    txId: tx.hash,
                    timestamp: new Date().getTime()

                }, "TransactionHistories")



                await requesti.post(config.services.emailService + '/sendTransactionEmail', {
                    type: "Received",
                    from: tx.from,
                    source: String(web3.utils.fromWei(String(tx.value))) + String('ETH'),
                    email: user.email
                })

                let balance = await web3.eth.getBalance(tx.to)
                db.updateOneAsync({
                    email: user.email
                }, {
                    $set: {
                        'eth.balance': String(balance)
                    }
                }, "wallets")

                // await sendPushNotification({
                //     userEmail: user.email,
                //     type: 'Transaction Confirmed',
                //     message: `Received Ether from ${tx.from}`
                // })
            }



            TransactionsToAdd.shift()
        }

    }

    async function sendPushNotification(params) {
        /*     console.log('sendNotification')
            console.log(params) */
        try {
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

        } catch (error) {
            console.log(error)
        }

        //console.log(response.message)
        //return
    }


}
