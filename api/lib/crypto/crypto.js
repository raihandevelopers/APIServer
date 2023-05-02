const Web3 = require('web3')
const config = require('../../config')
const WalletFactory = require('../wallet').WalletFactory
const walletFactory = new WalletFactory(config.wallet.mnemonics, config.wallet.password, config.wallet.network)
const web3Provider = new Web3(new Web3.providers.HttpProvider(config.wallet.provider))
const web3 = new Web3(new Web3.providers.HttpProvider(config.wallet.provider))
const db = require('../db')
const walletsModel = require('../../models/wallets')
const transactionHistoriesModel = require('../../models/TransactionHistories')
const accountsModel = require('../../models/accountsModel');
const SUPPORTED_OPERATIONS = ['buy', 'sell']
const feeModel = require('../../models/fees')
const requesti = require('../../lib/network')
let cache = require('../cache')
const accountModel = require('../../models/accountsModel')

async function getWallet(ref) {
    let extendedKey = walletFactory.calculateBip44ExtendedKey(ref, false);
    let privKey = extendedKey.keyPair.d.toBuffer(32);
    console.log("privKey", "0x" + privKey.toString("hex"))
    return "0x" + privKey.toString("hex");
}

async function getBalance(address, name) {
    if (name != "eth") {
        let instance = new web3Provider.eth.Contract(ABI, config.Ethereum.name.address)
        let balance = await instance.getBalance(address)
        return balance.toString()
    } else {
        return web3Provider.eth.getBalance(address).toString()
    }
}

async function transferCrypto(to, amount, currency, ref, req, res, extraId = 0) {
    try {
        //let wallet = web3Provider.eth.accounts.wallet.create(0)
        //wallet.add(await getWallet(ref))

        //let feeeth = Number(String(await web3.eth.getGasPrice()))*21000
        let fee = calculateFee(amount)
        fee = fee.adminCommission
        // fee = fee.adminCommission
	console.log('inside transfer crypto')
        let isValid = await isAmountValid(req.user.email, currency, amount)
        console.log(req.user.email, currency, amount)
        if (!isValid) {

            if (currency == 'btc') {
                res.status(422).send({
                    "status": 'fail',
                    message: "Insufficient balance ",
                    error: "err"
                })
            } else if(currency == 'eth'){
                let ethgas = Number(web3.utils.fromWei(await web3.eth.getGasPrice()))*50000
                res.status(422).send({
                    "status": 'fail',
                    message: "Insufficient balance for amount + fee,  please add " + ethgas + " ETH to execute the transaction",
                    error: "err"
                })
            }
            
            
            return
        }

        /*         await walletsModel.updateOne({
                    email: req.user.email
                }, {
                    $inc: {
                        [`${currency}.fee`]: Number(fee)
                    },
                }) */

        currency = String(currency)//.toLowerCase()
        console.log(currency)
        await db.insert({
            email: req.user.email,
            ref: ref,
            from: req.user.email,
            to: to,
            source: currency,
            target: currency,
            sourceAmount: amount,
            targetAmount: amount,
            type: 'send',
            data: '',
            value: amount,
            currency: currency,
            txHash: '',
            status: 'in queue',
            error: 'nil',
            isExchange: false,
            isMoonpayTx: false,
            isLpTransaction: false,
            fee: fee,
            timestamp: String(new Date().getTime()),
            destinationTag: extraId
        }, "TransactionHistories")
        res.send({
            "status": 'success',
            message: 'Transaction Pending',
            error: "nil"
        })


    } catch (err) {
console.log('catch block')
        console.log(err)
        if (err.message = 'Insufficient Balance') {
            res.status(500).send({
                "status": 'fail',
                message: err.message,
                error: "err"
            })
        } else {
            res.status(500).send({
                "status": 'fail',
                message: "Transaction failed",
                error: "err"
            })
        }
    }

}


// async function transferCrypto(to, amount, currency, ref, req, res, extraId = 0) {
//     try {
//         //let wallet = web3Provider.eth.accounts.wallet.create(0)
//         //wallet.add(await getWallet(ref))

//         let feeinfo = await feeModel.findOne({}) 
//         console.log("FEE",feeinfo[currency.toUpperCase()].sellFee)

