# ANXO BACKEND

### Server Setup

``` 
$ git clone https://gitlab.com/blockchain-sts/anxobackend

$ cd anxobackend

# Install dependencies
$ npm i

# Start Cron
$ pm2 start --name ethCronAnxo ./cron/ethTransactions.js
$ pm2 start --name sendCrypto-cron ./cron/sendCryptoCron.js 

# Start Backend
$ pm2 start --name anxoBackend npm -- start 
```

### Directory Structure

`kyc/` - uploaded KYC documents will be saved here.

`lib/` - Code for handling db, ETHwallet, BtcWallet.

`routes/` - Api routes

`Static/` - ERC20 ABI