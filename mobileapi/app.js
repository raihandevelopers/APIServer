var express = require('express');
var path = require('path')
var cookieParser = require('cookie-parser');
var logger = require('morgan');
let responseTime = require('response-time')
var cors = require('cors');
const config = require('./config');
const mongoose = require('mongoose');
const http = require('http')
const socketIO = require('socket.io')

const { createHash } = require('crypto');
const crypto = require('crypto')
// C R E A T I N G     A     H A S H     V A L U E    F O R    T H E    P A S S W O R D 
function hash(data) {
	return createHash('md5').update(data).digest('hex');
}
const net = require('net');


var algorithm = "aes-192-cbc"; //algorithm to use
var password = "Hello darkness";
const key = crypto.scryptSync(password, 'salt', 24); //create key
const iv = Buffer.alloc(16, 0);


function encrypt(text) {

	const cipher = crypto.createCipheriv(algorithm, key, iv);
	var encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex'); // encrypted text
	return encrypted;

}

function decrypt(text) {

	const decipher = crypto.createDecipheriv(algorithm, key, iv);
	var decrypted = decipher.update(text, 'hex', 'utf8') + decipher.final('utf8'); //deciphered text
	return decrypted

}
// mongoose.connect(
// 	'mongodb://' +
// 	config.db.userName +
// 	':' +
// 	config.db.password +
// 	'@' +
// 	config.db.host +
// 	':' +
// 	config.db.port +
// 	'/pinksurfing'
// );

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var detailRouter = require('./routes/detailRoutes');
let txRoutes = require('./routes/txRoutes');
const settingsRoute = require('./routes/settingsRoute');
const chatRoutes = require('./routes/chatRoutes')
const requesti = require('./lib/network')
const moonpayRoutes = require('./routes/moonpayRoutes')
const tokenVerification = require('./lib/jwt');
const requestPromise = require('request-promise');

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
app.use(express.static(path.join(__dirname, '/')));
app.use(cors());

const fileUpload = require('express-fileupload');

app.use(fileUpload()); // For getting kycDocumets
app.get('/test',async(req, res, next) => {
return "Server Is Connected";
});
app.use('/wyre', async(req, res, next) => {

	let url = req.originalUrl
	let paths = url.slice(5)
	let method = req.method

	let wyreUrl = "http://localhost:61609"

	// let data = encrypt(String(JSON.stringify(req.user)))
	let data = (String(JSON.stringify(req.user)))

	console.log("QIUERY::",req.query,req.files)

	let querylength = Object.keys(req.query).length

	console.log("LENGTH:",querylength)

	let response;

	if(method == 'GET'){

		if (querylength == 0){

			console.log("QUERY NOT FOUND")

			response = await requestPromise.get(wyreUrl + paths + `?value=${data}`, {
				method: "GET",
				json: true,
				simple: false,
				resolveWithFullResponse: true
			}).then(function (result) {
				console.log("CODE:",result.statusCode)
				return res.status([`${result.statusCode}`]).send(result.body)
			})
			.catch(function (err) {
				console.log("ECODE:",err)
				return res.status(500).send({
					status:"fail",
					message:"Internal Server Error"
				})
			});

		}
		else if(querylength != 0) {

			console.log("QUERY FOUND",req.query)

			response = await requestPromise.get(wyreUrl + paths + `&value=${data}`, {
				method: "GET",
				json: true,
				simple: false,
				resolveWithFullResponse: true
			}).then(function (result) {
				console.log("CODE:",result.statusCode)
				return res.status([`${result.statusCode}`]).send(result.body)
			})
			.catch(function (err) {
				console.log("ECODE:",err)
				return res.status(500).send({
					status:"fail",
					message:"Internal Server Error"
				})
			});


		}

	}else if (method == 'POST'){

		if(paths == '/users/uploadAttachment'){

			var now = String(new Date().getTime());

			// I N I T I A L I Z I N G    T H E    F I L E N A M E 
			let id_1 = req.files.id_1
		
			// R E N A M I N G    T H E    F I L E N A M E 
			id_1.name = String(now.replace(/\s+/g, '')) + String(id_1.name.replace(/\s+/g, ''));

			console.log("ID",id_1.name)
		
			// M O V E    I M G    T O    K Y C    P A T H
			id_1.mv(path.join(config.attachmentPath, id_1.name));
		
			return res.status(200).send({
				"status":"true",
				"message":"success",
				"data":{
					"fileURL":config.attachmentImgPath+id_1.name
				}
			})		
	}/* else if(paths == '/users/updateProfileImage') {

		let image = req.files.image
		let name = req.user.email + 'profile' + image.name
		image.mv(path.join(config.attachmentPath, name))
		await accountsModel.updateOne({email: req.user.email}, {$set:{profileImage: config.attachmentImgPath +  name}})
		return res.send({
			status: 'success',
			messge: 'Updated',
			data: config.attachmentImgPath +  name
		})
	} */
	req.body.value = req.user
		let info = req.body

		

		response = await requestPromise.post(wyreUrl + paths, {
			method: "POST",
			body: info,
			json: true,
			simple: false,
			resolveWithFullResponse: true
		}).then(function (result) {
			console.log("CODE:",result.statusCode)
			return res.status([`${result.statusCode}`]).send(result.body)
		})
		.catch(function (err) {
			console.log("ECODE:",err)
			return res.status(500).send({
				status:"fail",
				message:"Internal Server Error"
			})
		});


	}


	console.log("###########URL##################",req.originalUrl,req.method,paths)

    next()
})

