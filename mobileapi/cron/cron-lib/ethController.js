
const db = require('../../lib/db')


const handleAdminAddressTransaction = async(tx)=>{
    const txData = (await db.readFromDBAsync({txHash: tx.hash})).message
    if(txData.type == 'buy' || 'sell'){

        await db.updateOneAsync({txHash: tx.hash}, {
            status: 'processing'
        }, "TransactionHistories")
    }
}

module.exports = {
    handleAdminAddressTransaction
}