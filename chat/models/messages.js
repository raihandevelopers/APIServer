const mongoose = require("mongoose");
const paginatePlugin = require("mongoose-paginate-v2");

const schema = new mongoose.Schema({
  from: String,
  to: String,
  message: String,
  delivered: {
    default: false,
    type: Boolean,
  },
  seen: {
    default: false,
    type: Boolean,
  },
  timestamp: {
    type: Date,
    default: new Date().getTime()
  }
});

mongoose.plugin(paginatePlugin)

module.exports = mongoose.model('messages', schema)