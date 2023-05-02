const cron = require('node-cron');
const transactionHistories = require('../models/TransactionHistories')
const transactions = require('../models/transactions')
const request = require('request-promise')

cron.schedule('* * * * *', async() => {

    let txn = await transactions.find({})
    var id;

    txn.forEach(res => {
        let response = await request(`https://api.godex.io/api/v1/transaction/${res.depositExtraId}}`, {
            method: 'GET',
        })
        if(response.status == "success"){
            await transactions.updateOne({providerId: result.providerId},{
                $set:{
                    status: result.status,
                    hash_in: result.hash_in,
                    hash_out:result.hash_out
                }
            }).lean().exec()

        }
    });



})