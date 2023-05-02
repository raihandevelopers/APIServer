var express = require('express');
var router = express.Router();
const Web3 = require('web3')
const jwt = require('jsonwebtoken')
let cache = require('../lib/cache')
let request = require('../lib/network')
const requestPromise = require('request-promise')
const requ = require('request')
const walletModel = require('../models/wallets')
const accountModel = require('../models/accountsModel')
const crypto = require('crypto')
const TransactionHistories = require('../models/TransactionHistories')

const body = require('express-validator').body
const header = require('express-validator').header
const query = require('express-validator').query
const validationResult = require('express-validator').validationResult

const config = require('../config')
const constants = require('../constants/constants')
const emailService = require('../lib/emailService')
let db = require('../lib/db')
const WalletFactory = require('../lib/wallet').WalletFactory
let settingsModel = require('../models/settings');
let paymentModel = require('../models/bankInfo');
let bankAccountModel = require('../models/bankAccount');
let bankCardModel = require('../models/bankCard');
var speakeasy = require('speakeasy');
var QRCode = require('qrcode');
var passwordValidator = require('password-validator')
var schema = new passwordValidator();
const {createHash} = require('crypto'); 
const {TextEncoder, TextDecoder} = require('text-encoding/lib/encoding');
var encoder = new TextEncoder('utf8');
var decoder = new TextDecoder()
const rateLimit = require('express-rate-limit')
var randomstring = require("randomstring");


// PASSWORD VALIDATION REQUIREMENTS
schema
.is().min(8)                                    // Minimum length 8
.is().max(16)                                  // Maximum length 16
.has().uppercase()                              // Must have uppercase letters
.has().lowercase()                              // Must have lowercase letters
.has().digits()                                 // Must have digits
.has().symbols()                              // Must have symbols
.has().not().spaces()                           // Should not have spaces

_walletFactory = new WalletFactory(config.wallet.mnemonics, config.wallet.password, config.wallet.network)
//let tokenVerification = require('../lib/jwt')

//router.use(tokenVerification)

/* GET users listing. */

// C R E A T I N G     A     H A S H     V A L U E    F O R    T H E    P A S S W O R D 
function hash(data) {
    return createHash('md5').update(data).digest('hex');
}


var algorithm = "aes-192-cbc"; //algorithm to use
var password = "Hello darkness";
const key = crypto.scryptSync(password, 'salt', 24); //create key
const iv = Buffer.alloc(16, 0);


function encrypt(text) {

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    var encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex'); // encrypted text
    return encrypted;    

}
   
function decrypt(text) {

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    var decrypted = decipher.update(text, 'hex', 'utf8') + decipher.final('utf8'); //deciphered text
    return decrypted

}
   

const limiter = rateLimit({
    windowMs: 2 * 60 * 1000, // 15 minutes
    max: 4, // limit each IP to 100 requests per windowMs
    message: "Too Many Requests, Please Try Again Later."
});


  router.post('/new', limiter, async (req, res) => {

    // console.log("asdasd123123",req.rateLimit.remaining)

    // if(req.rateLimit.remaining == 0){
    //     return res.status(412).send({
    //         status:"Fail",
    //         message:"Too many requests, please try again later."
    //     })
    // }

    let errors = rateLimit(req)
    // if (errors.isEmpty() == false) {
    //     res.status(412).send({
    //         status:"fail",
    //         message:"Validation Failed",
    //         error:errors
    //     })
    //     return
    // }

    
    return res.send({
        status:"success",
        message:req.rateLimit,
        errors:errors
    })

  })

async function test() {
    let btcWallet = (await request.get(config.services.btcService + "/getNewAddress"))
    // let bchWallet = (await request.get(config.services.bchService + "/getNewAddress"))

    // console.log((btcWallet))
    // console.log(bchWallet)
}

const usageStaticsModel = require('../models/usageStatistics')
const requestIp = require('request-ip');



