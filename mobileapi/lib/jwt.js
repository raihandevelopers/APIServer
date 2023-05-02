const jwt = require('jsonwebtoken')
const express = require('express')
const cache = require('./cache')
const config = require('../config')
const router = express.Router();
const accountsModel = require("../models/accountsModel.js")

router.use(async (req, res, next) => {
console.log("hereeeeeeeeeee");
    try {
      
    if (req.headers['authorization']) {
        let token = req.headers.authorization

        if (token.slice(0, 6) == ("Bearer" || "bearer")) {
            token = token.slice(7)
        }
        // if (token !== '') {
        //  let  payload = jwt.decode(token, config.tokenAuth.password)
        //     console.log("payload", payload)
        //     console.log('payload.email',payload.email)
        //   accountsModel.findOne({'email': payload.email }, function (err, data) {
        //     if (data) { 
        //         req.body.user_id=data._id;
        //         req.user_id=data._id;
        //     	next(); 
        //     } else {
        //     	//If error send Forbidden (401)
        //         res.status(401).send({"status":false,"message":"Unauthorized User"});
        //     }
        //     return
        // })
        // } else {
        //   res.send({ status: false, message: 'Please login and try' })
        // }
        
        let tokenStatus = await verify(token)

        if (tokenStatus.status == "valid") {
            console.log("entry")
            try {
                console.log('tokenStatus', tokenStatus)
                if(tokenStatus.message.phone!=undefined){
                    req.user = cache.getAlive(cache.collectionName.session, tokenStatus.message.phone)    
                }
                else{
                    req.user = cache.getAlive(cache.collectionName.session, tokenStatus.message.email)
                }
                console.log(req.user)
                //sanity
                delete req.user['pin']
                delete req.user['password']
                /*                 delete req.user['$loki']
                                delete req.user['meta']
                                delete req.user['id'] */

                if (req.user.sessionId != token) {
                    res.status(401).send({
                        status: 'fail',
                        message: 'invalid_token_logout',
                        error: 'nil'
                    })
                } else {
                    next()
                }

                return
            } catch (error) {
                console.log(error)
                res.status(401).send({
                    status: 'fail',
                    message: 'token_not_found',
                    error: 'nil'
                })
                return
            }
        } else {
            res.status(401).send({
                status: 'fail',
                message: 'invalid_token',
                error: 'nil'
            })
        }

    } else {
        console.log("five")
        res.status(401).send({
            status: 'fail',
            message: 'token_expired',
            error: 'nil'
        })
    }
  
    } catch (error) {
        console.log("ERROR",error)
        res.status(401).send({
            status: 'fail',
            message: 'invalid_token',
            error: 'nil'
        })
    }


})


const verify = (token) => {
    try {
        let decoded = jwt.verify(token, config.tokenAuth.password, {
            expiresIn: "5d"
        })
        return {
            status: "valid",
            message: decoded
        }
    } catch (err) {
        console.log(err)
        //cache.remove
        //cache.remove(cache.collectionName.session, )
        return {
            status: "expired",
            message: ''
        }
    }
}

module.exports = router