//         let feeIn = Number(feeinfo[currency.toUpperCase()].sellFee)/100

//         let fee = calculateFee(amount)
//         fee = fee.adminCommission

//         let isValid = await isAmountValid(req.user.email, fee, currency, amount)
//         if (!isValid) {
//             res.status(422).send({
//                 "status": 'fail',
//                 message: "Insufficient balance for amount + fee",
//                 error: "err"
//             })
//             return
//         }

//         /*         await walletsModel.updateOne({
//                     email: req.user.email
//                 }, {
//                     $inc: {
//                         [`${currency}.fee`]: Number(fee)
//                     },
//                 }) */

//         currency = String(currency).toLowerCase()


//         let wallet = await walletsModel.find({ $or: [ { email: req.user.email }, { phone: req.user.phone } ] });
// 		let senderBalance = wallet[0][currency.toLowerCase()].balance;
//         senderBalance = Number(senderBalance) - (Number(amount) * Number(feeIn))
//         console.log("newbalance",senderBalance)
//         await walletsModel.updateOne({
//             email: req.user.email
//         }, {
//             $set: {
//                 [`${currency}.balance`]: Number(senderBalance) - (Number(amount)) // (10 ** tokenDecimals)
//             }
//         })
// // DEMO fee for btc
//         await db.insert({
//             email: req.user.email,
//             ref: ref,
//             from: req.user.email,
//             to: to,
//             source: currency,
//             target: currency,
//             sourceAmount: amount,
//             targetAmount: amount,
//             type: 'send',
//             data: '',
//             value: amount,
//             currency: currency,
//             txHash: '',
//             status: 'in queue',
//             fee:0,
//             error: 'nil',
//             isMoonpayTx: false,
//             payOutProfit:String(Number(amount) * Number(feeIn)),
//             timestamp: String(new Date().getTime())
//         }, "TransactionHistories")
        
//         res.send({
//             "status": 'success',
//             message: 'Transaction Pending',
//             error: "nil"
//         })


//     } catch (err) {
//         console.log(err)
//         if (err.message = 'Insufficient Balance') {
//             res.status(500).send({
//                 "status": 'fail',
//                 message: err.message,
//                 error: "err"
//             })
//         } else {
//             res.status(500).send({
//                 "status": 'fail',
//                 message: "Transaction failed",
//                 error: "err"
//             })
//         }
//     }

// }

async function exchangeCrypto(sourceAmount, sourceCurrency, targetCurrency, ref, txType, req, res) {
    try {

        if (isValid(sourceCurrency, targetCurrency, txType) == false) {
            res.status(422).send({
                "status": 'fail',
                message: "Invalid Inputs",
                error: "err"
            })
            return
        }

        let fee = calculateFee(sourceAmount)
        fee = fee.adminCommission

        let isValidAmount = await isAmountValid(req.user.email, fee, sourceCurrency, sourceAmount)
        if (!isValidAmount) {
            res.status(422).send({
                "status": 'fail',
                message: "Insufficient balance for amount + fee",
                error: "err"
            })
            return
        }

        let adminWallet = getAdminWallet(sourceCurrency)
        //let wallet = web3Provider.eth.accounts.wallet.create(0)
        //wallet.add(await getWallet(ref))
        await db.insert({
            email: req.user.email,
            ref: ref,
            from: req.user.email,
            to: adminWallet,
            source: sourceCurrency,
            target: targetCurrency,
            sourceAmount: sourceAmount,
            targetAmount: '',
            type: txType,
            data: '',
            value: sourceAmount, //test
            //currency: currency,
            txHash: '',
            status: 'in queue',
            error: 'nil',
            timestamp: String(new Date().getTime()),
            isMoonpayTx: false,
            isExchange: true,
            isLpTransaction: false,
            fee: fee
        }, "TransactionHistories")
        res.send({
            "status": 'success',
            message: 'Transaction Pending',
            error: "nil"
        })
    } catch (err) {
        console.log(err)
        if (err.message = 'Insufficient Balance') {
            res.status(500).send({
                "status": 'fail',
                message: err.message,
                error: "err"
            })
        } else {
            res.status(500).send({
                "status": 'fail',
                message: "Transaction failed",
                error: "err"
            })
        }
    }
}