const validate = (routeName) => {
    switch (routeName) {

        case 'register':
            return [
                body('email').isString().exists().isEmail(),
                body('password').isString().exists()
            ]

        case 'confirm':
            return [
                body('email').isString().exists(),
                body('otp').isString().exists()
            ]

        case 'login':
            return [
                body('email').exists().notEmpty(),
                body('password').exists().notEmpty(),
                body('isLoggedIn').exists().notEmpty()
            ]

        case 'verify2fa':
            return [
                body('email').exists().notEmpty(),
                body('gCode').exists().notEmpty()
            ]

        case 'forgetPassword':
            return [
                body('source').exists().isString().notEmpty()
            ]

        case 'forgetPassword_reset':
            return [
                body('otp').exists().notEmpty(),
                body('newPassword').exists().notEmpty(),
                body('source').exists().notEmpty()
            ]

        case 'forgetPin':
            return [
                body('email').exists().isString().notEmpty(),
                body('securityQuestion').exists().isString().notEmpty(),
                body('securityAnswer').exists().isString().notEmpty()
            ]

        case 'forgetPin_reset':
            return [
                body('otp').exists().notEmpty(),
                body('newPin').exists().isString().notEmpty(),
                body('email').exists().isString().notEmpty()
            ]    
    }
}

router.use((req, res, next) => {

    let ip = requestIp.getClientIp(req);
    if (String(ip).slice(0, 7) == "::ffff:") {
        // console.log(String(ip).slice(0, 7))
        ip = String(ip).slice(7)
    }
    req.userData = { ip: "" }
    req.userData.ip = ip
    next()
})

require('dotenv').config()

router.post('/register',validate('register'), async (req, res) => {

    let errors = validationResult(req)
    if (errors.isEmpty() == false) {
        res.status(412).send({
            status:"Fail",
            message:"Validation Failed",
            error:errors
        })
        return
    }

    let status = await settingsModel.find({})

    let {
        email,
        firstName,
        lastName,
        dob,
        address,
        city,
        state,
        postalCode,
        password,
        country,
        referredCode
    } = req.body
    
    

    

    if(schema.validate(password) == false) { return res.status(412).send({status: 'fail', message: 'Password Conditions Not Met'})}

    if(status[0].register == false) { return res.status(412).send({status: 'fail', message: 'Registrations Are Blocked'})}


    if (status[0].register == true && schema.validate(password)) {

        try {
            let otp = Math.floor(100000 + Math.random() * 900000);
            console.log(otp)
            req.body.otp = String(otp)
            let isUserVerified = false;
            //let userFromCache = cache.getAlive("registration", email)
            const userJSON = {
                email: email,
                firstName: firstName,
                lastName: lastName,
                dob: dob,
                address: address,
                city: city,
                state: state,
                postalCode: postalCode,
                password: hash(req.body.password),
                country: country,
                referralCode: randomstring.generate(7),
                referredCode: referredCode,
                otp: otp
            }
            let user = await db.readFromDBAsync({
                "email": email
            }, "accounts")
            if (user.message != null) {
                res.send({
                    "status": "fail",
                    message: 'Email Already Takens',
                    error: 'nil'
                })
                return
            }

            // S T O R I N G    H A S H E D    P A S S W O R D S    I N    C A C H E

            // console.log(userJSON)
            cache.create("registration", email, userJSON, 15 * 60 * 1000)
            //emailService.sendOtp(email,otp) //not using await for a reason. Will delay the response if used.
            request.post(config.services.emailService + '/sendRegistrationEmail', {
                email: email,
                otp: otp
            })
            res.status(200).send({
                status: "success",
                message: "User Registered Successfully",
                isUserVerified: isUserVerified,
                error: "nil"
            })


        } catch (error) {
            console.log(error)
            res.status(500).send({
                status: "fail",
                message: "Internal Server Error",
                error: "error"
            })
        }
    }
    else {
        res.status(412).send({
            status: "fail",
            error: "err"
        })
    }

})

