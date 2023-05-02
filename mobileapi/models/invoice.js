console.log(new Date())
const mongoose = require('mongoose')
const paginatePlugin = require('mongoose-paginate-v2')
// const aggregatePaginatePlugin = require('mongoose-aggregate-paginate-v2')

const schema = new mongoose.Schema(  {
    
    email: {type: String},

    operation:{type: String},

    invoiceNumber:{type: String},

    issueDate:{type: String, default:''},

    dueDate:{type: String, default:''},

    senderAddress:{type: String},

    senderEmail:{type: String},

    customerAddress:{type: String},

    receiverEmail:{type: String},

    discription:{type: String},

    discount:{type: String},

    taxRate:{type: String},

    shippinghandling:{type: String},

    currency:{type: String},

    total:{type: String},

    depositAddress:{type: String},

    withdrawAddress:{type: String},

    tx_status:{type: String},

    data:[{
        quantity:{type: String, default:''},
        details :{type: String, default:''},
        price : {type: String, default:''},
        amount :{type: String, default:''},
  
      
    }],
    
    

  },)

schema.plugin(paginatePlugin)
// schema.plugin(aggregatePaginatePlugin)

module.exports = mongoose.model('invoices', schema)