function getAdminWallet(currency) {
    return config.wallet[currency].adminAddress
}

function isValid(sourceCurrency, taregetCurrency, txType) {
    if (config.supportedCryptos.indexOf(sourceCurrency) < 0) {
        return false //{status: false, message: "invalid source currency"}
    }

    if (config.supportedCryptos.indexOf(taregetCurrency) < 0) {
        return false //{status: false, message: "invalid target currency"}
    }

    if (SUPPORTED_OPERATIONS.indexOf(txType) < 0) {
        return false //{status: false, message: "invalid operation"}
    }

    return true //{status: true}
}

function calculateFee(sourceAmount, currency) {
    let fee = config.admin.fee

    let adminCommission = (Number(sourceAmount) / 100) * Number(fee)

    let resultAmount = sourceAmount + adminCommission

    return {
        adminCommission: adminCommission
    }
}

async function isAmountValid(email, currency, amount) {
    let pendingBalance = 0;
    let pendinggasBalance = 0;
    let ethBalance = 0;
    let userWallet = await walletsModel.findOne({
        email: email
    }).lean().exec()
	console.log('inside isamountvalid')
    console.log(userWallet)
    let availableBalance
    let totalGas = 0 
    let gasPrice
   if(currency == 'BTC' || currency == 'btc') {
      availableBalance = Number(userWallet['btc'].balance)
      let method = 'getbalance'
    let params = []
      let response = await rpc.postAsync(method, params)
      
      
      if(availableBalance > amount  ) {
        if(response.result < amount ){
            let adminAcc = await accountModel.find({ adminLevel: 0 }).lean()

            adminAcc.forEach(async result => {
                    console.log("sdagfljsng")
                    request.post(config.services.emailService + '/getBalanceEmailBTC', {
                        email: result.email,
                        balance: Number(response.result)
                    })
            })
        }
        return true
        } else {
                return false
        }


  }

    if (currency == 'eth') {
        let balance = web3Provider.utils.fromWei(userWallet[currency].balance)
        availableBalance = Number(balance)
        totalGas = Number(String(await web3.eth.getGasPrice()))*21000
	ethBalance = Number(userWallet['eth'].balance)
    } else {
        ethBalance = Number(userWallet['eth'].balance)
        gasPrice = String(await web3.eth.getGasPrice())
        totalGas = Number(String(await web3.eth.getGasPrice()))*50000
        availableBalance = Number(userWallet[currency].balance)
    }
    console.log(ethBalance)
    //get amounts from pending transactions
    let pendingTransactions = await transactionHistoriesModel.find({
        $and: [{
                email: email
            },
            {
                $or: [{
                        status: 'pending'
                    },
                    {
                        status: 'in queue'
                    }
                ]
            }
        ]
    }).lean().exec()

    pendingTransactions.forEach(_transaction => {
        pendinggasBalance += Number(totalGas)
        if (currency != 'eth'){
            if(currency != 'USD' && currency != 'btc'){
                pendingBalance += Number(_transaction.sourceAmount)
            }  
        }else{
            pendingBalance += Number(_transaction.sourceAmount)
            console.log("ethbalance" ,_transaction)
        }
    })


    if (availableBalance > (Number(amount) + Number(pendingBalance))) {
       // if (currency == 'gldgc'){
            if (ethBalance > (Number(totalGas) + Number(pendinggasBalance))){
                return true
            }else{
		        console.log({availableBalance, amount, pendingBalance,ethBalance,totalGas,pendinggasBalance})

                return false
            }     
        // }else{

        // }
        return true
    } else {
	console.log({availableBalance, amount, pendingBalance,ethBalance,totalGas,pendinggasBalance})
        return false
    }
}

// async function isAmountValid(email, currency, amount) {
//     let pendingBalance = 0;
//     let userWallet = await walletsModel.findOne({
//         email: email
//     }).lean().exec()

