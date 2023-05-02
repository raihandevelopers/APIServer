const cron = require('node-cron');
const mongoose = require('mongoose')
const config = require('./config')
let transactionModel = require('./models/TransactionHistories')
let statisticsModel = require('./models/statistics')

mongoose.connect('mongodb://' + config.db.userName + ':' + config.db.password + '@' + config.db.host + ':' + config.db.port + '/pinksurfing').then(() => {
    cron.schedule('* * * * *', async() => {
    	let tx = await transactionModel.find({})

        // T I M E S T A M P    F O R    T H E    S T A R T    O F    T H E    D A Y 
        var now = new Date();
        var startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var currTimestamp = +((startOfDay / 1000)+""+"000");


        // T I M E S T A M P    F O R    T H E    S T A R T    O F    T H E    P R E V I O U S    D A Y  
        var before = new Date();
        before.setDate(before.getDate() - 1);        
        var prevStartofDay = new Date(before.getFullYear(), before.getMonth(), before.getDate());
        var prevTimestamp = +((prevStartofDay/1000)+""+"000");

        let count = 0;

    	tx.forEach(_txns => {
    	  if((currTimestamp > _txns.timestamp)&&((_txns.timestamp>=prevTimestamp)&&(_txns.timestamp<currTimestamp))){
            ++count;
    	  } 
    	})

        // statisticsModel.create(info,function(err,info){
        //     if (err) {
        //         return res.send({ status: false, message: err.message + "'error':'An error has occurred'" });
        //     } else {
        //         return res.send({ status: true, message: "saved successfully", count:count });
        //     }
        // })

    });
})