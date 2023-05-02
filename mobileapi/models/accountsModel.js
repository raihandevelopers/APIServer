var mongoose = require('mongoose');

module.exports = mongoose.model('accounts', {
    email: {
        type: String,
        unique: true
        // required: true
    },
    name: {
        type: String
        // required: true
    },
    // last_name: String,
    country: String,
    phone: {
        type: String,
        default: "" 
    },
    profileImage: {
        type: String,
        default: "" 
    },

    password: String,
    language: String,
    id: String,
    wallets: {
        btc: String,
        eth: String,
        usdt: String,
        mybiz: String,
        bnb: String
    },
    ref: Number,
    pin: String,
    kycStatus: String,
    kycLevel: {
        type: Number,
        default: 0
    },
    countrycode: String,
    hasTransactionPin: Boolean,
    FCMToken: String,
    dob:String,
    dateOfBirth: {
        type: String,
        default: "" 
    },
    lastSeen:{
        type: String,
        default: "" 
    },
    streetAddress:String,
    unit:String,
    city:String,
    state:String,
    postalCode:Number,
    localCurrency:String,
    timeZone: String,
    secret:String,
    qrcode:String,
    auth2:{
        type:Boolean,
        default:false
    },
    accountStatus:{
        type:String,
        default:"active"
    },
    profileStatus:{
        type: Boolean,
        default:false
    },
    fiatBalance: {
        type: String,
        default: 0
    },
    bankStatus:{
        type: Boolean,
        default:false
    },
    whitelist:{
        type: Boolean,
        default:false
    },
    adminLevel : Number,
    payOutProfit:String,
    transferProfit:String,
    passport:{
        type: Boolean,
        default:false
    },
    license:{
        type: Boolean,
        default:false
    },
    miscellaneous:{
        type: Boolean,
        default:false
    },
    healthPassport:{
        type: Boolean,
        default:false
    },
    creditcard:{
        type: Boolean,
        default:false
    },
    insurance:{
        type: Boolean,
        default:false
    },
    idcard:{
        type: Boolean,
        default:false
    },
    phoneAuth:{
        type: Boolean,
        default:false
    },
    legalName:String,
    reserve:String,
    firstName:{
	type: String,
	default: ""
    },
    lastName: {
        type: String,
        default: "" 
    },
    passportExpirationDate:String,
    creditcardExpirationDate:String,
    insuranceExpirationDate:String,
    position: String,
    industry: String,
    location: String,
    status: String,
    mood: String,
    contactCount: {
        type: Number,
        default: 250
    },
    referralCode: {
        type: String
    },
    referredBy: {
        type: String,
        default: "" 
    }, 
    refTokenSend: {
        type: Boolean,
        default: false
    },
    payChatId:{
        type: String
    }
    

})

