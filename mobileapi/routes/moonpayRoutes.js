const express = require('express')
const router = express.Router()
const db = require('../lib/db')


router.post('/updateTxStatus', async (req, res) => {

    console.log(req.body)
    moonpayResponse = req.body

    //add source and target
    let txData = {
        from: moonpayResponse.data.walletAddress,
        to: moonpayResponse.data.walletAddress,
        sourceAmount: moonpayResponse.data.baseCurrencyAmount,
        targetAmount: moonpayResponse.data.quoteCurrencyAmount,
        status: moonpayResponse.data.status,
        error: moonpayResponse.data.failureReason,
        txHash: moonpayResponse.data.cryptoTransactionId,
        email: moonpayResponse.data.externalCustomerId,
        type: 'buy',
        isMoonpayTx: true,
        txId: moonpayResponse.data.externalTransactionId,
        reason: moonpayResponse.data.failureReason == null ? '' : moonpayResponse.data.failureReason,
        ref: "0",
        isExchange: false
    }
    console.log(txData)
    let resultFromDb = await db.readFromDBAsync({
        txId: txData.txId
    }, "TransactionHistories")
    if (resultFromDb.error == 'nil') {
        if (resultFromDb.message != '') { //TX exists updateStatus
            await db.updateOneAsync({
                txId: txData.txId
            }, txData, "TransactionHistories")
        } else {
            await db.insert(txData, "TransactionHistories")
        }
    }
    res.end()
})

module.exports = router

/**
 * { data:
   { id: '4dca6f93-0570-419a-8cf1-c3d49d8b313b',
     createdAt: '2020-01-29T07:24:06.581Z',
     updatedAt: '2020-01-29T07:24:11.506Z',
     baseCurrencyAmount: 20,
     quoteCurrencyAmount: 0.1094,
     feeAmount: 4.99,
     extraFeeAmount: 1,
     areFeesIncluded: false,
     status: 'completed',
     walletAddress: '0xdb64A80DC3bb0850D7155a2229B7D4c4f4fB6262',
     walletAddressTag: null,
     cryptoTransactionId:
      '0xd70b68c44c67a6a075f1a3ee8f272aca640c528557c77a1324c4a10cfbb5a158',
     failureReason: null,
     returnUrl: 'https://buy-staging.moonpay.io/transaction_receipt',
     redirectUrl: null,
     bankTransferReference: null,
     baseCurrencyId: 'edd81f1f-f735-4692-b410-6def107f17d2',
     currencyId: '8d305f63-1fd7-4e01-a220-8445e591aec4',
     customerId: 'c8b39d20-d00d-492f-a677-e7b7e603bed2',
     cardId: 'f79b05f3-aabd-4156-8a30-61eceb43e90b',
     bankAccountId: null,
     eurRate: 0.90833,
     usdRate: 1,
     gbpRate: 0.76835,
     bankDepositInformation: null,
     externalTransactionId: null },
  type: 'transaction_created',
  externalCustomerId: 'seshanth@shamlatech.com' }

 * 
 */