// C O N F I R M 
router.post('/confirm',validate('confirm'), async (req, res) => {
    
    let errors = validationResult(req)
    if (errors.isEmpty() == false) {
        res.status(412).send({
            status:"Fail",
            message:"Validation Failed",
            error:errors
        })
        return
    }
    
    try {
        let {
            email,
            otp
        } = req.body
        let userData = cache.getAlive("registration", email)
        console.log(req.body, userData)
        // console.log("userData" + userData)

        let user = await db.readFromDBAsync({
            "email": email
        }, "accounts")
        if (user.message != null) {
            res.send({
                "status": "fail",
                message: 'Already Registered',
                error: 'nil'
            })
        }

        if (userData == null) {
            res.status(400).send({
                status: "fail",
                message: "otp expired",
                error: "error"
            })
            return
        }
        console.log("otp", otp,userData['otp'] )
        if (otp == userData['otp'] || otp == "1234") { // remove second condition // TODO
            delete userData['otp']
            delete userData['expired']

            let sessionId = jwt.sign(
                {
                  //generate sessionId
                  email: user["email"],
                },
                config.tokenAuth.password,
                {
                  expiresIn: "5d",
                }
              );

            //generate wallets
            let walletData = await createWallets(email, userData)
            // console.log('walletData', walletData)
            // userData.wallets = walletData.wallet
            // userData.ref = walletData.ref
            // userData.pin = 0 //initialize
            // userData.kycStatus = constants.kyc.NO_DOCUMENTS_UPLOADED;
            // userData.hasTransactionPin = false
            delete userData.meta
            delete userData['$loki']

            // db.insert(userData, "accounts")
            cache.remove("registration", email)
            res.send({
                status: "success",
                message: "Email Verified",
                token: sessionId,
                error: "nil"
            })
        } else {
            res.status(412).send({
                status: "fail",
                message: "invalid otp",
                error: "nil"
            })
        }
    } catch (error) {
        console.log(error)
        res.status(500).send({
            status: "fail",
            message: "internal_server_error",
            error: "error"
        })
    }

})

// L O G I N
router.post('/login',validate('login'), async (req, res) => {

    let errors = validationResult(req)
    if (errors.isEmpty() == false) {
        res.status(412).send({
            status:"Fail",
            message:"Validation Failed",
            error:errors
        })
        return
    }


    try {

        let status = await settingsModel.find({})
        let acc = await accountModel.findOne({email:{ $regex : new RegExp(req.body.email, "i") }}).lean().exec()
    
        // console.log(":asdas",acc,req.body)

        if(acc == null){
            return res.status(412).send({
                status:"Fail",
                message:"Email Doesn't Exists"
            })
        }

        if(acc.accountStatus != 'active'){
            return res.status(412).send({
                status:"Fail",
                message:"Account is Disabled"
            })
        }
        if(acc.accountStatus == 'active'){ //&& acc!=null){
            if (status[0].login == true) {
                let {
                    email,
                    password,
                    isLoggedIn
                } = req.body
                let userData = await db.readFromDBAsync({
                    "email": email 
                }, "accounts")

                if (acc != null) {
        
                    let auth2Status = false;
        
                    let userPassword = hash(password)

                    let dbPassword = decrypt(acc.password)

                    // console.log("1",userPassword,"2",dbPassword)

                    if (userPassword == dbPassword && acc.isAdmin == undefined) {
                        delete acc.password
        
                        auth2Status = acc.auth2 != undefined || null ? acc.auth2 : false
        
                        if (auth2Status) {
                            // let otp = Math.floor(100000 + Math.random() * 900000);
                            // cache.create(cache.collectionName.auth2Login, email, {
                            //     otp: otp
                            // }, 600 * 1000) //expires in 10 mins
                            // //emailService.send2faCode(user.email, otp)
                            // request.post(config.services.emailService + '/sendAuth2Email', {
                            //     email: email,
                            //     otp: otp
                            // })
        
                            res.send({
                                status: 'success',
                                message: "true",
                                //token: sessionId,
                                auth2: auth2Status,
                                error: 'nil'
                            })
        
                            return
                        }
        
                        let sessionId = jwt.sign({ //generate sessionId
                            email: acc.email
                        }, config.tokenAuth.password, {
                            expiresIn: "5d"
                        })
                        acc.sessionId = sessionId
        
                        //save the userData to memcache
                        let tokenExpiry
                        tokenExpiry = isLoggedIn ? 7776000 * 1000 : 432000 * 1000
        
                        cache.create(cache.collectionName.session, acc.email, acc, tokenExpiry) //expire after 5days 
                        res.header('Authorization', sessionId)
        
                        let ip =req.userData.ip
        
                        let data = await requestPromise.get(`https://www.iplocate.io/api/lookup/${ip}`, {
                                method: 'GET',
                                json: true,
                    
                            });
                            data.toString();
                            let location = data.city+","+data.country
                        await usageStaticsModel.create({
                            email: req.body.email,
                            timestamp: new Date().toUTCString(),
                            action: 'login',
                            ip: req.userData.ip,
                            status: 'success',
                            location: location,
                            extraData2: '',
                            extraData3: '',
        
                        })
        
                        return res.status(200).send({
                            status: 'success',
                            message: "true",
                            token: sessionId,
                            auth2: false,
                            error: 'nil',
                            data: acc
                        })
                    } else {
                        res.status(412).send({
                            status: 'Fail',
                            message: 'Invalid Password',
                            error: 'nil'
                        })
        
                        await usageStaticsModel.create({
                            email: req.body.email,
                            timestamp: new Date().toUTCString(),
                            action: 'login',
                            ip: req.userData.ip,
                            status: 'fail',
                            reason: 'IncorrectPassword',
                            extraData2: '',
                            extraData3: '',
                        })
                    }
                } else {
                    res.status(412).send({
                        status: 'Fail',
                        message:'Email Doesnt Exists',
                        error: 'nil'
                    })
                }
            }
            else {
                res.status(412).send({
                    status:"Fail",
                    message: "Account has been blocked",
                    error: "err"
                })
            }
        }
        else{
            res.status(412).send({
                status:"Fail",
                message:"Account has been blocked"
            })
        }

        
    } catch (error) {
	console.log(error)
        res.status(500).send({
            status:"fail",
            message:"Internal Server Error",
            error:""
        })
    }

})

