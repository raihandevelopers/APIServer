const config = require('../../config')
const WalletFactory = require('../../lib/wallet').WalletFactory
const walletFactory = new WalletFactory(config.wallet.mnemonics, config.wallet.password, config.wallet.network )

const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider(config.wallet.provider))
const db = require('../../lib/db')
const ABI = require('../../static/ecr20abi').abi
const bitcoin = require('../../lib/btc')
        
async function getWallet(ref){
    let extendedKey = walletFactory.calculateBip44ExtendedKey(ref, false);
    let privKey = extendedKey.keyPair.d.toBuffer(32);
//    console.log("privKey", "0x" + privKey.toString("hex"))
    return "0x" + privKey.toString("hex");
}

async function sendTransaction(){
    let transactions = (await db.readManyAsync({ $or:[{status: 'in queue'},{status: 'processing'} ]}, "TransactionHistories")).message
    if(transactions.length > 0 ){
        transactions.forEach(tx=>{
            let isExchangeTransaction = false
            if(tx.status == 'processing'){
                isExchangeTransaction = true
            }

            switch (tx.source){
                case "eth":
                    sendEthTx(tx, isExchangeTransaction)
                break;

                case "btc":
                    //sendBtc(tx, isExchangeTransaction)
                break;

                case "trx":

                break;

                case "xrp":

                break;

                case "pax":

                break;

                case "bch":

                break;

                default: //erc20 Transanction
                    sendToken(tx, isExchangeTransaction)
            }
        })
    }
}

async function sendEthTx(tx, isExchangeTransaction){
    let txHash
    let wallet = web3.eth.accounts.wallet//.create(0)
    wallet = wallet.create(0)
    wallet.add(await getWallet(tx.ref))
    try{ 
        await checkForEmailTX(tx)
        console.log("tx.to", tx.to)
        await web3.eth.sendTransaction({
            from: wallet[0],
            to: tx.to,
            value: web3.utils.toWei(tx.targetAmount),
            nonce: await web3.eth.getTransactionCount(wallet[0].address),
            gasPrice: await web3.eth.getGasPrice(),
            gasLimit: config.wallet.gasLimit

        }).on('transactionHash',async hash=>{
            txHash = hash
            let fromAddress = wallet[0].address
            wallet.clear()
            let isTrade = tx.type == ("buy" || "sell") ?  true : false       
            await updateTxStatus(tx._id, fromAddress,'pending', txHash, '',isExchangeTransaction)
            
/*             db.updateOneAsync({_id: tx._id},{
                $set:{
                    from: wallet[0].address,
                    txHash: hash,
                    status: 'pending'
                }
            }, "TransactionHistories") */
            return
        })
    }catch(err){
        console.log(err.message)
        let fromAddress = wallet[0].address
        wallet.clear()
        let isTrade = tx.type == ("buy" || "sell") ?  true : false     
        await updateTxStatus(tx._id, fromAddress,'error', txHash, err.message,isExchangeTransaction)
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

async function updateTxStatus(dbId, from, status, hash, message = "", isExchangeTransaction){

    if(isExchangeTransaction){
        await db.updateOneAsync({_id: dbId},{
            $set:{
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
    else{
        await db.updateOneAsync({_id: dbId},{
            $set:{
                from: from,
                txHash: hash,
                status: status,
                reason: message
            }
        }, "TransactionHistories")
    }
}

async function handleExchangeTx(tx){

}

async function sendBtc(tx){
    try{
        await checkForEmailTX(tx)
        bitcoin.transfer(tx.to,tx.targetAmount, tx.ref)
    }catch(error){
        console.log(error.message)
    }
}

async function sendToken(tx){
    let wallet = web3.eth.accounts.wallet.create(0)
    wallet.add(await getWallet(tx.ref))
    let txHash
    try{ 
        await checkForEmailTX(tx)
        console.log("tx.to", tx.to)
        let contractAddres =await getTokenContract(tx.target)
        console.log("contractAddres",contractAddres)
        let instance = await new web3.eth.Contract(ABI,contractAddres)
        let tokenDecimal = getTokenDecimal(tx.target)

        let targetAmount = Number(tx.targetAmount) * (10 ** tokenDecimal)
        instance.methods.transfer(tx.to, targetAmount).send({from : wallet[0].address, 
            gas: config.wallet.gasLimit })
        .on('transactionHash',async hash=>{
        txHash = hash
        db.updateOneAsync({_id: tx._id},{
            $set:{
                from: wallet[0].address,
                txHash: hash,
                status: 'pending'
            }
        }, "TransactionHistories")
        
    })
    }catch(err){
        console.log(err.message)
        db.updateOneAsync({_id: tx._id},{
            $set:{
                from: wallet[0].address,
                txHash: txHash,
                status: 'error',
                reason: err.message
            }
        }, "TransactionHistories")
    }
}

function getTokenDecimal(_currency){
    let contracts = config.wallet.contracts
    let decimal
    contracts.forEach(_contract=>{
        if(_contract.name == _currency){
            decimal = _contract.decimal
            return
        }
    })
    return decimal
}

function getTokenContract(_currency){
    let address;
    let contracts = config.wallet.contracts
    contracts.forEach(_contract=>{
        if(_contract.name == _currency){
            address = _contract.address
            return
        }
    })
    return address
}

async function getUserWallet(_email, _currency){
    let user = await db.readFromDBAsync({email: _email},"accounts")
 
    if(user.status == "success" && user.message != null){
        return user.message.wallets[_currency]
    }else{
        return null
    }
}

async function checkForEmailTX(tx){
    let emailFormat = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.])+\.([a-zA-Z]{2,5})/
    if(emailFormat.test(tx.to)){
        let receiverAddress = await getUserWallet(tx.to, tx.target)
        if(receiverAddress != null){
            tx.to = receiverAddress
        }else{
            throw "invalid_email"
        }
    }
}

module.exports = {
    sendTransaction
}