app.use('/chat',tokenVerification, async(req, res, next) => {

	let url = req.originalUrl
	let paths = url.slice(5)
	let method = req.method

	let chatUrl = "http://localhost:6161"

	// let data = encrypt(String(JSON.stringify(req.user)))
	let data = (String(JSON.stringify(req.user)))

	console.log("QIUERY::",req.query,req.files)

	let querylength = Object.keys(req.query).length

	console.log("LENGTH:",querylength)

	let response;

	if(method == 'GET'){

		if (querylength == 0){

			console.log("QUERY NOT FOUND")

			response = await requestPromise.get(chatUrl + paths + `?value=${data}`, {
				method: "GET",
				json: true,
				simple: false,
				resolveWithFullResponse: true
			}).then(function (result) {
				console.log("CODE:",result.statusCode)
				return res.status([`${result.statusCode}`]).send(result.body)
			})
			.catch(function (err) {
				console.log("ECODE:",err)
				return res.status(500).send({
					status:"fail",
					message:"Internal Server Error"
				})
			});

		}
		else if(querylength != 0) {

			console.log("QUERY FOUND",req.query)

			response = await requestPromise.get(chatUrl + paths + `&value=${data}`, {
				method: "GET",
				json: true,
				simple: false,
				resolveWithFullResponse: true
			}).then(function (result) {
				console.log("CODE:",result.statusCode)
				return res.status([`${result.statusCode}`]).send(result.body)
			})
			.catch(function (err) {
				console.log("ECODE:",err)
				return res.status(500).send({
					status:"fail",
					message:"Internal Server Error"
				})
			});


		}

	}else if (method == 'POST'){

		if(paths == '/users/uploadAttachment'){

			var now = String(new Date().getTime());

			// I N I T I A L I Z I N G    T H E    F I L E N A M E 
			let id_1 = req.files.id_1
		
			// R E N A M I N G    T H E    F I L E N A M E 
			id_1.name = String(now.replace(/\s+/g, '')) + String(id_1.name.replace(/\s+/g, ''));

			console.log("ID",id_1.name)
		
			// M O V E    I M G    T O    K Y C    P A T H
			id_1.mv(path.join(config.attachmentPath, id_1.name));
		
			return res.status(200).send({
				"status":"true",
				"message":"success",
				"data":{
					"fileURL":config.attachmentImgPath+id_1.name
				}
			})		
	}/* else if(paths == '/users/updateProfileImage') {

		let image = req.files.image
		let name = req.user.email + 'profile' + image.name
		image.mv(path.join(config.attachmentPath, name))
		await accountsModel.updateOne({email: req.user.email}, {$set:{profileImage: config.attachmentImgPath +  name}})
		return res.send({
			status: 'success',
			messge: 'Updated',
			data: config.attachmentImgPath +  name
		})
	} */

		let info = req.body

		req.body.value = req.user

		response = await requestPromise.post(chatUrl + paths, {
			method: "POST",
			body: info,
			json: true,
			simple: false,
			resolveWithFullResponse: true
		}).then(function (result) {
			console.log("CODE:",result.statusCode)
			return res.status([`${result.statusCode}`]).send(result.body)
		})
		.catch(function (err) {
			console.log("ECODE:",err)
			return res.status(500).send({
				status:"fail",
				message:"Internal Server Error"
			})
		});


	}


	console.log("###########URL##################",req.originalUrl,req.method,paths)

    next()
})