// V E R I F Y    2 F A 
router.post('/verify2fa',validate('verify2fa'), async (req, res) => {
    
    let errors = validationResult(req)
    if (errors.isEmpty() == false) {
        res.status(412).send({
            status:"Fail",
            message:"Validation Failed",
            error:errors
        })
        return
    }
    
    let {
        email,
        gCode
    } = req.body
    try {

        var acc = await accountModel.find({ email: { $regex : new RegExp(req.body.email, "i") }})

        let verified = speakeasy.totp.verify({
            secret: acc[0].secret,
            encoding: 'base32',
            token: gCode
        })

        if (verified) {
            let user = (await db.readFromDBAsync({
                "email": acc[0].email
            }, "accounts")).message
            // console.log(user)
            delete user['password']
            let sessionId = jwt.sign({ //generate sessionId
                email: user['email']
            }, config.tokenAuth.password, {
                expiresIn: "5d"
            })
            user['sessionId'] = sessionId

            //save the userData to memcache
            cache.create(cache.collectionName.session, acc[0].email, user, 432000 * 1000) //expire after 5days 
            res.header('Authorization', sessionId)

            let ip =req.userData.ip

                let data = await requestPromise.get(`https://www.iplocate.io/api/lookup/${ip}`, {
                        method: 'GET',
                        json: true,
            
                    });
            
                    data.toString();
            
                    let location = data.city+","+data.country


            await usageStaticsModel.create({
                email: req.body.email,
                timestamp: new Date().toUTCString(),
                action: 'login',
                ip: req.userData.ip,
                status: 'success',
                location:location,
                extraData2: '',
                extraData3: '',
            })

            cache.remove(cache.collectionName.auth2Login, email)
            res.send({
                status: 'success',
                message: "true",
                token: sessionId,
                error: 'nil',
                data: acc
            })
        } else {
            res.status(412).send({
                status: "Fail",
                message: "Google Authentication Code Expired",
                error: "error"
            })

            await usageStaticsModel.create({
                email: req.body.email,
                timestamp: new Date().toUTCString(),
                action: 'login',
                ip: req.userData.ip,
                status: 'fail',
                reason: 'otpExpired',
                extraData2: '',
                extraData3: '',
            })
            return
        }
    } catch (err) {
        console.log(err)
        res.status(500).send({
            status: "Fail",
            message: "server error",
            error: "error"
        })
    }
})

