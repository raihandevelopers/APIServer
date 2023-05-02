const express = require('express')
const router = express.Router()
const messageController = require('../controllers/messageController')

router.post('/send', messageController.validate('sendMessage'), messageController.sendMessage)
router.get('/messages', messageController.validate('getMessages'), messageController.getMessages)
router.post('/updateSeenStatus', messageController.validate('updateSeenStatus'), messageController.updateSeenStatus)
router.post('/updateDeliveredStatus', messageController.validate('updateDeliveredStatus'), messageController.updateDeliveredStatus)

router.use((err, req, res, next) => {
    res.status(err.statusCode).send({
        status: 'fail',
        message: err.message,
        error: err.erros
    })
})

module.exports = router