const body = require('express-validator').body
const header = require('express-validator').header
const validationResult = require('express-validator').validationResult
const Message = require('../src/message')
const MessageHandler = require('../src/messageHandler')
const query = require('express-validator').query
const CustomError = require('../src/error')
const config = require('../config')
const TokenValidator = require('../src/TokenValidator')
const tokenValidator = new TokenValidator(config.token.password, {
    expiresIn: "30d"
})

let messageHandler = new MessageHandler()


const sendMessage = async (req, res, next) => {
    let errors = validationResult(req)
    try {
        if (errors.isEmpty() == false) {
            console.log(errors.array())
            next(new CustomError('Invalid Inputs', 422, errors.array()))

        } else {
            let message = new Message(
                req.user._id,
                req.body.to,
                req.body.message,
                req.body.timestamp
            )

            await messageHandler.sendMessage(message)

            res.send({
                status: 'successfull apisbackentoken',
                message: 'sent'
            })
        }

    } catch (error) {
        //throw new Error(error.message)
        console.log(error)
        next(new CustomError(error.message, 500, error.errors))
    }

}

const getMessages = async (req, res, next) => {
    let errors = validationResult(req)
    try {
      //   if (errors.isEmpty() == false) {
      //       console.log(errors.array())
      //       next(new CustomError('Invalid Inputs', 422, errors.array()))

     //    } else 
{
            let messages = await messageHandler.getMessages({
                from: req.user._id,
                to: req.query.to,
                page: req.query.page,
                count: req.query.count
            })

            res.send({
                status: 'success',
                messages: messages
            })
        }
    } catch (error) {
        next(new CustomError(error.message, 500, error.errors))
    }
}

const updateSeenStatus = async (req, res, next) => {
    let errors = validationResult(req)
    try {
        if (errors.isEmpty() == false) {
            console.log(errors.array())
            next(new CustomError('Invalid Inputs', 422, errors.array()))
        } else {
            let message = new Message('', '', '', '', req.body.id)

            message.seen = req.body.seen

            await messageHandler.updateSeenStatus(message)
            res.send({
                status: 'success',
                messages: 'updated'
            })
        }
    } catch (error) {
        next(new CustomError(error.message, 500, error.errors))
    }
}

const updateDeliveredStatus = async (req, res, next) => {
    let errors = validationResult(req)
    try {
        if (errors.isEmpty() == false) {
            console.log(errors.array())
            next(new CustomError('Invalid Inputs', 422, errors.array()))
        } else {
            let message = new Message('', '', '', '', req.body.id)

            message.delivered = req.body.delivered

            await messageHandler.updateDeliveredStatus(message)
            res.send({
                status: 'success',
                messages: 'updated'
            })
        }
    } catch (error) {
        next(new CustomError(error.message, 500, error.errors))
    }
}

const validate = (route) => {
    switch (route) {
        case 'sendMessage':
            return [
                body('message', 'is Invalid').notEmpty().isString(),
                body(['to', 'message'], 'should not be empty').notEmpty().isString(),
                // header('Authorization').notEmpty().custom((token, {
                //     req
                // }) => {
                //     //console.log(req)
                //     try {
                //         let result = tokenValidator.validate(req)
                //         req.user = result
                //         console.log(req.user)
                //         return true
                //     } catch (error) {
                //         console.log('errr block', error.message)
                //         throw error.message
                //     }
                // })
            ]
        case 'getMessages':
            return [
                query('to', 'should not be empty').notEmpty(),
               //  header('authorization', 'header is invalid').notEmpty().custom((token, {
               //       req
               //   }) => {
               //       try {
                //         let result = tokenValidator.validate(req)
                //         req.user = result
                 //         return true
                 //     } catch (error) {
                 //        throw error.message
                 //     }
              //    })
            ]

        case 'updateSeenStatus':
            return [
                body('id', ' is invalid').notEmpty(),
                body('seen', ' is invalid').notEmpty(),
                // header('authorization', 'header is invalid').notEmpty().custom((token, {
                //     req
                // }) => {
                //     try {
                //         let result = tokenValidator.validate(req)
                //         req.user = result
                //         return true
                //     } catch (error) {
                //         throw error.message
                //     }
                // })
            ]
        case 'updateDeliveredStatus':
            return [
                body('id', ' is invalid').notEmpty(),
                body('delivered', ' is invalid').notEmpty(),
                // header('authorization', 'header is invalid').notEmpty().custom((token, {
                // }) => {
                //     try {
                //         let result = tokenValidator.validate(req)
                //         req.user = result
                //         return true
                //     } catch (error) {
                //         throw error.message
                //     }
                // })
            ]
}
}
module.exports = {
    validate,
    sendMessage,
    getMessages,
    updateSeenStatus,
    updateDeliveredStatus
}