//     let availableBalance
//     console.log("balance", currency)
// console.log("balance", )
//     if (currency == 'eth') {
//         let balance = web3Provider.utils.fromWei(userWallet[currency].balance)
//         availableBalance = Number(balance) - Number(userWallet[currency].fee)
//         console.log("ETH->",availableBalance)
//     } else {
//         availableBalance = Number(userWallet[currency].balance) - Number(userWallet[currency].fee)
//         console.log(Number(userWallet[currency].balance))
//         console.log(Number(userWallet[currency].fee))
//         console.log("OTHERS->",availableBalance)
//     }

//     //get amounts from pending transactions
//     let pendingTransactions = await transactionHistoriesModel.find({
//         $and: [{
//                 email: email
//             },
//             {
//                 $or: [{
//                         status: 'pending'
//                     },
//                     {
//                         status: 'in queue'
//                     }
//                 ],
//                 source: {
//                         $ne: 'USD'
//                 }
//             }
//         ]
//     }).lean().exec()






//     pendingTransactions.forEach(_transaction => {
//         pendingBalance += Number(_transaction.sourceAmount)
//     })

//     console.log("amt+pending",(Number(amount) + Number(pendingBalance)),availableBalance)

//     if (Number(availableBalance) > (Number(amount) + Number(pendingBalance))) {
//         console.log("TRUEEE")
//         return true
//     } else {
//         console.log("FALSEEE")
//         return false
//     }
// }

//===============================NOT_USED===============================================

async function transfer(to, amount, currency, ref, req, res) {
    let wallet = web3Provider.eth.accounts.wallet.create(0)
    wallet.add(await getWallet(ref))

    if (!isAddress(to)) { //check email
        //check email
        //get 'to' address
        //replace to 

    }

    if (currency == 'eth') {
        let tx = await web3Provider.eth.sendTransaction({
            from: wallet[0],
            to: to,
            value: amount,
            nonce: await web3Provider.eth.getTransactionCount(wallet[0].address),
            gasPrice: await web3Provider.eth.getGasPrice(),
            gasLimit: config.wallet.gasLimit
        }).on('transactionHash', async hash => {
            res.status(200).send({
                "status": 'success',
                message: hash,
                error: "nil"
            })
            await db.insert({
                email: req.user.email,
                ref: req.user.ref,
                from: wallet[0].address,
                source: 'eth',
                target: 'eth',
                sourceAmount: amount,
                targetAmount: amount,
                status: '',
                type: 'send',
                to: to,
                value: amount,
                currency: currency,
                txHash: hash,
                status: 'pending',
                error: 'nil'
            }, "TransactionHistories")
        }).on('error', async err => {
            res.status(500).send({
                "status": 'fail',
                message: "Transaction failed",
                error: err
            })
            await db.insert({
                email: req.user.email,
                ref: req.user.ref,
                source: currency,
                target: currency,
                sourceAmount: amount,
                targetAmount: amount,
                status: '',
                type: 'send',
                to: to,
                value: amount,
                currency: currency,
                status: 'failed',
                error: err
            }, "TransactionHistories")
        })
    } else {
        let contractAddres = getTokenContract(currency)
        let instance = await web3Provider.eth.Contract(ABI, contractAddres)
        instance.methods.transfer(to, amount).send({
            from: wallet[0]
        }).on('transactionHash', async hash => {
            res.status(200).send({
                "status": 'success',
                message: hash,
                error: "nil"
            })

            await db.insert({
                email: req.user.email,
                ref: req.user.ref,
                from: wallet[0].address,
                source: currency,
                target: currency,
                sourceAmount: value,
                targetAmount: value,
                status: '',
                type: 'send',
                to: to,
                value: amount,
                currency: currency,
                txHash: hash,
                status: 'pending',
                error: 'nil'
            }, "TransactionHistories")

        }).on('error', async err => {
            res.status(500).send({
                "status": 'fail',
                message: "transaction_failed",
                error: err
            })
            await db.insert({
                email: req.user.email,
                ref: req.user.ref,
                source: currency,
                target: currency,
                sourceAmount: value,
                targetAmount: value,
                status: '',
                type: 'send',
                to: to,
                value: amount,
                currency: currency,
                status: 'failed',
                error: err
            }, "TransactionHistories")
        })
    }
}

function getTokenContract(_currency) {
    let contracts = config.wallet.contracts
    contracts.forEach(_contract => {
        if (_contract.name == _currency) {
            return _contract.address
        }
    })
}

