var express = require('express');
var path = require('path');
require('array-foreach-async');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const config = require('./config')
const mongoose = require('mongoose');
var cors= require('cors');
var bodyParser = require('body-parser') 

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
let adminRoutes = require('./routes/adminRoutes')

let mongoUrl ='mongodb://' + config.db.userName+ ':' + config.db.password +'@' + config.db.host + ':' + config.db.port + '/' + config.db.dbName

mongoose.set('useUnifiedTopology', true);
// mongoose.connect(mongoUrl, { useNewUrlParser: true });

var app = express();

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.urlencoded({
	extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});



app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/admin', adminRoutes)



const cron = require('node-cron');
// const mongoose = require('mongoose')
// const config = require('./config')
let transactionModel = require('./models/TransactionHistories')
let statisticsModel = require('./models/statistics')
let accountsModel = require('./models/accountsModel')
let walletModel = require('./models/wallets')
const marketCap = require('./controller/cryptoMarketCap')



mongoose.connect('mongodb://' + config.db.userName + ':' + config.db.password + '@' + config.db.host + ':' + config.db.port + '/' + config.db.dbName).then(() => {
    
//     cron.schedule('* * * * *', async()=>{
//       await statisticsModel.update(
//         {
//           monthly:{
//             $in:true
//           }
//         },        
//           {
//             $set: {
//               date:"30/5/2020", 
//               count:11,
//               payOutProfit:Number("22").toFixed(4),
//               transferProfit:Number("15").toFixed(4),
//               monthly:"monthly"
//             }
//           },{
//             upsert:true
//           })


//           console.log("Asfajhfn,asjfk",)


// })

    cron.schedule('0 0 * * *', async() => {
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

    	// console.log("MONTH",before.getMonth()+1)
    	// console.log("DAY",before.getDate())
    	// console.log("YEAR",before.getFullYear())


    	// console.log("TODAY",currTimestamp);
      // console.log("YESTERDAY",prevTimestamp)
      let btc = 0
      let eth = 0
      let usdt = 0
      let mybiz =0

      let wa = await walletModel.find({}) 
      wa.forEach(async result=>{
       btc= Number(btc)+ Number(result.btc.balance)
       eth= Number(eth)+ Number(result.eth.balance)
       usdt= Number(usdt)+ Number(result.usdt.balance)
       mybiz= Number(mybiz)+ Number(result.mybiz.balance)  
      })



      let fiatAmt = 0
      let acc = await accountsModel.find({}) 
      acc.forEach(async result=>{
   
       fiatAmt= Number(fiatAmt)+ Number(result.fiatBalance)
  
      })


        let prevDate = before.getDate()+"/"+(before.getMonth()+1)+"/"+before.getFullYear();    	
        await statisticsModel.update(
        {
          count:{
            $in:true
          }
        },        
          {
            $set: {
              date:prevDate, 
              count:count,
              walletCount:{
                fiatAmount:Number(fiatAmt).toFixed(4),
                ETH:(Number(eth)/10**18).toFixed(4),
                BTC:Number(btc).toFixed(4),
                USDT:Number(usdt).toFixed(4),
                MYBIZ:Number(mybiz).toFixed(4)
              }
            }
          },{
            upsert:true
          })

        // w = await statisticsModel.find({})
        // console.log("adjgnsdfs",w)
    });


    cron.schedule('* * 1 * *', async() => {
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
         ++count;
    	})

    	// console.log("MONTH",before.getMonth()+1)
    	// console.log("DAY",before.getDate())
    	// console.log("YEAR",before.getFullYear())


    	// console.log("TODAY",currTimestamp);
      // console.log("YESTERDAY",prevTimestamp)
      
      let transaction = await transactionModel.find({type:'sell'})
  
      let currentPayOut = 0;
      var startOfMonth_ = new Date(now.getFullYear(), now.getMonth()-1);
      var endofMonth_ = new Date(now.getFullYear(), now.getMonth());
      var currTimestamp_ = +((startOfMonth_ / 1000)+""+"000");
      var nextTimestamp_ = +((endofMonth_ / 1000)+""+"000");
    
      transaction.forEach(result=>{
        if(result.payOutProfit != undefined && result.timestamp>currTimestamp_ && result.timestamp<nextTimestamp_)
        {
          currentPayOut+=Number(result.payOutProfit)
        }
      })



      // TRANSFER 


      let transactions = await transactionModel.find({type:'send'})
      let currTransferProfit = 0;

      transactions.forEach(result=>{
        if(result.fee != undefined && result.timestamp>currTimestamp && result.timestamp<nextTimestamp){
          currTransferProfit+=Number(result.fee)
        }
      })

      let currTransfer = await marketCap.getMarketConvertData(currTransferProfit, "ETH", "USD")
      
      let currAmt = currTransfer.data.quote["USD"].price



        let prevDate = before.getDate()+"/"+(before.getMonth()+1)+"/"+before.getFullYear();    	
        await statisticsModel.update(
        {
          monthly:{
            $in:true
          }
        },        
          {
            $set: {
              date:prevDate, 
              count:count,
              payOutProfit:Number(currentPayOut).toFixed(4),
              transferProfit:Number(currAmt).toFixed(4),
              monthly:"monthly"
            }
          },{
            upsert:true
          })

        // w = await statisticsModel.find({})
        // console.log("adjgnsdfs",w)
    });


})

app.listen(config.server.port)
module.exports = app;