// F O R G E T     P A S S W O R D
router.post('/forgetPassword',validate('forgetPassword'), async (req, res) => {

    let errors = validationResult(req)
    if (errors.isEmpty() == false) {
        res.status(412).send({
            status:"Fail",
            message:"Validation Failed",
            error:errors
        })
        return
    }

    try {

        let {
            source
        } = req.body
    
        if (String(source).includes(".com") && (source != undefined || ""  )) {
    
            if (source == undefined || "") {
                res.status(412).send({
                    status: "fail",
                    message: "Email cannot be empty",
                    error: 'nil'
                })
                return
            }
    
            let userQuery = await db.readManyAsync({
                email: source
            }, "accounts")

            let acc = await accountModel.findOne({email:source}).lean().exec()

            if (acc == null) {
                res.status(412).send({
                    status: 'fail',
                    message: 'Email not exists',
                    error: 'nil'
                })
                return
            }
    
            if (acc != null) {
                let otp = Math.floor(100000 + Math.random() * 900000)
                cache.create("forgetPasswordOTP", source, {
                    otp
                }, 60 * 30 * 1000) //expires in 30 minutes
                request.post(config.services.emailService + '/sendPasswordRecoveryEmail', {
                    email: source,
                    otp: otp
                })
                res.send({
                    status: "success",
                    message: "Email sent",
                    error: 'nil'
                })
            } else {
                res.status(412).send({
                    status: 'fail',
                    message: 'Invalid',
                    error: 'nil'
                })
            }
        }
        else {
            res.status(412).send({
                status: "Fail",
                message: "Invalid Email"
            })
        }
        
    } catch (error) {
        
        return res.status(500).send({
            status:"Fail",
            message:"Internal Server Error"
        })

    }
    
   

})

// F O R G E T    P A S S W O R D     R E S E T 
router.post('/forgetPassword_reset',validate('forgetPassword_reset'), async (req, res) => {
   
    let errors = validationResult(req)
    if (errors.isEmpty() == false) {
        res.status(412).send({
            status:"Fail",
            message:"Validation Failed",
            error:errors
        })
        return
    }
   
    // console.log("forgetPassword_reset",req.body)

    let {
        newPassword,
        otp,
        source
    } = req.body

    newPassword = hash(newPassword)
    newPassword = encrypt(newPassword)

    // console.log(newPassword)

    if(schema.validate(password)){
        return res.status(412).send({
            status:"Fail",
            message:"Incorrect Password Format"
        })
    }


    if (otp == undefined || "") {
        res.send({
            status: "Fail",
            message: "OTP Cannot Be Empty",
            error: 'nil'
        })
        return
    }
    try {

        if (String(source).includes(".com") && (source != undefined || "")) {
            let generatedOtp = cache.getAlive("forgetPasswordOTP", source)
            // console.log(generatedOtp)
            if (generatedOtp == null) {
                res.send({
                    status: "Fail",
                    message: 'OTP Expired',
                    error: 'nil'
                })
                return
            }
            if (otp == generatedOtp.otp) {

                await accountModel.updateOne(
				    {email:source},
				    {
					    $set: {
						    password: newPassword,
					    }
				    }
			    );

                return res.status(200).send({
                    status: "Success",
                    message: 'Password Updated',
                    error: 'nil'
                })
            } else {
                res.send({
                    status: "Fail",
                    message: 'Invalid OTP',
                    error: 'nil'
                })
            }
        }else{
            return res.status(412).send({
                status:"Fail",
                message:"Invalid Email"
            })
        }
    } catch (err) {
        console.log(err)
        return res.status(500).send({
            status: "fail",
            message: 'Internal Server Error',
            error: 'err'
        })
    }

})

router.post('/sendToken', async(req,res)=>{
    await accountModel.find( function (err, found) {
        if(err) {
            res.send({ status: false, message: err.message})
        } else if (found.length > 0) {
                found.forEach(async function (el) {
                    if(el.refTokenSend === false) {
                        await TransactionHistories.find({email: el.email}, function (err, found) {
                            if(err) { 
                                res.send({ status: false, message: err.message })
                            } else if (found.length > 0) {
                                if(found[0].sourceAmount > 1) {
                                    sendToken(el.email)
                                }
                            } else {
                                res.send({ status: false, message: "transaction not found"})
                            }
                        })
                    }
                })
            }
        })
})


router.post('/testSendWyre',async(req,res)=>{
    try{

        let result = await requestPromise.post({
			url: config.services.wyreService + '/test1',
			method: "POST",
			body: {

			},
			json: true
		})
        // console.log("result",result)

        res.send({
            status:"true"
        })
    }
    catch (err) {
        res.send({
            status:"false",
            message:err.message
        })
    }
})

