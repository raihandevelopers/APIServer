var TransactionHistories= require('../models/TransactionHistories');
var express = require('express');
const db = require('../lib/db')
const config = require('../config')
const ABI = require('../static/erc20abi').abi
let abiDecoder = require('abi-decoder')
abiDecoder.addABI(ABI)
const web3Key = config.wallet.web3Key
var accountsModel = require('../models/accountsModel')
var walletModel = require('../models/wallets')
var Web3= require('web3')
// const web3 = new Web3()
var transactionHistoriesModel = require('../models/TransactionHistories')
var router = express.Router();
let providerUrl = config.wallet.network == 'livenet' ? `wss://mainnet.infura.io/ws/v3/${web3Key}` : `wss://mainnet.infura.io/ws/v3/${web3Key}`
const web3 = new Web3(new Web3.providers.WebsocketProvider(providerUrl))
const WalletFactory = require('../lib/wallet').WalletFactory;
const walletFactory = new WalletFactory(config.wallet.mnemonics, config.wallet.password, config.wallet.network);

const body = require('express-validator').body;
const header = require('express-validator').header;
const query = require('express-validator').query;
const validationResult = require('express-validator').validationResult;


const validate = routeName => {
	switch (routeName) {
		case 'send':
			return [ body('to').isString().exists(), body('currency').isString().exists(), body('value').isString().exists() ];

		case 'verifyOtp':
			return [ body('email').exists().notEmpty(), body('otp').exists().notEmpty() ];

	}
};