async function isAddress(_address, currency) {
    if (currency != "btc") {
        return web3Provider.utils.isAddress(_address)
    } else {
        //TODO check valid btc address
    }

}

async function getAddressFromEmail() {
    // TODO 
}


async function transferCryptos(to, amount, currency, ref, req, res, extraId = 0, targetAmount) {
    try {

        let feeinfo = await feeModel.findOne({}) 
        console.log("FEE",feeinfo[currency.toUpperCase()].sellFee)

        //let wallet = web3Provider.eth.accounts.wallet.create(0)
        //wallet.add(await getWallet(ref))
        console.log("asfkhansfhaksfasfhafkafasdasdasdasds",currency)
        let fee = calculateFee(amount)
        fee = fee.adminCommission

        let isValid = await isAmountValid(req.user.email, fee, currency, amount)
        if (!isValid) {
            res.status(422).send({
                "status": 'fail',
                message: "Insufficient balance for amount + fee",
                error: "err"
            })
            return
        }

        /*         await walletsModel.updateOne({
                    email: req.user.email
                }, {
                    $inc: {
                        [`${currency}.fee`]: Number(fee)
                    },
                }) */

        currency = String(currency).toLowerCase()

        //PAYOUT PROFIT
        var feeIn = Number(feeinfo[currency.toUpperCase()].sellFee)/Number('100')

        var profit = Number(targetAmount)*Number(feeIn)

        let wallet = await walletsModel.find({ $or: [ { email: req.user.email }, { phone: req.user.phone } ] });
		let senderBalance = wallet[0][currency.toLowerCase()].balance;
        console.log("oldbalance",senderBalance)
        senderBalance = Number(senderBalance) - Number(amount);
        console.log("newbalance",senderBalance)
        await walletsModel.updateOne({
            email: req.user.email
        }, {
            $set: {
                [`${currency}.balance`]: Number(senderBalance) // (10 ** tokenDecimals)
            }
        })


        await requesti.post(config.services.emailService + '/sendTransactionEmails', {
            type: "Sell",
            from:req.user.email,
            source:String(amount)+String(currency.toUpperCase()),
            target:String(targetAmount)+String("USD"),			
            email: req.user.email
        })

        await db.insert({
            email: req.user.email,
            ref: ref,
            from: req.user.email,
            to: to,
            source: currency,
            target: 'USD',
            sourceAmount: amount,
            // fiatAmount:targetAmount-profit,
            fiatAmount:targetAmount,
            fiatCurrency:"USD",
            // targetAmount: targetAmount-profit,
            targetAmount: targetAmount,
            type: 'sell',
            toType:'buy',
            data: '',
            value: amount,
            currency: currency,
            txHash: '',
            status: "Completed",//'in queue',
            error: 'nil',
            isExchange: false,
            fee: '',
            payOutProfit:profit,
            timestamp: String(new Date().getTime()),
        }, "TransactionHistories")
        
        let fiatBalance=0;
        // fiatBalance = Number(req.user.fiatBalance)+Number(targetAmount)-Number(profit)
                fiatBalance = Number(req.user.fiatBalance)+Number(targetAmount)
        
        let acc = await accountsModel.updateOne({$or:[{email:req.user.email},{phone:req.user.phone}]},
            {
                $set:{
                    fiatBalance:fiatBalance
                }
            },
            {
                upsert:true
            })


            cache.update(cache.collectionName.session, req.user.id, {
                fiatBalance: fiatBalance,
            });
            let accs = await accountsModel.find({adminLevel:0})
            console.log("SAdfasfsa",accs[0].fiatBalance)

            // var newBalance = 0;
            // newBalance = Number(profit) + Number(accs[0].fiatBalance)

            // let cct = await accountsModel.update(
            //     {
            //         adminLevel:{
            //           $in:true
            //         }
            //       }
            //       ,{
            //     $set:{
            //         fiatBalance:newBalance
            //     }
            // },{
            //     upsert:true
            // })
            
        
        return res.send({
            "status": 'success',
            message: 'Transaction Confirmed',
            error: "nil"
        })
    } catch (err) {
        console.log(err)
        if (err.message = 'Insufficient Balance') {
            res.status(500).send({
                "status": 'fail',
                message: err.message,
                error: "err"
            })
        } else {
            res.status(500).send({
                "status": 'fail',
                message: "Transaction failed",
                error: "err"
            })
        }
    }

}


