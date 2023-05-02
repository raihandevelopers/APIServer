// Chatconversation.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const mongoosePaginate = require('mongoose-paginate-v2');
// Define collection and schema for Chatconversation
let Chatconversation = new Schema({
  attachment_url: {
    type: String
  },
  chat_type: {
    type: String
  },
  deleted_on: {
    type: String
  },
  friend_virtual_id: {
    type: String
  },
  group_id: {
    type: String
  },
  message: {
    type: String
  },
  message_id: {
    type: String
  },
  message_type: {
    type: String
  },
  purpose: {
    type: String
  },
  read_on: {
    type: String
  },
  receive_on: {
    type: String
  },
  receiver_virtual_id: {
    type: String
  },
  sender_virtual_id: {
    type: String
  },
  sent_on: {
    type: String
  },
  chatType: String,
  last_modified_date: {type: Date, default: Date.now}
  // createdAt: {
  //   type: Date, default: Date.now
  // },
  // UpdatedAt: {
  //   type: Date, default: Date.now
  // }
}, {
  collection: 'Chatconversation'
});

Chatconversation.plugin(mongoosePaginate);

module.exports = mongoose.model('Chatconversation', Chatconversation);
