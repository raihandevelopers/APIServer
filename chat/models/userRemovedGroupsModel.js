var mongoose = require('mongoose')

const schema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'accounts',
        autopopulate: true
    },
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'groups',
    }
})
schema.plugin(require('mongoose-autopopulate'))
module.exports = mongoose.model('userRemovedGroups', schema)