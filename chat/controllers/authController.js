const accountsModel = require('../models/accounts')
const body = require('express-validator').body
const header = require('express-validator').header
const validationResult = require('express-validator').validationResult
const express = require('express')
const router = express.Router()

const cache = require('../src/cache')
const config = require('../config')

const Account = require('../src/account')
const CustomError = require('../src/error')
const TokenValidator = require('../src/TokenValidator')
const tokenValidator = new TokenValidator(config.token.password, {expiresIn: "30d"})
const crypto = require('crypto')

const {createHash} = require('crypto'); 

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

const login = async (req, res, next) => {
    try {
        let errors = validationResult(req)

        if (errors.isEmpty() == false) {
            console.log(errors.array())
            next(new CustomError('Invalid Inputs', 422, errors.array()))

        } else {
            let account = new Account({
                email: req.body.email
            })

            let user = await account.getAccount()

            let userPassword = hash(req.body.password)

            let dbPassword = decrypt(user.password)

            console.log("USERPASS",userPassword)
            console.log("DBPASS", dbPassword)

            if (user != undefined) {
                if (dbPassword == userPassword) {

                    if(user.messengerId ==('' || undefined )) {
                        let messgengerId = Math.floor(1000000000 + Math.random() * 9000000000);
                        await accountsModel.updateOne({email: req.body.email}, {
                            $set: {
                                messengerId: messgengerId
                            }
                        })

                        user.messengerId = messgengerId
                    }

                    let token = tokenValidator.sign({email: req.body.email})
                    user['sessionId'] = token

                    //90 days : 5days
                    let tokenExpiry = req.body.isLoggedIn ? 776000 * 1000 : 432000 * 1000
                    cache.create(cache.collectionName.session, req.body.email, user, tokenExpiry)
                    res.header('authorization', token)
                    res.send({
                        status: 'success',
                        token: token,
                        data: user
                    })
                } else {
                    res.status(422).send({
                        status: 'fail',
                        message: 'Incorrect Email or Password'
                    })
                }
            } else {
                res.status(422).send({
                    status: 'fail',
                    message: 'Incorrect Email or Password'
                })
            }
        }
    } catch (error) {
        next(new CustomError(error.message, 500, error.errors), req, res)
    }

}


router.use((err, req, res, next) => {
    res.status(500).send({
        status: 'fail',
        message: err.message,
        error: err.errors
    })
})

const validate = route => {
    switch (route) {
        case 'login':
            return [
                body('email', 'is Invalid').isEmail().notEmpty().exists(),
                body('password', 'is Invalid').notEmpty().isLength({
                    min: 8
                })
            ]
    }
}



module.exports = {
    validate,
    login
}