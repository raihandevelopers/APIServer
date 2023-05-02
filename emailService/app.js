var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const config = require('./config')
const mongoose = require('mongoose')
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

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


var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

module.exports = app;