app.post('/users/updateProfileImage', tokenVerification, async(req, res, next) => {
try{


	if(!req.files)
	{
		res.send("File was not found");
		return;
	}

	// file = req.files.fileName;  // here is the field name of the form

	// res.send("File Uploaded");

		 let image = req.files.image
                let name = req.user.email + 'profile' + image.name
				console.log(config.attachmentPath)
                image.mv(path.join(config.attachmentPath, name))
                await accountsModel.updateOne({email: req.user.email}, {$set:{profileImage: config.attachmentImgPath +  name}})
                return res.send({
                        status: 'success',
                        messge: 'Updated',
                        data: config.attachmentImgPath +  name
                })
} catch(e) {
	console.log(e)
	res.status(500).send({status: 'fail', message:'error occurred'})
}
})

app.post('/users/updateGroupImg', tokenVerification, async(req, res, next) => {
	try{
		var file;

        if(!req.files)
        {
            res.send("File was not found");
            return;
        }
    
        // file = req.files.fileName;  // here is the field name of the form
    
        // res.send("File Uploaded");

			 let image = req.files.image
			 let {channel} = req.body
			 console.log("CHANNEL",channel)
					let name = req.user.email + 'group' + image.name
					console.log("NAME",name)
					image.mv(path.join(config.attachmentPath, name))
					 await groupModel.updateOne({channel: channel}, {$set:{group_image: config.attachmentImgPath + name}})
					return res.send({
							status: 'success',
							messge: 'Updated',
							image : config.attachmentImgPath + name
							// data: config.attachmentImgPath +  name
					})
	} catch(e) {
		console.log(e)
		res.status(500).send({status: 'fail', message:'error occurred'})
	}
	})

app.post('/users/updateBsuinessImage', tokenVerification, async(req, res, next) => {
	try{
	
			let image = req.files.image;
			let name = req.user.email + 'business' + image.name;
			image.mv(path.join(config.attachmentPath, name));
			console.log("fgfgfgfgfg",config.attachmentImgPath +  name);
			//await accountsModel.updateOne({email: req.user.email}, {$set:{profileImage: config.attachmentImgPath +  name}})
			return res.send({
					status: 'success',
					messge: 'Updated',
					data: config.attachmentImgPath +  name
			})
	} catch(e) {
		console.log(e)
		res.status(500).send({status: 'fail', message:'error occurred'})
	}
	})

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/detail', detailRouter);
app.use('/tx', txRoutes);
app.use('/moonpay', moonpayRoutes)
app.use('/settings', settingsRoute);
app.use('/payChat', chatRoutes)


const cron = require('node-cron');
let accountsModel = require('./models/accountsModel');
let groupModel = require('./models/group')
let infoModel = require('./models/info');
let controller = require('./controllers/detaliRouteController');
let chartsModel = require('./models/charts');
const marketInfoModel = require('./models/marketInfo');
const graphModel = require('./models/graph');
require('array-foreach-async');
mongoose.set('strictQuery', false);
mongoose.set('debug', true);

