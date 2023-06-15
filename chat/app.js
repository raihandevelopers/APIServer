require('dotenv').config()
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const mongoose = require('mongoose')
const config = require('./config')
const { createHash } = require('crypto');
const crypto = require('crypto')
// C R E A T I N G     A     H A S H     V A L U E    F O R    T H E    P A S S W O R D 
function hash(data) {
	return createHash('md5').update(data).digest('hex');
}


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

//[Localhost]-------------------------------------------------
//use mongoose library to set up the database connection with MongoDB. 
//  mongoose.Promise = global.Promise;
//  mongoose.connect(config.DB, { useNewUrlParser: true }).then(
//    () => {console.log('Database is connected') },
//    err => { console.log('Can not connect to the database'+ err)}
//  );
//-------------------------------------------------------------
var Sync = require('sync');
const asyncForEach = require('async-await-foreach');
//-------------------------------------------------------------

mongoose.connect(`mongodb://${config.db.userName}:${config.db.password}@${config.db.host}:${config.db.port}/${config.db.dbName}`).then(() => {
    console.log('=============== mongo connected ================')
}).catch(e => console.log("Error",e))	

mongoose.connection.on('error', () => {
    mongoose.disconnect()
})

mongoose.connection.on('disconnected', () => {
    mongoose.connect(`mongodb://${config.db.userName}:${config.db.password}@${config.db.host}:${config.db.port}/${config.db.dbName}`).then(() => {
    console.log('=============== mongo re-connected ================')
}).catch(e => console.log("Error",e))	
})

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const authRoute = require('./routes/auth.route');
//[pernal-chat]--------------------------------------
const chatroomRoute = require('./routes/chatroom.route'); // => /chats
const contactsRoute = require('./routes/contacts.route');
const chatconversationRoute = require('./routes/chatconversation.route');

const callRoutes = require('./routes/CallRoutes') // => /calls
const groupRoutes = require('./routes/groupRoutes')

var app = express();

app.disable('etag');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));

app.use(async(req, res, next) => {
	let method = req.method
	let chatUrl = "http://localhost"//"https://mobileapi.pinksurfing.com"
    let value;

	if(method == 'GET'){
		let querylength = Object.keys(req.query).length
        // console.log("QUERY_LENGTH:",querylength,req.query)

		if (querylength == 1){
		    value = req.query.value
        // console.log("VALUES:",value)
                req.user = JSON.parse(value)
                // console.log("req.user",req.user)
		} else {
            value = req.query.value
            console.log('else' + value)
            req.user = JSON.parse(value)
        // console.log("VALUES:",value)
		}
	}else if (method == 'POST'){
	 // console.log("VALUES",req.body)
        // old code have issues 
        // value = req.body.value
        // req.user = value

        //updated code 
        value = req.body
        req.user = value

		
	}
    // console.log("USER:",req.user)
    next()
})


app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	// console.log(req.headers)
    next();
});

app.get('/*', function(req, res, next){ 
    res.setHeader('Last-Modified', (new Date()).toUTCString());
    next(); 
});


app.use('/', indexRouter);
app.use('/auth', authRoute);
app.use('/users', usersRouter);
app.use('/contacts', contactsRoute);
app.use('/calls', callRoutes);
app.use('/group', groupRoutes);
//[pernal-chat]--------------------------------------
app.use('/chats', chatroomRoute);
app.use('/chatconversations', chatconversationRoute);

//[localhost]-----------------------------------------
//catch 500 and forward to error handler
app.use(function (req, res, next) {
    // res.status(404);
    res.status(404).end(JSON.stringify({
        message: "page not found",
        error: {}
    }));
});

const port = process.env.PORT || 6161;
const server = app.listen(port, function(){
 console.log('Listening on port ' + port);
});
//---------------------------------------------------

//module.exports = app;