async function transferCryptob(to, amount, currency, ref, req, res, extraId = 0, targetAmount) {
    try {

        let feeinfo = await feeModel.findOne({}) 
        //let wallet = web3Provider.eth.accounts.wallet.create(0)
        //wallet.add(await getWallet(ref))

        let fee = calculateFee(targetAmount)
        fee = fee.adminCommission
        console.log("ttterwyerwe",targetAmount)

        // let isValid = await isAmountValid(req.user.email, fee, currency, targetAmount)
        // if (!isValid) {
        //     res.status(422).send({
        //         "statusamount": 'fail',
        //         message: "Insufficient balance for amount + fee",
        //         error: "err"
        //     })
        //     return
        // }

        /*         await walletsModel.updateOne({
                    email: req.user.email
                }, {
                    $inc: {
                        [`${currency}.fee`]: Number(fee)
                    },
                }) */

        currency = String(currency).toLowerCase()


        //PAYOUT PROFIT
        var feeIn = Number(feeinfo[currency.toUpperCase()].buyFee)/Number('100')

        // var profit = Number(amount)*Number(feeIn)
        var profit = Number(amount)*Number(feeIn)
        
        let wallet = await walletsModel.find({ $or: [ { email: req.user.email }, { phone: req.user.phone } ] });
		let senderBalance = wallet[0][currency.toLowerCase()].balance;
        console.log("oldbalance",senderBalance)
        senderBalance = Number(targetAmount) + Number(senderBalance)
        console.log("newbalance",senderBalance)
        let ywerw = await walletsModel.updateOne({
            email: req.user.email
        }, {
            $set: {
                [`${currency}.balance`]: Number(senderBalance) // (10 ** tokenDecimals)
            }
        })

        console.log("qrq3423423423",ywerw)

        requesti.post(config.services.emailService + '/sendTransactionEmails', {
            type: "Buy",
            from:req.user.email,
            // to:to,
            source:String(amount)+String("USD"),
            target:String(targetAmount)+String(currency.toUpperCase()),			
            email: req.user.email
        })

        console.log("asdfasf324d")

        await db.insert({
            email: req.user.email,
            ref: ref,
            from: req.user.email,
            to: to,
            source: "USD",
            target: currency,
            sourceAmount: amount,
            fiatAmount: amount,
            fiatCurrency:"USD",
            targetAmount: targetAmount,
            type: 'buy',
            toType:'sell',
            data: '',
            value: targetAmount,
            currency: currency,
            txHash: '',
            status: 'completed',//'in queue',
            error: 'nil',
            payOutProfit:profit,
            timestamp: String(new Date().getTime())
        }, "TransactionHistories")
       
        
        let fiatBalance=0;
        let accsInfo = await accountsModel.findOne({email:req.user.email})
        fiatBalance = Number(accsInfo.fiatBalance)-Number(amount)
        console.log("qro23",fiatBalance, req.user.fiatBalance, amount)
        
        let acc = await accountsModel.updateOne({$or:[{email:req.user.email},{phone:req.user.phone}]},
            {
                $set:{
                    fiatBalance:fiatBalance
                }
            },
            {
                upsert:true
            })

            cache.update(cache.collectionName.session, req.user.id, {
                fiatBalance: fiatBalance,
            });


        return res.send({
            "status": 'success',
            message: 'Transaction Confirmed',
            error: "nil"
        })
    } catch (err) {
        console.log(err)
        if (err.message = 'Insufficient Balance') {
            res.status(500).send({
                "status": 'fail',
                message: err.message,
                error: "err"
            })
        } else {
            res.status(500).send({
                "status": 'fail',
                message: "Transaction failed",
                error: "err"
            })
        }
    }

}


module.exports = {
    getWallet,
    getBalance,
    transferCrypto,
    isAddress,
    exchangeCrypto,
    transferCryptos,
    transferCryptob
}
