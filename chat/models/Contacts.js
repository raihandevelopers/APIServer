// Contacts.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const mongoosePaginate = require('mongoose-paginate-v2');
const aggregatePaginatePlugin = require('mongoose-aggregate-paginate-v2')

// Define collection and schema for Contacts
let Contacts = new Schema({
  email: String,
  contact: String,
  isRemoved: Boolean,
  chatType: String,
  isFav: {type: Boolean, default: false},

  // contacts: [
  //   {
  //     id: String,
  //     isRemoved: Boolean
  //   }
  // ]
  // updatedAt: {
  //   type: Date, default: Date.now
  // }
});

Contacts.plugin(mongoosePaginate);
Contacts.plugin(aggregatePaginatePlugin)


module.exports = mongoose.model('messengerContacts', Contacts);
