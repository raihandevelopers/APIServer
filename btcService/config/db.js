var mongoose= require('mongoose');
var config= require('../config');

let mongoUrl ='mongodb://' + config.db.userName+ ':' + config.db.password +'@' + config.db.host + ':' + config.db.port + '/' + config.db.dbName

mongoose.set('useUnifiedTopology', true);
mongoose.connect(mongoUrl, { useNewUrlParser: true });

console.log(mongoUrl);