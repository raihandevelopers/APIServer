const messageModel = require('../models/messages')

class MessageHandler {
    constructor() {}

    async sendMessage(message) {
	
        try {
            if (message.senderId == undefined) {
                 throw new Error('From should not be empty')
            } else if (message.receiverId == undefined) {
                throw new Error('To should not be empty')
            } else if (message.message == undefined) {
                throw new Error('message should not be empty')
            }

            await messageModel.create({
                from: message.senderId,
                to: message.receiverId,
                message: message.message,
                timestamp: message.timestamp
            })

            return
        } catch (error) {
            throw error.message
        }

    }

    async getMessages(from, to, page = 1, count = 20) {
 try {
        return await messageModel.paginate({
            $and: [{
                from : String(from)
            }, {
                to: String(to)
            }],
            $and: [{
                from: String(to)
            }, {
                to: String(from)
            }]
        }, {
            page: page,
            count: count
        })
} catch (error) {
            throw error.message
        }

    }

    async updateSeenStatus(message) {
        try {
            if (message.id == undefined) {
                throw "message id is missing"
            }
            if (message.seen == undefined) {
                throw 'seen status in missing'
            }
            if (Array.isArray(message.seen)) {
                //change this to group message model
                await messageModel.updateOne({
                    _id: message.id
                }, {

                    $push: {
                        seen: {
                            $each: message.seen
                        }
                    }

                })
            } else {
                await messageModel.updateOne({
                    "_id": message.id
                }, {
                    $set:{
                        seen: true
                    }
                })
            }

        } catch (error) {
            throw error.message
        }
    }

    async updateDeliveredStatus(message) {
        try {
            if (message.id == undefined) {
                throw "message id is missing"
            }
            if (message.seen == undefined) {
                throw 'seen status in missing'
            }
            if (Array.isArray(message.delivered)) {
                //change this to group message model
                await messageModel.updateOne({
                    _id: message.id
                }, {

                    $push: {
                        seen: {
                            $each: message.delivered
                        }
                    }

                })
            } else {
                await messageModel.updateOne({
                    "_id": message.id
                }, {
                    $set:{
                        delivered: true
                    }
                })
            }

        } catch (error) {
            throw error.message
        }
    }

    async sendGroupMessage() {

    }

    async getGroupMessage() {

    }


}

module.exports = MessageHandler
