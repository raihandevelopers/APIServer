var express = require('express');
var router = express.Router();
const nodemailer = require('nodemailer')
const emailTemplate = require('../static/emailTemplate')
let config = require('../config')
const cache = require('../lib/cache')

const settingsModel = require('../model/settings')

let contactEmail = 'sjilani@pinksurfing.com'
let links = {
	weblink: 'http://pinksurfing.com',
	twitterUrl: 'https://twitter.com/pinksurfing',
	facebookUrl: 'https://facebook.com/pinksurfing',
	instaUrl: "https://instrgram.com/pinksurfing",
	linkedinUrl: "https://www.linkedin.com/company/pinksurfing",
	tumblrUrl: "https://tumblr.com/pinksurfing",
	telegramUrl: 'https://t.me/pinksurfing'
}
let copyrightYear = 2020

/* GET home page. */
router.get('/', function (req, res, next) {
	res.render('index', { title: 'server is up' });
});


const getCredentials = async () => {
	try {
		let credentials = cache.getAlive('emailCredentials', 'email')

		if(!credentials) {
			credentials = await settingsModel.findOne({}).lean().exec()
			cache.create('emailCredentials','email',credentials, 60 * 10 * 1000) //10 minutes
		}
		console.log("credentials",credentials)
		return credentials
		
	} catch (error) {
		throw new Error(error.message)
	}
}


router.post('/sendRegistrationEmail', async (req, res) => {
	try {
		let { email, otp } = req.body

		let data = await getCredentials()//await settingsModel.findOne({}).lean().exec()

		let transporter = nodemailer.createTransport({
			//host:"smtp.ethereal.email",
			host: data.email.host,
			port: data.email.port,
			secure: false,
			auth: {
				user: data.email.user,
				pass: data.email.password
			}
		})

		let test = await transporter.sendMail({
			from: data.email.user,
			to: email,
			subject: "PinkSurfing - Confirm your email",
			//html: `Your otp is ${otp}`
			html: emailTemplate.getRegistrationEmail(otp, email, contactEmail, links, copyrightYear)
		})
        console.log("test", test)
		res.send({ status: 'success', message: 'mail_sent' })
	} catch (error) {
		console.log(error)
		res.status(500).send({ status: 'fail', message: 'failed' })
	}
})

router.post('/sendPasswordRecoveryEmail', async (req, res) => {
	try {
		let { email, otp } = req.body

		let data = await getCredentials()//await settingsModel.findOne({}).lean().exec()

		let transporter = nodemailer.createTransport({
			//host:"smtp.ethereal.email",
			host: data.email.host,
			port: data.email.port,
			secure: false,
			auth: {
				user: data.email.user,
				pass: data.email.password
			}
		})

		await transporter.sendMail({
			from: data.email.user,
			to: email,
			subject: "PinkSurfing - Forget Password",

			html: emailTemplate.getforgetPasswordEmail(otp, email, contactEmail, links, copyrightYear)
		})

		res.send({ status: 'success', message: 'mail_sent' })
	} catch (error) {
		console.log(error)
		res.status(500).send({ status: 'fail', message: 'failed' })
	}

})


router.post('/sendPinRecoveryEmail', async (req, res) => {
	try {
		let { email, otp } = req.body

		let data = await getCredentials()//await settingsModel.findOne({}).lean().exec()

		let transporter = nodemailer.createTransport({
			//host:"smtp.ethereal.email",
			host: data.email.host,
			port: data.email.port,
			secure: false,
			auth: {
				user: data.email.user,
				pass: data.email.password
			}
		})

		await transporter.sendMail({
			from: data.email.user,
			to: email,
			subject: "PinkSurfing - Forget Pin",

			html: emailTemplate.getforgetPinEmail(otp, email, contactEmail, links, copyrightYear)
		})

		res.send({ status: 'success', message: 'mail_sent' })
	} catch (error) {
		console.log(error)
		res.status(500).send({ status: 'fail', message: 'failed' })
	}

})


