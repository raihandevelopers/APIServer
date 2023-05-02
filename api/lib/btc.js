const PrivateKey = require("bitcore-lib").PrivateKey;
const PublicKey = require("bitcore-lib").PublicKey;
const Address = require("bitcore-lib").Address;
const Transaction = require("bitcore-lib").Transaction;
const bitcoin = require("bitcoinjs-lib");
const request = require("request-promise")
const config = require('../config')
const WalletFactory = require('./wallet').WalletFactory
const Network = require('bcoin').Network;
const bcoin = require('bcoin').set('testnet');
const path = require('path')
let _walletFactory = new WalletFactory(config.wallet.mnemonics, config.wallet.password, config.wallet.network)
//let _http = new RequestPromise()
let _node = config.wallet.btc.node

//getUtxo("1PCuVf7qoFwsGT7edBrDsKs6Bt94fyVhjo")
let node
test()
async function test() {
    let testnet = true
    node = new bcoin.SPVNode({
        network: testnet === true ? Network.get("testnet").toString() : Network.get("main").toString(),
        httpPort: 48449,
        prefix: path.join(__dirname, 'spv_data'),
        memory: false,
        logFile: true,
        logConsole: false,
        logLevel: 'spam',

        // reduce log spam on SPV node (cannot reduce to 0 for full node)
        maxOutbound: 1,
    });

    await node.ensure();

    await node.open();
    await node.connect();
    await watch('')
    await node.startSync();
    await node.disconnect();
    await node.close();
    //node.pool.on("tx", console.log);
    node.chain.on("block", block => {

    });

}



async function watch(address) {
    address = "mkdEKr6ZrpVXXW5aVEWJ5uNLh36UjyZTen"
    let pubKey = bcoin.Address.fromString(address, node.network);
    node.pool.watchAddress(pubKey);
}


const transfer = async (to, value, ref, req, res) => {
    console.log('transfer function')
    let wallet = await getWallet(ref)
    let privKey = wallet.privKey
    //console.log(wallet.privKey)
    let utxos = await getUtxo(wallet.address)
    if (utxos.length == 0) {
        return
    }
    console.log("utxo", utxos)
    return
    let transaction = new Transaction()
        .from(utxos);
    transaction = transaction.to(to, value)
    transaction = transaction.change(wallet.address)
    transaction = transaction.fee(transaction.getFee())
    transaction = await transaction.sign(privKey);
    let rawTx = transaction.serialize();

    /*     let endpoint = config.wallet.btc.node + "/tx/send";
        let body = {
            rawtx: rawTx
        }; */
    let endpoint = config.wallet.btc.testnetNode + "/txs/push"
    let body = {
        tx: rawTx
    };
    let data = await request.post(endpoint, body);
    console.log(data)
    return data.hash
    //return data.payload["txid"];
}
//transfer("mkdEKr6ZrpVXXW5aVEWJ5uNLh36UjyZTen", 111,1) //dev
async function getWallet(ref) {
    let isTestnet = config.wallet.btc.network == 'testnet' ? true : false
    let key = await _walletFactory.getExtendedKey(ref, isTestnet);
    let btcWallet = await _walletFactory.generateBitcoinWallet(key);
    //console.log(btcWallet)
    return btcWallet
}

async function getUtxo(address) {
    //let endpoint = _node + "/addr/" + address + "/utxo"; //insightApi
    let endpoint = config.wallet.btc.network == 'testnet' ? config.wallet.btc.testnetNode : config.wallet.btc.node
    endpoint = `${endpoint}/addrs/${address}?unspentOnly=true`
    let response = await request.get(endpoint);
    //console.log(response)
    if (config.wallet.btc.network == 'testnet') {
        let parsedResponse = JSON.parse(response)
        if (parsedResponse.txrefs != undefined || null) {
            let utxos = parseUtxoResponseBlockCypher(parsedResponse.txrefs);
            console.log(utxos)
            return utxos;
        }
        return []

    } else {
        let utxos = parseUtxoResponse(JSON.parse(response));
        console.log(utxos)
        return utxos;
    }

}

function parseUtxoResponseBlockCypher(_utxos) {
    let payload = [];
    _utxos.forEach(_utxo => {
        if (_utxo['confirmations'] >= 1) {
            _utxo
            payload.push(new Transaction.UnspentOutput(_utxo));
        }
    })
    return payload;
}

function parseUtxoResponse(_utxos) {
    let payload = [];

    _utxos.forEach(_utxo => {
        if (_utxo['confirmations'] >= 1) {
            payload.push(new Transaction.UnspentOutput(_utxo));
        }
    })
    return payload;
}

module.exports = {
    transfer
}