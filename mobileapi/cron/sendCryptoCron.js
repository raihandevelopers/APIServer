const cron = require('node-cron');
const cryptoLib = require('./cron-lib/sendCrypto')

cron.schedule('* * * * *', () => {
    cryptoLib.sendTransaction()
});