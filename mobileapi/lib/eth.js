const Web3 = require('web3')
const config = require('../config')
const WalletFactory = require('../lib/wallet').WalletFactory
const walletFactory = new WalletFactory(config.wallet.mnemonics, config.wallet.password, config.wallet.network)
const web3Provider = new Web3(new Web3.providers.HttpProvider(config.wallet.provider))
const db = require('../lib/db')

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

async function transferCrypto(to, amount, currency, ref, req, res) {
    if (currency != "btc") {
        try {
            //let wallet = web3Provider.eth.accounts.wallet.create(0)
            //wallet.add(await getWallet(ref))

            if (!isAddress(to)) { //check email
                //check email
                //get 'to' address
                //replace to 

            }
            await db.insert({
                to,
                amount,
                currency,
                ref
            }, "pendingTransactions")

            res.send({
                "status": 'success',
                message: 'Transaction Successful',
                error: "nil"
            })

        } catch (err) {
            res.status(500).send({
                "status": 'fail',
                message: "Transaction failed",
                error: "err"
            })
        }

    }
}

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

async function isAddress(_address) {
    return web3Provider.utils.isAddress(_address)
}

async function getAddressFromEmail() {
    // TODO 
}


module.exports = {
    getWallet,
    getBalance,
    transferCrypto,
    isAddress
}