router.post('/sendAuth2Email', async (req, res) => {
	try {
		let { email, otp } = req.body

		let data = await getCredentials()// await settingsModel.findOne({}).lean().exec()

		let transporter = nodemailer.createTransport({
			//host:"smtp.ethereal.email",
			host: data.email.host,
			port: data.email.port,
			secure: false,
			auth: {
				user: data.email.user,
				pass: data.email.password
			}
		})

		await transporter.sendMail({
			from: data.email.user,
			to: email,
			subject: "PinkSurfing - OTP to login",

			html: emailTemplate.getRegistrationEmail(otp, email, contactEmail, links, copyrightYear)
		})

		res.send({ status: 'success', message: 'mail_sent' })
	} catch (error) {
		console.log(error)
		res.status(500).send({ status: 'fail', message: 'failed' })
	}
})



router.post('/sendActivatedEmail', async (req, res) => {
	try {
		let { email } = req.body

		let data = await getCredentials()//await settingsModel.findOne({}).lean().exec()

		let transporter = nodemailer.createTransport({
			//host:"smtp.ethereal.email",
			host: data.email.host,
			port: data.email.port,
			secure: false,
			auth: {
				user: data.email.user,
				pass: data.email.password
			}
		})

		await transporter.sendMail({
			from: data.email.user,
			to: email,
			subject: "Welcome to PinkSurfing",
			//html: `Your have successfully created your pinksurfing`
			html: emailTemplate.getActivatedEmail(otp, email, contactEmail, links, copyrightYear)
		})

		res.send({ status: 'success', message: 'mail_sent' })
	} catch (error) {
		console.log(error)
		res.status(500).send({ status: 'fail', message: 'failed' })
	}
})




router.post('/sendBalanceEmail', async (req, res) => {
	try {
		let { email, balance } = req.body

		let data = await getCredentials()//await settingsModel.findOne({}).lean().exec()

		let transporter = nodemailer.createTransport({
			//host:"smtp.ethereal.email",
			host: data.email.host,
			port: data.email.port,
			secure: false,
			auth: {
				user: data.email.user,
				pass: data.email.password
			}
		})

		await transporter.sendMail({
			from: data.email.user,
			to: email,
			subject: "PinkSurfing - Low Balance",
			//html: `Your otp is ${otp}`
			html: emailTemplate.getBalanceEmail(balance, email, contactEmail, links, copyrightYear)
		})

		res.send({ status: 'success', message: 'mail_sent' })
	} catch (error) {
		console.log(error)
		res.status(500).send({ status: 'fail', message: 'failed' })
	}
})

router.post('/getBalanceEmailBTC', async (req, res) => {
	try {
		let { email, balance } = req.body

		let data = await getCredentials()//await settingsModel.findOne({}).lean().exec()

		let transporter = nodemailer.createTransport({
			//host:"smtp.ethereal.email",
			host: data.email.host,
			port: data.email.port,
			secure: false,
			auth: {
				user: data.email.user,
				pass: data.email.password
			}
		})

		await transporter.sendMail({
			from: data.email.user,
			to: email,
			subject: "PinkSurfing - Low Balance",
			//html: `Your otp is ${otp}`
			html: emailTemplate.getBalanceEmailBTC(balance, email, contactEmail, links, copyrightYear)
		})

		res.send({ status: 'success', message: 'mail_sent' })
	} catch (error) {
		console.log(error)
		res.status(500).send({ status: 'fail', message: 'failed' })
	}
})

router.post('/sendTransactionEmail', async (req, res) => {
	try {
		let { email, type, from, source } = req.body

		console.log("req", req.body)

		let data = await getCredentials()//await settingsModel.findOne({}).lean().exec()

		let transporter = nodemailer.createTransport({
			//host:"smtp.ethereal.email",
			host: data.email.host,
			port: data.email.port,
			secure: false,
			auth: {
				user: data.email.user,
				pass: data.email.password
			}
		})

		await transporter.sendMail({
			from: data.email.user,
			to: email,
			subject: "PinkSurfing - Transaction Details",
			//html: `Your otp is ${otp}`
			html: emailTemplate.getInfoEmail(type, from, source, email, contactEmail, links, copyrightYear)
		})

		res.send({ status: 'success', message: 'mail_sent' })
	} catch (error) {
		console.log(error)
		res.status(500).send({ status: 'fail', message: 'failed' })
	}
})