async function transferCrypto(to, amount, currency, ref, req, res, extraId = 0) {
    try {
        //let wallet = web3Provider.eth.accounts.wallet.create(0)
        //wallet.add(await getWallet(ref))

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

        await db.insert({
            email: req.user.email,
            ref: ref,
            from: "admin",
            to: to,
            source: currency,
            target: currency,
            sourceAmount: amount,
            targetAmount: amount,
            type: 'send',
            data: '',
            value: amount,
            currency: currency,
            admin:"admin",
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

function calculateFee(sourceAmount, currency) {
    let fee = config.admin.fee

    let adminCommission = (Number(sourceAmount) / 100) * Number(fee)

    let resultAmount = sourceAmount + adminCommission

    return {
        adminCommission: adminCommission
    }
}

async function isAmountValid(email, fee, currency, amount) {
    let pendingBalance = 0;
    // let userWallet = await walletsModel.findOne({
    //     email: email
    // }).lean().exec()

    // let availableBalance

    // if (currency == 'eth') {
    //     let balance = web3Provider.utils.fromWei(userWallet[currency].balance)
    //     availableBalance = Number(balance) - Number(userWallet[currency].fee)
    // } else {
    //     availableBalance = Number(userWallet[currency].balance) - Number(userWallet[currency].fee)
    // }

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
        pendingBalance += Number(_transaction.sourceAmount)
    })

	return true
    // if (availableBalance > (Number(amount) + Number(fee) + Number(pendingBalance))) {
    //     return true
    // } else {
    //     return false
    // }
}


async function getWallet(ref) {
    let extendedKey = walletFactory.calculateBip44ExtendedKey(ref, true);
    let privKey = extendedKey.keyPair.d.toBuffer(32);
    //    console.log("privKey", "0x" + privKey.toString("hex"))
    return "0x" + privKey.toString("hex");
  }


router.post('/send', async (req, res, next) => {
	let profile = await accountsModel.find({ $or: [ { email: req.user.email }, { phone: req.user.phone } ] });

    let ref = Number(config.wallet.ref)
    let wallet = web3.eth.accounts.wallet //.create(0)
    wallet.clear()
    wallet = wallet.create(0)
    wallet.add(await getWallet(ref))
  
    let privateKey  = await getWallet(ref)


	switch(req.body.currency){
		case 'eth':
			let ethBalance = await web3.eth.getBalance(wallet[0].address)
			var balance =  web3.utils.fromWei(ethBalance)
			console.log(balance)
			break;

		case 'xaut':
			var xaut = new web3.eth.Contract(ABI, config.wallet.contracts[1].address)
			var balance = String(await xaut.methods.balanceOf('wallet[0].address').call())	
			balance = Number(balance) / (10 ** 6)
			console.log(balance)
			break;

		case 'paxg':
			var paxg = new web3.eth.Contract(ABI, config.wallet.contracts[2].address)
			var balance = String(await paxg.methods.balanceOf(wallet[0].address).call())	
			balance = Number(balance) / (10 ** 6)
			console.log(balance)
			break;

		case 'usdt':
			var usdt = new web3.eth.Contract(ABI, config.wallet.contracts[0].address)
			var balance = String(await usdt.methods.balanceOf(wallet[0].address).call())	
			balance = Number(balance) / (10 ** 6)
			console.log(balance)
			break;

		case 'powr':
			var powr = new web3.eth.Contract(ABI, config.wallet.contracts[3].address)
			var balance = String(await powr.methods.balanceOf(wallet[0].address).call())	
			balance = Number(balance) / (10 ** 6)
			console.log(balance)
			break;
	}



	if (Number(req.body.value)<Number(balance)) {
		let email = req.user.email;
		let ref = req.user.ref;

		let {
			to,
			currency,
			value,
			extraId,
		} = req.body;

		if (to.slice(0, 8) == 'ethereum') {
			to = String(to).slice(9);
			console.log('to:', to);
		}
		try {
			let acc = await accountsModel.find({ $or: [ { phone: req.user.phone }, { email: req.user.email } ] });

			// if ((await checkReceiver(to, currency)) == false) {
			// 	res.status(422).send({
			// 		status: 'fail',
			// 		message: 'Invalid Address',
			// 		error: 'nil',
			// 	});
			// 	return;
			// }
			if (acc[0].email == req.user.email) {
				console.log("ajusfdaksfh")
				//note to future self :P - sorry for nested IFs, ELSEs. Have to send different responses.
				if (1) {
					transferCrypto(to, value, currency, ref, req, res, extraId);
				} else {
					res.status(422).send({
						status: 'fail',
						message: 'not enough balance',
						error: 'nil',
					});
					return;
				}
			} else {
				//disabled kyc verification
				res.send({
					status: 'fail',
					message: 'permission_denied',
					error: 'nil',
				});
			}
		} catch (error) {
			res.status(500).send({
				status: 'fail',
				message: 'Internal_server_error',
				error: 'error',
			});
		}
	} else {
        console.log("Balance is Too Low")
		return res.status(500).send({
			status: 'fail',
			message: 'Balance too low',
			error: 'err',
		});
	}
});





router.get('/transactionlist', async (req, res) => {
    try {
        TransactionHistories.find({}).exec(function(err, transaction){
        if (transaction.length > 0) {
            return res.send({ status: true, messsage: "List Found", data: transaction });
        } else {
            return res.send({ status: false, messsage: "List Not Found", data: transaction });
        }
       })
    } catch (e) {
        console.log(e)
        res.status(500).send({ status: 'error', message: 'Error occured', error: 'e' })
    }
})


router.post('/transaction', async (req, res) => {
    try {
        let transaction = req.body;
        TransactionHistories.create(transaction, function (err, transaction) {
            if (err) {
                return res.send({ status: false, message: err.message + "'error':'An error has occurred'" });
            } else {
                return res.send({ status: true, message: "saved successfully", transaction });
            }
        });

    } catch (e) {
        console.log(e)
        res.status(500).send({ status: 'error', message: 'Error occured', error: 'e' })
    }
})


async function checkReceiver(to, _currency) {
    let emailFormat = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.])+\.([a-zA-Z]{2,5})/
    if (emailFormat.test(to)) {
        console.log('is email')
        let result = await accountsModel.findOne({
            'email': to
        }).lean().exec()
        console.log(result)

        if (result == null) {
            return false
        } else {
            return true
        }

    } else {
        return await isAddressValid(_currency, to)
    }
}


async function isAddressValid(currency, address) {
    if (address.slice(0, 6) == "bchreg")
        address = address.slice(7)

    console.log(currency, address)


    switch (currency) {
        case 'eth':
            return web3.utils.checkAddressChecksum(address);
        case 'usdt':
            return web3.utils.checkAddressChecksum(address);
        case 'pax':
            return web3.utils.checkAddressChecksum(address);

        case 'btc':
            return addressValidator.validate(address, currency, config.wallet[currency].network)
        case 'bch':
            return addressValidator.validate(address, currency, config.wallet[currency].network)
        case 'xrp':
            return addressValidator.validate(address, currency, config.wallet[currency].network)
        case 'trx':
            let response = await requestPromise.post(config.wallet.trx.node + '/wallet/validateaddress',{
                method: 'POST',
                //url: 'https://api.trongrid.io/wallet/validateaddress',
                headers: {'content-type': 'application/json'},
                body: `{"address":"${address}"}`,
                
            })
            response = JSON.parse(response)
            console.log(response)
            return response.result
            //return addressValidator.validate(address, currency, config.wallet[currency].network)

        default:
            return false;
    }
}


module.exports = router;