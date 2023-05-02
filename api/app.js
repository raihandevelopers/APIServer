var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
let responseTime = require('response-time');
var cors = require('cors');
const config = require('./config');
const mongoose = require('mongoose');
const tokenVerification = require('./lib/jwt');

mongoose.connect(
	'mongodb://' +
	config.db.userName +
	':' +
	config.db.password +
	'@' +
	config.db.host +
	':' +
	config.db.port +
	'/pinkSurf'
);

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var detailRouter = require('./routes/detailRoutes');
let txRoutes = require('./routes/txRoutes');
const settingsRoute = require('./routes/settingsRoute');
const requesti = require('./lib/network')
const moonpayRoutes = require('./routes/moonpayRoutes')

var app = express();
app.use(responseTime());
app.use(logger('dev'));
app.use(express.json());
app.use(
	express.urlencoded({
		extended: false,
	})
);
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'cryptos')));
app.use(cors());

app.use('/chat',tokenVerification,async(req, res, next) => {

	console.log("###########URL##################",req.originalUrl)

    req.userData = { ip: "a" }
    req.userData.ip = ip
    next()
})


app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/detail', detailRouter);
app.use('/tx', txRoutes);
app.use('/moonpay', moonpayRoutes)
app.use('/settings', settingsRoute);

const cron = require('node-cron');
let accountsModel = require('./models/accountsModel');
let infoModel = require('./models/info');
let controller = require('./controllers/detaliRouteController');
let chartsModel = require('./models/charts');
const marketInfoModel = require('./models/marketInfo');
const graphModel = require('./models/graph');
require('array-foreach-async');