router.post('/sendTransactionEmails', async (req, res) => {
	try {
		let { email, type, from, source, target } = req.body

		let data = await getCredentials()//await settingsModel.findOne({}).lean().exec()

		let transporter = nodemailer.createTransport({
			//host:"smtp.ethereal.email",
			host: data.email.host,
			port: data.email.port,
			secure: false,
			auth: {
				user: data.email.user,
				pass: data.email.password
			}
		})

		await transporter.sendMail({
			from: data.email.user,
			to: email,
			subject: "PinkSurfing - Transaction Details",
			//html: `Your otp is ${otp}`
			html: emailTemplate.getTxnEmail(type, from, source, target, email, contactEmail, links, copyrightYear)
		})

		res.send({ status: 'success', message: 'mail_sent' })
	} catch (error) {
		console.log(error)
		res.status(500).send({ status: 'fail', message: 'failed' })
	}
})

router.post('/sendTopupEmail', async(req,res)=>{
  try{
    let {type,email} = req.body

    let data = await settingsModel.findOne({}).lean().exec()
    
    let transporter = nodemailer.createTransport({
      //host:"smtp.ethereal.email",
      host:data.email.host,
      port:data.email.port,
      secure: false,
      auth:{
        user: data.email.user,
        pass: data.email.password
      }
    })

    await transporter.sendMail({
      from: data.email.user,
      to: email,
      subject:"PinkSurfing - Transaction Details",
      //html: `Your otp is ${otp}`
      html: emailTemplate.getTopupEmail(type,contactEmail,links,copyrightYear)
    })

    res.send({status: 'success', message: 'mail_sent'})
  }catch(error){
    console.log(error)
    res.status(500).send({status:'fail', message: 'failed'})
  }

})

router.post('/sendMarketEmail', async (req, res) => {
	try {
		let { email } = req.body

		let data = await getCredentials()//await settingsModel.findOne({}).lean().exec()

		let transporter = nodemailer.createTransport({
			//host:"smtp.ethereal.email",
			host: data.email.host,
			port: data.email.port,
			secure: false,
			auth: {
				user: data.email.user,
				pass: data.email.password
			}
		})
/*
		await transporter.sendMail({
			from: data.email.user,
			to: email,
			subject: "PinkSurfing - API Key Limit Exceeded",
			//html: `Your otp is ${otp}`
			html: emailTemplate.getMarketEmail(email, contactEmail, links, copyrightYear)
		}) */

		res.send({ status: 'success', message: 'mail_sent' })
	} catch (error) {
		console.log(error)
		res.status(500).send({ status: 'fail', message: 'failed' })
	}
})


router.post('/sendTransactionEmail', async(req,res)=>{
  try{
    let {email, type, from, source} = req.body

    console.log("req",req.body)

    let data = await settingsModel.findOne({}).lean().exec()
    
    let transporter = nodemailer.createTransport({
      //host:"smtp.ethereal.email",
      host:data.email.host,
      port:data.email.port,
      secure: false,
      auth:{
        user: data.email.user,
        pass: data.email.password
      }
    })

    await transporter.sendMail({
      from: data.email.user,
      to: email,
      subject:"PinkSurfing - Transaction Details",
      //html: `Your otp is ${otp}`
      html: emailTemplate.getInfoEmail(type,from,source,email,contactEmail,links,copyrightYear)
    })

    res.send({status: 'success', message: 'mail_sent'})
  }catch(error){
    console.log(error)
    res.status(500).send({status:'fail', message: 'failed'})
  }
})


router.post('/sendLoginEmail', async(req,res)=>{
  try{
    let {type,email} = req.body

    let data = await settingsModel.findOne({}).lean().exec()
    
    let transporter = nodemailer.createTransport({
      //host:"smtp.ethereal.email",
      host:data.email.host,
      port:data.email.port,
      secure: false,
      auth:{
        user: data.email.user,
        pass: data.email.password
      }
    })

    await transporter.sendMail({
      from: data.email.user,
      to: email,
      subject:"PinkSurfing - SignIn",
      //html: `Your otp is ${otp}`
      html: emailTemplate.getTopupEmail(type,contactEmail,links,copyrightYear)
    })

    res.send({status: 'success', message: 'mail_sent'})
  }catch(error){
    console.log(error)
    res.status(500).send({status:'fail', message: 'failed'})
  }
})

module.exports = router;