async function sendToken(email) {
    await walletModel.findOne({email:email}, async function (err, address) {
        if(err) {
            res.send({ status: false, message: err.message})
        } else if (address) {
            let addr = address.mybiz.address
            try {
            addr = web3.utils.toChecksumAddress(address)
            // console.log("address", address)
            } catch (error) {
                console.log("error", error);
                res.status(500).send({
                  status: "fail",
                  error: "Please check the address",
                })
                return
              }
              let tokenName = config.wallet.contracts[1].symbol
              let wallet = web3.eth.accounts.wallet;
                
              wallet.clear();
              wallet = wallet.create(0);
              wallet.add(config.wallet.contracts[1].privKey);
              let instance = await new web3.eth.Contract(ABI, contractAddres);
            //   console.log("test", wallet[0].address)

                if (String(sendAmount).indexOf(".") > -1) {
                sendAmount = Number(sendAmount) * 10 ** tokenDecimal; //raise to 10 power 6
                sendAmount = Math.trunc(sendAmount); //remove digits after decimal point
                tokenDecimal -= tokenDecimal; //reduce the decimalPoint digits
                }

            let amountAsBn = web3.utils.toBN(sendAmount);
            let BN10 = web3.utils.toBN(10);
            let decimalBN = web3.utils.toBN(tokenDecimal);
            let decimalUnitsBN = BN10.pow(decimalBN);
            let amountToTransfer = amountAsBn.mul(decimalUnitsBN);
            // console.log("amountToTransfer", amountToTransfer)

            //let targetAmount = amountToTransfer;
            let balance = await instance.methods.balanceOf(wallet[0].address).call()
            // console.log("balance", balance)
            if (Number(balance) / (10 ** tokenDecimal) < Number(sendAmount)) {
            res.status(500).send({
                status: "fail",
                error: "low token balance",
            });
            return
            }
            await instance.methods.transfer(address, amountToTransfer)
            .send({
                from: wallet[0].address,
                gas: config.wallet.gasLimit,
                nonce: await web3.eth.getTransactionCount(wallet[0].address, "pending")
            }).on("transactionHash", async (hash) => {
                txHash = hash;
                // console.log(txHash);
        
                //console.log(data);
        
                let tokenTransferedbalance = await walletModel.findOne({ user_wallet: address });
                if (tokenTransferedbalance) {
                //   console.log(tokenTransferedbalance);
                  tokenTransfered = Number(tokenTransferedbalance.mdtx.balance) + Number(sendAmount)
                  //console.log("tokenTransfered", tokenTransfered, _data.mdtxBalance,tokenTransferedbalance.tokenTransfered)
                  let result = await walletModel.updateOne(
                    {
                      user_wallet: address,
                    },
                    {
                      $set: {
                        'mdtx.balance': String(tokenTransfered),
                      },
                    },
                    {
                      upsert: true,
                    });
                //   console.log("test", result)
                }
        
                await TransactionModel.create(
                  {
                    from: wallet[0].address,
                    to: address,
                    source: tokenName,
                    target: tokenName,
                    amount: sendAmount,
                    userAddress: address,
                    mdtxWalletAddress: wallet[0].address,
                    status: "completed",
                    error: "nil",
                    reason: "",
                    data: "",
                    txHash: txHash,
                    value: sendAmount,
                    targetAmount: sendAmount,
                    sourceAmount: sendAmount,
                    //currency: tokenName,
                    type: "BONUS",
                    //email: _data.email,
                    txId: txHash,
                    //ref: "0",
                    timestamp: new Date().getTime(),
                  });
                  accountModel.findOneAndUpdate({email:email}, function (err, updated) {
                    if(err) { res.send({ status: false, message: err.message })}
                  })
        
                res.status(200).send({
                  status: "success",
                  txHash: txHash
                });
              })
              .on("error", async (er, hash) => {
                txHash = hash;
                // console.log(txHash);
                // console.log("test 4", er);
                let tokenTransferedbalance = await walletModel.findOne({ user_wallet: address });
                if (tokenTransferedbalance) {
                //   console.log(tokenTransferedbalance);
                  tokenTransfered = Number(tokenTransferedbalance.mdtx.balance) - Number(sendAmount)
                  //console.log("tokenTransfered", tokenTransfered, _data.mdtxBalance,tokenTransferedbalance.tokenTransfered)
                  let result = await walletModel.updateOne(
                    {
                      user_wallet: address,
                    },
                    {
                      $set: {
                        'mdtx.balance': String(tokenTransfered),
                      },
                    },
                    {
                      upsert: true,
                    });
                //   console.log("test", result)
                }
        
                await TransactionModel.updateOne(
                  {
                    txHash: txHash,
                  },
                  {
                    $set: {
                      status: "failed",
                    },
                  },
                  {
                    upsert: true,
                  });
                // console.log("test", result)
                res.status(200).send({
                  status: "fail",
                  message: er
                });
              });  
        }
        })
}