mongoose
	.connect(
		'mongodb://' +
		config.db.userName +
		':' +
		config.db.password +
		'@' +
		config.db.host +
		':' +
		config.db.port +
		'/pinkSurf'
	)
	.then(() => {

		// F I A T    B A L A N C E     D A I L Y
		cron.schedule('0 0 * * *', async () => {
			// T I M E S T A M P    F O R    T H E    S T A R T    O F    T H E    D A Y
			var now = new Date();

			let today = now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();

			let hour = now.getUTCHours();

			console.log('TODAY:', today, '\nHOUR:', hour);

			let acc = await accountsModel.find({});

			// await acc.forEachAsync(async _wallet => {

			// }

			acc.forEachAsync(async _txns => {
				await infoModel.updateOne(
					{
						date: {
							$in: true,
						},
					},
					{
						$set: {
							email: _txns.email,
							phone: _txns.phone,
							date: today,
							time: 'DAYS',
							fiatBalance: _txns.fiatBalance,
						},
					},
					{
						upsert: true,
					}
				);
			});

			w = await infoModel.find({ time: 'DAYS' });
			console.log('adjgnsdfs', w);
		});

		// C O I N     M A R K E T     C A P    E A C H    D A Y     P R I C E     C H A N G E
		// cron.schedule('0 0 * * *', async () => {
		// 	// T I M E S T A M P    F O R    T H E    S T A R T    O F    T H E    D A Y
		// 	var now = new Date();

		// 	let today = now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();

		// 	let data = await controller.getMarketInfo();
		// 	if (data == 'error' || undefined || '' || null) {
		// 		res.status(500).send({
		// 			status: 'fail',
		// 			message: '',
		// 			error: 'error',
		// 		});
		// 	} else {
		// 		let result = [];

		// 		Object.keys(data.data).forEach(_key => {
		// 			data.data[_key].symbol = _key;
		// 			result.push(data.data[_key].quote['USD'].price);
		// 		});

		// 		console.log('afknkafshkasf', result);

		// 		let r = await chartsModel.updateOne(
		// 			{
		// 				date: {
		// 					$in: true,
		// 				},
		// 			},
		// 			{
		// 				$set: {
		// 					BTC: result[0],
		// 					ETH: result[1],
		// 					USDT: result[2],
		// 					date: today,
		// 				},
		// 			},
		// 			{
		// 				upsert: true,
		// 			}
		// 		);
		// 	}
		// });

		cron.schedule('0 0 * * *', async () => {
			// T I M E S T A M P    F O R    T H E    S T A R T    O F    T H E    D A Y
			var now = new Date();

			let today = now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();

			let data = await controller.getMarketInfo();
			
			//console.log("data",data)
			console.log("data1",data1)
			if (data == 'error' || undefined || '' || null) {
				// res.status(500).send({
				// 	status: 'fail',
				// 	message: '',
				// 	error: 'error',
				// });
			} else {
				let result = [];

				Object.keys(data.data).forEach(_key => {
					data.data[_key].symbol = _key;
					result.push(data.data[_key].quote['USD'].price);
				});

				console.log('afknkafshkasf', result);

				let r = await chartsModel.updateOne(
					{
						date: {
							$in: true,
						},
					},
					{
						$set: {
							BTC: result[0],
							ETH: result[1],
							USDT: result[2],
							date: today,
						},
					},
					{
						upsert: true,
					}
				);
			}
		});

		// C O I N     M A R K E T     C A P    E A C H   \secondsY (CRYPTO <-> USD)     P R I C E     C H A N G E
		let lastmailsend = 0

		cron.schedule('5 * * * * *', async () => {
			// T I M E S T A M P    F O R    T H E    S T A R T    O F    T H E    D A Y
			var now = new Date();
			
			let data = await controller.getMarketInfo();
			
			if (data == 'error' || undefined || '' || null) {
				if (lastmailsend - new Date().getTime() > 3600000) {
					lastmailsend = new Date().getTime()
					let admins = await accountsModel.find({ adminLevel: 0 })

					admins.forEach(async result => {
						requesti.post(config.services.emailService + '/sendMarketEmail', {
							email: result.email
						})
					})
					return
				}


				return

			}

			let today = now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();

			var BTCdata = await controller.getMarketConvertData(1, "USD", "BTC");
			var BTC = BTCdata.data.quote["BTC"].price

			var ETHdata = await controller.getMarketConvertData(1, "USD", "ETH");
			var ETH = ETHdata.data.quote["ETH"].price

			var USDTdata = await controller.getMarketConvertData(1, "USD", "USDT");
			var USDT = USDTdata.data.quote["USDT"].price

			//data = await controller.getMarketInfo();
			
			if (data == 'error' || undefined || '' || null) {
				// res.status(500).send({
				// 	status: 'fail',
				// 	message: '',
				// 	error: 'error',
				// });
			} else {
				let result_24change = [];
				let result_price = [];

				Object.keys(data.data).forEach(_key => {
					data.data[_key].symbol = _key;
					console.log("_key",_key)
					console.log("_key",data.data[_key])
					result_24change.push(data.data[_key].quote['USD'].percent_change_24h);
					result_price.push(data.data[_key].quote['USD'].price);
				});

				console.log('afknkafshkasf', result_24change,result_price);

				let dataToInsert = {
					BTC: {
						change_24: result_24change[0],
						price: result_price[0],
						FromUSD: BTC
					},
					ETH: {
						change_24: result_24change[1],
						price: result_price[1],
						FromUSD: ETH
					},
					USDT: {
						change_24: result_24change[2],
						price: result_price[2],
						FromUSD: USDT
					},
					MYBIZ: {
						change_24: "0.00",
						price: "1",
						FromUSD: "1"
					}
				};

				await marketInfoModel
					.updateOne(
						{},
						{ $set: dataToInsert },
						{
							multi: true,
						}
					)
					.exec();
			}
		});

		// B T C    V S     A E D     H O U R L Y
		cron.schedule('*/59  * * * *', async () => {
			// T I M E S T A M P    F O R    T H E    S T A R T    O F    T H E    D A Y
			var now = new Date();

			let today = now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();

			let hour = now.getUTCHours();

			let data = await controller.getMarketInfo();
			
			if (data == 'error' || undefined || '' || null) {
				console.log("ERROR")
				return
			}
			var rate;

			Object.keys(data.data).forEach(_key => {
				rate = Number(data.data['BTC'].quote['USD'].price);
			});

			await graphModel.updateOne(
				{
					date: {
						$in: true,
					},
				},
				{
					$set: {
						date: today,
						time: hour,
						rate: rate,
						type: 'HOUR',
					},
				},
				{
					upsert: true,
				}
			);
		});

		// B T C    V S     A E D     D A I L Y
		cron.schedule('0 0 * * *', async () => {
			// T I M E S T A M P    F O R    T H E    S T A R T    O F    T H E    D A Y
			var now = new Date();

			let today = now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();

			let hour = now.getUTCHours();

			let data = await controller.getMarketInfo();
			
			if (data == 'error' || undefined || '' || null) {
				res.status(500).send({
					status: 'fail',
					message: '',
					error: 'error',
				});
			}
			var rate;

			Object.keys(data.data).forEach(_key => {
				rate = Number(data.data['BTC'].quote['USD'].price);
			});

			await graphModel.updateOne(
				{
					date: {
						$in: true,
					},
				},
				{
					$set: {
						date: today,
						// time: hour,
						rate: rate,
						type: 'DAY',
					},
				},
				{
					upsert: true,
				}
			);
		});

		// B T C    V S     A E D     W E E K L Y
		cron.schedule('0 0 * * 0', async () => {
			// T I M E S T A M P    F O R    T H E    S T A R T    O F    T H E    D A Y
			var now = new Date();

			let today = now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();

			let hour = now.getUTCHours();

			let data = await controller.getMarketInfo();
			
			if (data == 'error' || undefined || '' || null) {
				res.status(500).send({
					status: 'fail',
					message: '',
					error: 'error',
				});
			}
			var rate;

			Object.keys(data.data).forEach(_key => {
				rate = Number(data.data['BTC'].quote['USD'].price);
			});

			await graphModel.updateOne(
				{
					date: {
						$in: true,
					},
				},
				{
					$set: {
						date: today,
						// time: hour,
						rate: rate,
						type: 'WEEK',
					},
				},
				{
					upsert: true,
				}
			);
		});

		// B T C    V S     A E D     M O N T H L Y
		cron.schedule('0 0 1 * *', async () => {
			// T I M E S T A M P    F O R    T H E    S T A R T    O F    T H E    D A Y
			var now = new Date();

			let today = now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();

			let hour = now.getUTCHours();

			let data = await controller.getMarketInfo();
			
			if (data == 'error' || undefined || '' || null) {
				res.status(500).send({
					status: 'fail',
					message: '',
					error: 'error',
				});
			}
			var rate;

			Object.keys(data.data).forEach(_key => {
				rate = Number(data.data['BTC'].quote['USD'].price);
			});

			await graphModel.updateOne(
				{
					date: {
						$in: true,
					},
				},
				{
					$set: {
						date: today,
						// time: hour,
						rate: rate,
						type: 'MONTH',
					},
				},
				{
					upsert: true,
				}
			);
		});

		// B T C    V S     A E D     Y E A R L Y 
		cron.schedule('59 23 31 12 *', async () => {
			// T I M E S T A M P    F O R    T H E    S T A R T    O F    T H E    D A Y
			var now = new Date();

			let today = now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();

			let hour = now.getUTCHours();

			let data = await controller.getMarketInfo();
			
			if (data == 'error' || undefined || '' || null) {
				res.status(500).send({
					status: 'fail',
					message: '',
					error: 'error',
				});
			}
			var rate;

			Object.keys(data.data).forEach(_key => {
				rate = Number(data.data['BTC'].quote['USD'].price);
			});

			await graphModel.updateOne(
				{
					date: {
						$in: true,
					},
				},
				{
					$set: {
						date: today,
						// time: hour,
						rate: rate,
						type: 'YEAR',
					},
				},
				{
					upsert: true,
				}
			);
		});


	});
app.listen(config.server.port)

module.exports = app;
