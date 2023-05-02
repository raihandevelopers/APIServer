// user.route.js

const express = require('express');
const app = express();
const authRoutes = express.Router();
//const passport = require('passport');

// Require user model in our routes module
let Accounts = require('../models/accounts');
		
// Defined store route: 
// passport-local-mongoose: Convenience method to register a new user instance with a given password.                  
authRoutes.route('/register').post(function (req, res) {
	
	//Token Generated for sendMail verification:
	let accounts = new Accounts(req.body);	
    accounts.save()
    .then(accounts => {
      res.status(200).json({'User': 'User has been registered successfully'});
    })
    .catch(err => {
    res.status(400).send("unable to save to database");
    });

});

authRoutes.route('/').get(function (req, res) {
  Accounts.find(function (err, users) {
      if (err) {
          console.log(err);
      }
      else {
          res.json(users);
      }
  });
}); 

module.exports = authRoutes;