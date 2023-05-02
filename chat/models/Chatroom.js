// Chatroom.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const mongoosePaginate = require('mongoose-paginate-v2');

// Define collection and schema for Chatroom
let Chatroom = new Schema({
  from: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  group: {
    type: String
    //default: true
  },
  message_id: {
    type: String
  },
  message: {
    type: String
  },
  chatType: String,
  createdAt: {
    type: Date, default: Date.now
  },
  // deletedBy:{
  //   type:Array
  // }  ,//[String],

  deletedBy:[String],
  isDeleted:{type:String , default:"false"},

  // deletedBy:[
    
  //   {
  //     isDeleted:{type:String , default:"false"}
  //     // default:"false"
  //   }
  // ],

  last_modified_date: {type: Date, default: Date.now},

  
  // updatedAt: {
  //   type: Date, default: Date.now
  // }
}, {
  collection: 'Chatroom'
});

Chatroom.plugin(mongoosePaginate);


module.exports = mongoose.model('Chatroom', Chatroom);