mongoose
	.connect(
		// 'mongodb://localhost:27017/myapp'
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
		cron.schedule('0 0 * * *', async () => {
			// T I M E S T A M P    F O R    T H E    S T A R T    O F    T H E    D A Y
			var now = new Date();

			let today = now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();

			let data = await controller.getMarketInfo();
			if (data == 'error' || undefined || '' || null) {
				return
			/*	res.status(500).send({
					status: 'fail',
					message: '',
					error: 'error',
				}); */
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
		// let lastmailsend = 0
		// cron.schedule('3 * * * * *', async () => {
		// 	// T I M E S T A M P    F O R    T H E    S T A R T    O F    T H E    D A Y
		// 	var now = new Date();

		// 	let data = await controller.getMarketInfo();
		// 	if (data == 'error' || undefined || '' || null) {
		// 		if (lastmailsend - new Date().getTime() > 3600000) {
		// 			lastmailsend = new Date().getTime()
		// 			let admins = await accountsModel.find({ adminLevel: 0 })

		// 			admins.forEach(async result => {
		// 				requesti.post(config.services.emailService + '/sendMarketEmail', {
		// 					email: result.email
		// 				})
		// 			})
		// 			return
		// 		}


		// 		return

		// 	}

		// 	let today = now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();

		// 	var BTCdata = await controller.getMarketConvertData(1,"USD","BTC");
		// 	var BTC = BTCdata.data.quote["BTC"].price

		// 	var ETHdata = await controller.getMarketConvertData(1,"USD","ETH");
		// 	var ETH = ETHdata.data.quote["ETH"].price

		// 	var USDTdata = await controller.getMarketConvertData(1,"USD","USDT");
		// 	var USDT = USDTdata.data.quote["USDT"].price

		// 	data = await controller.getMarketInfo();
		// 	if (data == 'error' || undefined || '' || null) {
		// 		/*res.status(500).send({
		// 			status: 'fail',
		// 			message: '',
		// 			error: 'error',
		// 		}); */
		// 	} else {
		// 		let result_24change = [];
		// 		let result_price = [];

		// 		Object.keys(data.data).forEach(_key => {
		// 			data.data[_key].symbol = _key;
		// 			result_24change.push(data.data[_key].quote['USD'].percent_change_24h);
		// 			result_price.push(data.data[_key].quote['USD'].price);
		// 		});

		// 		// console.log('afknkafshkasf', result_24change,result_price);

		// 		let dataToInsert = {
		// 			BTC: {
		// 				change_24: result_24change[0],
		// 				price: result_price[0],
		// 				FromUSD:BTC
		// 			},
		// 			ETH: {
		// 				change_24: result_24change[1],
		// 				price: result_price[1],
		// 				FromUSD:ETH
		// 			},
		// 			USDT: {
		// 				change_24: result_24change[2],
		// 				price: result_price[2],
		// 				FromUSD:USDT
		// 			},
		// 			MYBIZ:{
		// 				change_24:"0.00",
		// 				price:"1",
		// 				FromUSD:"1"
		// 			}
		// 		};

		// 		await marketInfoModel
		// 			.updateOne(
		// 				{},
		// 				{ $set: dataToInsert },
		// 				{
		// 					multi: true,
		// 				}
		// 			)
		// 			.exec();
		// 	}
		// });

		// B T C    V S     A E D     H O U R L Y
		cron.schedule('*/59  * * * *', async () => {
			// T I M E S T A M P    F O R    T H E    S T A R T    O F    T H E    D A Y
			var now = new Date();

			let today = now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();

			let hour = now.getUTCHours();

			let data = await controller.getMarketInfo();
			if (data == 'error' || undefined || '' || null) {
				return
				/*res.status(500).send({
					status: 'fail',
					message: '',
					error: 'error',
				}); */
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
				return
				/*res.status(500).send({
					status: 'fail',
					message: '',
					error: 'error',
				}); */
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
				return
				/*res.status(500).send({
					status: 'fail',
					message: '',
					error: 'error',
				}); */
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
				return
				/*res.status(500).send({
					status: 'fail',
					message: '',
					error: 'error',
				}); */
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
				return
				/*res.status(500).send({
					status: 'fail',
					message: '',
					error: 'error',
				}); */
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

	
console.log('hello')
let server = http.createServer(app)
let io = socketIO(server)
io.on("connection", (socket) => {
	console.log("Connected")
})

server.listen(config.server.port)
// app.listen(config.server.port)
module.exports = app;
