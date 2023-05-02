const express = require('express');
const router = express.Router();
const userRoutes = express.Router()
const authController = require('../controllers/authController')
const messageRoutes = require('./message')

const accountsModel = require('../models/accounts')
/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {
        title: 'Express'
    });
});

router.use('/msg', messageRoutes)

// router.post('/login', authController.validate('login'), authController.login)

//move this to controller - TODO



router.use((err, req, res, next) => {

    res.status(err.statusCode).send({
        status: 'fail',
        message: err.message,
        error: err.errors
    })
})

module.exports = router;