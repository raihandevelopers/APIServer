const Web3 = require('web3')
const config = require('../config')
const db = require('../lib/db')
const web3Key = config.wallet.web3Key
const ABI = require('../static/ecr20abi').abi
let abiDecoder = require('abi-decoder')
abiDecoder.addABI(ABI)
let providerUrl = config.wallet.network == 'livenet' ? `wss://mainnet.infura.io/ws/v3/${web3Key}` : `wss://mainnet.infura.io/ws/v3/${web3Key}`
const web3 = new Web3(new Web3.providers.WebsocketProvider(providerUrl))
const controller = require('./cron-lib/ethController')
require('array-foreach-async')

init()

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

    console.log(contracts)
    /*     let block = await web3.eth.getBlock('latest')
        console.log(block) */
    web3.eth.subscribe('newBlockHeaders').on('data', async blockHeader => {
        console.log('checking Block')
        let block = await web3.eth.getBlock('latest')
        console.log(block)
        block.transactions.forEach(async txHash => {
            let tx = await web3.eth.getTransaction(txHash)
            let wallets = await getWalletAddress()

            if (wallets.indexOf(tx.to) >= 0) {
                /* ||  wallets.indexOf(tx.from) >= 0 change this to array of contractAddress*/ //){
                console.log('to address found', tx.to)
                let user = (await db.readFromDBAsync({
                    'wallets.eth': tx.to
                }, "accounts")).message

                if (isExchangeTransaction(tx.hash)) {
                    await db.updateOneAsync({
                        internalTxId: tx.hash
                    }, {
                        $set: {
                            status: 'completed'
                        }

                    }, "TransactionHistories")
                } else {

                }

                await db.insert({
                    from: tx.from,
                    to: tx.to,
                    source: 'eth',
                    target: 'eth',
                    fromAmount: tx.value,
                    toAmount: tx.value,
                    status: 'completed',
                    error: 'nil',
                    txHash: tx.hash,
                    type: 'received',
                    email: user.email,
                    txId: tx.hash
                }, "TransactionHistories")

                let balance = await web3.eth.getBalance(tx.to)
                db.updateOneAsync({
                    email: user.email
                }, {
                    $set: {
                        eth: balance
                    }
                }, "wallets")

            } else if (contracts.indexOf(tx.to) >= 0) {
                // ERC20 Transaction
                //console.log('contract address found', tx.to)
                let contractData = config.wallet.contracts[contracts.indexOf(tx.to)]
                let txReceipt = await web3.eth.getTransactionReceipt(tx.hash)
                let events = (abiDecoder.decodeLogs(txReceipt.logs))

                let user
                let extractedEvent = {}
                let tokenName = findTokenName(tx.to)
                let senderBalance, receiverBalance
                events.forEach(async _event => {
                    if (_event["name"] == "Transfer") {

                        _event.events.forEach(param => {
                            extractedEvent[param.name] = param.value
                        })

                        if (extractedEvent.to != contractData.adminAddress) {
                            user = (await db.readFromDBAsync({
                                'wallets.eth': extractedEvent.to
                            }, "accounts")).message




                            await db.insert({
                                from: extractedEvent.from,
                                to: extractedEvent.to,
                                source: tokenName,
                                target: tokenName,
                                fromAmount: extractedEvent.value,
                                toAmount: extractedEvent.value,
                                status: 'completed',
                                error: 'nil',
                                txHash: tx.hash,
                                type: 'received',
                                email: user.email,
                                txId: tx.hash
                            }, "TransactionHistories")
                        } else {
                            //address is admin's
                            controller.handleAdminAddressTransaction(tx)
                            user.email = "admin"
                        }

                    }
                })

                //update sender/receivers token balance
                let erc20 = new web3.eth.Contract(ABI, tx.to)
                senderBalance = String(await erc20.methods.balanceOf(tx.from).call())
                receiverBalance = String(await erc20.methods.balanceOf(extractedEvent.to).call())

                let senderAccount = (await db.readFromDBAsync({
                    'wallets.eth': tx.from
                }, "accounts")).message

                await db.updateOneAsync({
                    email: user.email
                }, {
                    tokenName: receiverBalance
                }, "wallets")

                await db.updateOneAsync({
                    email: senderAccount.email
                }, {
                    tokenName: senderBalance
                }, "wallets")

                if (user.email != 'admin') {
                    let instance = new web3.eth.Contract(ABI, tx.to)
                    let balance = await instance.methods.balanceOf(extractedEvent.to).call()
                    db.updateOneAsync({
                        email: user.email
                    }, {
                        $set: {
                            tokenName: balance
                        }
                    }, "wallets")
                }

            }
            if (wallets.indexOf(tx.from) >= 0) {
                // Transaction sent from wallet got confirmed
                console.log('Transaction Confirmed:', tx.hash)

                let txn = (await db.readFromDBAsync({
                    'txHash': tx.hash
                }, "accounts")).message

                let status, internalType, internalStatus = 'completed'
                /*                 if(txn.internalType == 'trade'){
                                    status = "processing"
                                    internalStatus = 'processing',
                                    internalType = 'trade_completed'
                                }else{
                                    status = 'confirmed'
                                    internalStatus = 'completed',
                                    internalType = 'completed'
                                } */

                await db.updateOneAsync({
                    "txHash": tx.hash
                }, {
                    $set: {
                        status: status,
                        internalStatus: internalStatus,
                        internalType: internalType
                    }
                }, "TransactionHistories")

                let balance = await web3.eth.getBalance(tx.from)

                let user = (await db.readFromDBAsync({
                    'wallets.eth': tx.from
                }, "accounts")).message

                db.updateOneAsync({
                    email: user.email
                }, {
                    $set: {
                        eth: balance
                    }
                }, "wallets")

            }

        });
    }).on('error', err => {
        console.log(err)
    })


    async function isExchangeTransaction(txHash) {
        let result = (await db.readFromDBAsync({
            internalTxId: txHash
        }, "TransactionHistories")).message
        if (result == null || undefined || '') {
            return false
        }
        return true
    }

    async function getWalletAddress() {
        let userList = (await db.readManyAsync({}, "accounts")).message

        //console.log(userList)
        let wallets = []
        userList.forEach(user => {
            wallets.push(user.wallets.eth)
        })

        return wallets

    }

    function findTokenName(address) {
        let contracts = config.wallet.contracts
        contracts.forEach(_contract => {
            if (_contract.address == address) {
                return _contract.name
            }
        })
    }

}