async function createWallets(data, userData) {

    let web3 = new Web3()

    try {
        // let result = await db.sortReadAsync({
        //     ref: -1
        // }, "accounts")

        let result = await accountModel.find({ adminLevel: { $nin: [0] } }).sort( { ref: -1 } )
        // console.log("ASfafafaasf",result[0].ref)

     
        let lastRef
        if (result.length > 0) {
            lastRef = result[0].ref
        } else {
            lastRef = 333
        }

        let ref = lastRef + 1
        // console.log("wallet-Service/src/server.js- docreateWallet()", ref)
        let isTestnet = config.wallet.btc.network == 'testnet' ? true : false
        let key = await _walletFactory.getExtendedKey(ref, isTestnet);
        let ethWallet = await _walletFactory.generateEthereumWallet(key);
        let btcWallet = await getWallets()
        let wallet = {
            btc: btcWallet.btc,
            eth: web3.utils.toChecksumAddress(ethWallet.address),
            usdt: web3.utils.toChecksumAddress(ethWallet.address),
            mybiz: web3.utils.toChecksumAddress(ethWallet.address),
        }

        console.log("wallet",wallet)
        // let userData = cache.getAlive("registration", data)
        // console.log("Userdaat", userData)

        userData.wallets = wallet
        userData.ref = ref
        userData.pin = 0 //initialize
        userData.kycStatus = constants.kyc.NO_DOCUMENTS_UPLOADED;
        userData.hasTransactionPin = false
        userData.firstName = ''
        userData.lastName = ''
        // E N C R Y P T I N G    T H E    P A S S W O R  D
        userData.password = encrypt(userData.password)
        console.log("userData.referralCode" + userData.referralCode)
            await accountModel.create({
                email: userData.email,
                password: userData.password,
                wallets: userData.wallets,
                ref: userData.ref,
                pin: userData.pin,
                kycStatus: userData.kycStatus,
                hasTransactionPin: userData.hasTransactionPin,
                firstName: userData.firstName,
                lastName: userData.lastName,
                referralCode: userData.referralCode,
                referredCode: userData.referredCode
                //fiatBalance:0
            })


            let acc = await accountModel.find({ "email": data })
            // console.log("ACCS MODEL : ", acc[0]._id)


            await walletModel.create({
                email: data,
                id: acc[0]._id,
                btc: {
                    balance: '0',
                    isEnabled: false,
                    address: wallet.btc,
                    fee: 0
                },
                eth: {
                    balance: '0',
                    isEnabled: false,
                    address: wallet.eth,
                    fee: 0
                },
                usdt: {
                    balance: '0',
                    isEnabled: false,
                    address: wallet.usdt,
                    fee: 0
                },
                mybiz: {
                    balance: '0',
                    isEnabled: false,
                    address: wallet.mybiz,
                    fee: 0
                }
            })

        // console.log(wallet)
        return {
            wallet,
            ref
        }
    } catch (error) {
        console.log(error)
    }

}

async function getWallets() {
    let btcWallet = await request.get(config.services.btcService + "/getNewAddress")
    // let bchWallet = (await request.get(config.services.bchService + "/getNewAddress"))

    let wallets = {
        btc: ''
    }
    if (btcWallet.status == 'success') {
        wallets.btc = JSON.parse(btcWallet.message).address
    }
    // if (bchWallet.status == 'success') {
    //     wallets.bch = JSON.parse(bchWallet.message).address
    // }
    // console.log(wallets)
    return wallets

}

router.get('/getUser', async (req, res)=>{
    await accountModel.find( function (err, found) {
        if(err) {
            res.send({ status: false, mesage: err.message })
        } else if(found) {
            res.send({status: true, message: 'found', data: found})
        } else {
            res.send({ status: false, message: 'not found'})
        }
    })
})



module.exports = router;
