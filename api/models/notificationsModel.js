const mongoose = require('mongoose')

const notificationsSchema = new mongoose.Schema({
    type: String,
    message: String,
    isRead: {
        type: Boolean,
        default: false
    }
})

const schema = new mongoose.Schema({
    email: String,
    notifications: [notificationsSchema]
})

module.exports =  mongoose.model('notifications', schema)