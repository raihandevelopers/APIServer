const messageModel = require('../models/messages')

class Message {

    constructor(senderId, receiverId, message, timestamp, id) {
        this._senderId = senderId
        this._receiverId = receiverId
        this._message = message
        this._id = id
        this._seen = ''
        this._delivered = ''
        this._timeStamp == undefined ? new Date().getTime() : timestamp
    }

    async getSenderEmail() {
        //TODO 
    }

    async getReceiverEmail() {
        //TODO
    }

    async getSeen() {

    }

    async getDelivered() {

    }

    async getMessageDetails() {
        try {
            if (this._id != undefined) {
                return await messageModel.findOne({
                    _id: this._id
                }).lean().exec()
            } else {
                throw new Error('id is not set')
            }
        } catch (error) {
            throw new Error(error.message)
        }
    }


    set id(id) {
        this._id = id
    }

    set seen(users){
        //seen will be array from group messages
        // boolean fir one to one messages
        if(Array.isArray(users)) {
            this._seen = users
        } else {
            this._seen = true
        }
    }

    set delivered(users){
        //seen will be array from group messages
        // boolean fir one to one messages
        if(Array.isArray(users)) {
            this._delivered = users
        } else {
            this._delivered = true
        }
    }

    get seen() {
        return this._seen
    }

    get delivered() {
        return this._delivered
    }

    get senderId() {
        return this._senderId
    }

    get receiverId() {
        return this._receiverId
    }

    get message() {
        return this._message
    }

    get timestamp() {
        return this._timeStamp
    }

    get id() {
        return this._id
    }

}


module.exports = Message