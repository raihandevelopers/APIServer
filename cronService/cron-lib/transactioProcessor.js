require('array-foreach-async')
const mongoose = require('mongoose')
const transactionHistoryModel = require('../models/TransactionHistories')

class processor {
    constructor() {
        this.transactionsToProcess = []
        this.running = false
    }

    queue(transactions) {
        this.transactionsToProcess.push(transactions)
        if(this.running == false){
            processTransactions()
        }
    }

    async processTransactions() {
        while (this.running == true){
            this.transactionsToProcess.forEachAsync(_transaction => {
                let transaction = transactionHistoryModel.findById(_transaction._id0).lean().exec()
                //if(transa)
            })
        }
    }


}