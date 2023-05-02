// Chathistorystatus.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const mongoosePaginate = require('mongoose-paginate-v2');

// Define collection and schema for Chathistorystatus
let Chathistorystatus = new Schema({
  from: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  message_id: {
    type: String
  },
  group: String,
  removeStatus: {
    type: Boolean,
    default: false
  },
  // removeFromStatus: {
  //   type: Boolean,
  //   default: false
  // },
  // removeToStatus: {
  //   type: Boolean,
  //   default: false
  // },
  chatType: String,
  removedAt: {
    type: Date, default: Date.now
  },
  last_modified_date: {type: Date, 
    default: Date.now}
  // updatedAt: {
  //   type: Date, default: Date.now
  // }
}, {
  collection: 'Chathistorystatus'
});

Chathistorystatus.plugin(mongoosePaginate);


module.exports = mongoose.model('Chathistorystatus', Chathistorystatus);


