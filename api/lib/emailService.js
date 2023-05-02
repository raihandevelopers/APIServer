let nodemailer = require('nodemailer')
let config = require('../config').email
const emailTemplate = require('../static/emailTemplate')

let contactEmail = 'contact@/pinksurfing.com'
let links = {
    weblink: 'http://pinksurfing.io',
    twitterUrl: 'https://twitter.com/pinksurfing',
    facebookUrl: 'https://facebook.com/pinksurfing',
    instaUrl: "https://instrgram.com/pinksurfing",
    linkedinUrl: "https://www.linkedin.com/company/pinksurfing",
    tumblrUrl: "https://tumblr.com/pinksurfing",
    telegramUrl: 'https://t.me/pinksurfing'
}
let copyrightYear = 2020

const sendOtp = async (email, otp) => {
    try {

        let transporter = nodemailer.createTransport({
            //host:"smtp.ethereal.email",
            host: config.host,
            port: config.port,
            secure: false,
            auth: {
                user: config.user,
                pass: config.password
            }
        })

        await transporter.sendMail({
            from: config.user,
            to: email,
            subject: "Fasset - Confirm your email",
            //html: `Your otp is ${otp}`
            html: emailTemplate.getRegistrationEmail(otp, email, contactEmail, links, copyrightYear)
        })
    } catch (error) {
        console.log(error)
        throw "error"
    }
    return
}

const sendPasswordEmail = async (email, otp) => {
    try {
        let transporter = nodemailer.createTransport({
            //host:"smtp.ethereal.email",
            host: config.host,
            port: config.port,
            secure: false,
            auth: {
                user: config.user,
                pass: config.password
            }
        })

        await transporter.sendMail({
            from: config.user,
            to: email,
            subject: "Fasset - Forget Password",

            html: emailTemplate.getforgetPasswordEmail(otp, email, contactEmail, links, copyrightYear)
            /*             html : ` <center> <h1> Fasset - Forget Password </h1> <br>
                        <br>Your otp to change password, <h4> ${otp} </h4> <br>` */
        })
    } catch (error) {
        console.log(error)
        throw "error"
    }
    return
}

const send2faCode = async (email, otp) => {

    try {
        let transporter = nodemailer.createTransport({
            //host:"smtp.ethereal.email",
            host: config.host,
            port: config.port,
            secure: false,
            auth: {
                user: config.user,
                pass: config.password
            }
        })

        await transporter.sendMail({
            from: config.user,
            to: email,
            subject: "Fasset - OTP to login",

            html: emailTemplate.getRegistrationEmail(otp, email, contactEmail, links, copyrightYear)
            /* html : ` <center> <h1> Fasset - OTP </h1> <br>
            <br>Your otp to login, <h4> ${otp} </h4> <br>` */
        })
    } catch (error) {
        console.log(error)
        throw "error"
    }
    return
}
module.exports = {
    sendOtp,
    sendPasswordEmail,
    send2faCode
}