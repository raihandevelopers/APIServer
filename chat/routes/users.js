var express = require('express');
var router = express.Router();
const body = require('express-validator').body
const header = require('express-validator').header
const query = require('express-validator').query
const validationResult = require('express-validator').validationResult
const fileUpload = require('express-fileupload');

const config = require('../config')
const request = require('request-promise')
const CustomError = require('../src/error')
const TokenValidator = require('../src/TokenValidator')
const tokenValidator = new TokenValidator(config.token.password, {
    expiresIn: "30d"
})


const cache = require('../src/cache')

const accountsModel = require('../models/accounts')
const businessModel = require('../models/businessModel')
const contactsModel = require('../models/Contacts')
const chatRoomModel = require('../models/Chatroom')
const mongoose = require('mongoose');
const { findOneAndDelete, find } = require('../models/accounts');

const validate = (routeName) => {
    switch (routeName) {
        case 'forgetPassword':
            return [
                body('email').notEmpty().exists().isEmail(),
                body('securityQuestion').notEmpty().notEmpty(),
                body('securityAnswer').notEmpty().notEmpty()
            ]

        case 'passwordResetOtp':
            return [
                body('newPassword').notEmpty().exists(),
                body('otp').notEmpty().exists(),
                body('email').notEmpty().exists().isEmail()
            ]

        case 'changePassword':
            return [
                body('old_password').notEmpty().exists(),
                body('new_password').notEmpty().exists().isLength({
                    min: 8
                }),
                header('Authorization').exists().notEmpty()
            ]

        case 'logout':
            return [
                header('Authorization').notEmpty().exists()
            ]

        case 'updateFCM':
            return [
                body('fcmToken').exists().notEmpty()
            ]

        case 'securityQuestion':
            return [
                query('email').exists().notEmpty().isEmail()
            ]

        case 'deleteExtension':
            return [
                body('dial_code').exists().notEmpty()
            ]

        case 'updateExtension':
            return [
                body('dial_code').exists().notEmpty(),
                body('url').exists().notEmpty()
            ]
        case 'deleteIndivudualChat':
            return[
                body('from').exists().notEmpty(),
                body('to').exists().notEmpty()
            ]
    }
}
  
router.get('/securityQuestion', validate('securityQuestion'), async (req, res) => {
    console.log("got hit");
    try {

        let result = await accountsModel.findOne({
            email: req.query.email
        }).lean().exec()

        console.log("Result", result)
        if (result) {
            if ((result != null || undefined) && result.securityQuestion != undefined) {

                let questions = config.securityQuestions
                let userDefinedQuestion = result.securityQuestion.trim().toLowerCase().replace(/ /g, "")
                let filteredQuestions = questions.filter(q => {
                    q = String(q).trim().toLowerCase().replace(/ /g, "")

                    if (q == userDefinedQuestion) {
                        return false
                    }

                    return true

                })
                res.send({
                    status: 'success',
                    message: '',
                    question: filteredQuestions,
                    predefinedQuestions: [],
                    //contacts: result.securityQuestion,
                    error: 'nil'
                })
            } else {
                res.send({
                    status: 'success',
                    message: 'No questions found',
                    question: '',
                    //contacts: '',
                    error: 'nil'
                })
            }

        }
    } catch (err) {
        console.log(err.message)
        res.status(500).send({
            status: 'fail',
            message: 'error occured',
            //contacts: [],
            error: 'nil'
        })
    }
})


router.post('/forgetPassword', validate('forgetPassword'), async (req, res, next) => {
    try {
        let errors = validationResult(req)
        if (errors.isEmpty() == false) {
            console.log(errors.array())
            next(new CustomError('Invalid Inputs', 422, errors.array()))
        } else {
            let {
                email,
                securityQuestion,
                securityAnswer
            } = req.body
            securityQuestion = securityQuestion.trim().toLowerCase().replace(/ /g, "")
            securityAnswer = securityAnswer.trim().toLowerCase().replace(/ /g, "")

            let userAccount = await accountsModel.findOne({
                email: email
            }).lean().exec()

            if (userAccount.securityQuestion == undefined || userAccount.securityQuestion == "" || userAccount.answer == undefined || userAccount.answer == "") {
                next(new CustomError('security Question not set', 422, []))
                return
            } else {
                let userSecurityQuestion = userAccount.securityQuestion.trim().toLowerCase().replace(/ /g, "")
                let userSecurityAnswer = userAccount.answer.trim().toLowerCase().replace(/ /g, "")

                if (securityQuestion == userSecurityQuestion && securityAnswer == userSecurityAnswer) {
                    let otp = Math.floor(100000 + Math.random() * 900000)
                    cache.create("forgetPasswordOTP", email, {
                        otp
                    }, 60 * 30 * 1000) //expires in 30 minutes

                    request.post(config.services.emailService + '/sendPasswordRecoveryEmail', {
                        method: "POST",
                        body: JSON.stringify({
                            email: email,
                            otp: otp
                        }),
                        headers: {
                            'content-type': 'application/json'
                        }

                    })
                    res.send({
                        status: "success",
                        message: "Email sent",
                        error: 'nil'
                    })
                } else {
                    res.status(422).send({
                        status: 'fail',
                        message: 'Invalid Security Question/Answer',
                        error: 'nil'
                    })
                }

            }

        }
    } catch (error) {
        next(new CustomError(error.message, 500, error.errors))
    }
})

router.post('/forgetPassword_reset', validate('passwordResetOtp'), async (req, res, next) => {
    try {
        let {
            newPassword,
            otp,
            email
        } = req.body
        let errors = validationResult(req)
        if (errors.isEmpty() == false) {
            console.log(errors.array())
            next(new CustomError('Invalid Inputs', 422, errors.array()))
        } else {
            let otpFromCache = cache.getAlive("forgetPasswordOTP", email)
            if (otpFromCache == null) {
                next(new CustomError('OTP Expired', 422, []))
                return
            }

            if (otpFromCache == otp) {
                await accountsModel.updateOne({
                    email: email
                }, {
                    $set: {
                        password: newPassword
                    }
                }).exec()

                res.status(200).send({
                    status: true,
                    message: ''
                })
            } else {
                next(new CustomError('Invalid otp', 422))
            }
        }
    } catch (error) {
        next(new CustomError('Error occured', 500, []))
    }
})

router.get('/search', async (req, res, next) => {
    try {
        //let results = await accountsModel.find({$text: {$search: req.query.value}}).lean().exec()
        let results = []
        let {page, count} = req.query
        let query = {
            $or: [{
                    firstName: {
                        $regex: String(req.query.value),
                        $options: 'i'
                    }
                },
                {
                    lastName: {
                        $regex:String(req.query.value),
                        $options: 'i'
                    }
                }
            ]
        }
         console.log("QUERY:",query)
        // let query = {
        //             name: {
        //                 $regex: String(req.query.value),
        //                 $options: 'i'
        //             }
        //         }  

        if (mongoose.isValidObjectId(req.query.value)) {
            query = {
                _id: mongoose.Types.ObjectId(req.query.value)
            }
        }

        if (req.query.value != '' || undefined) {

            let aggregateQuery = accountsModel.aggregate([{
                $match: query
                /* {
                                    //$text: {$search: req.query.value}
                                    $or: query
                                    //firstName: {$regex: req.query.value, $options: 'i'}
                                } */
            }, {
                $project: {
                    firstName: {
                        $ifNull: ["$firstName", '']
                    },
                    lastName: {
                        $ifNull: ["$lastName", '']
                    },
                    // name: 1,
                    email: 1,
                    phone: 1,
                    messengerId: 1,
                    dateOfBirth: 1,
                    lastSeen: {
                        $ifNull: ["$lastSeen", new Date('1990-01-01')]
                    },
		    profileImage: {
                        $ifNull: ["$profileImage", ""]
                    }

                }
            }])
            results = await accountsModel.aggregatePaginate(aggregateQuery,{
                page: page ? page : 1,
                lean: true,
                limit: count ? count : 10
            })
        }

        res.send({
            status: 'success',
            data: results.docs,
            total: results.totalDocs,
            page: results.page,
            pagingCounter: results.pagingCounter,
            hasPrevPage: results.hasPrevPage,
            hasNextPage: results.hasNextPage,
            prevPage: results.prevPage,
            nextPage: results.nextPage
        })
    } catch (error) {
        console.log(error)
        res.send({
            status: 'fail',
            message: 'error occurred'
        })
    }
})

router.get('/users', async (req, res) => {
    try {

        console.log("REQ>QUERY",req.query)

        let page = req.query.page
        let count = req.query.count

        let aggregateQuery = accountsModel.aggregate([{
            $match: {
                '_id': {
                    $ne: null
                }
            }
        }, {   
            $project: {  
                firstName: {
                    $ifNull: ["$firstName", '']
                },
                lastName: {
                    $ifNull: ["$lastName", '']
                },
                // name: {
                //         $ifNull: ["$name", '']
                //     },
                email: 1,
                phone: 1,
                messengerId: 1,
                dateOfBirth: 1,
		profileImage: 1,
                lastSeen: {
                    $ifNull: ["$lastSeen", new Date('1990-01-01')]
                }
            }
        }])
        let accounts = await accountsModel.aggregatePaginate(aggregateQuery, {
            page: page,
            lean: true,
            limit: count
        })
        res.send({
            status: 'success',
            accounts: accounts.docs,
            total: accounts.totalDocs,
            page: accounts.page,
            pagingCounter: accounts.pagingCounter,
            hasPrevPage: accounts.hasPrevPage,
            hasNextPage: accounts.hasNextPage,
            prevPage: accounts.prevPage,
            nextPage: accounts.nextPage
        })
    } catch (error) {
        res.status(500).send({
            status: 'fail',
            message: 'error occured'
        })
    }

})
// //check authorization header
// router.use((req, res, next) => {
//     try {
//         let data = tokenValidator.validate(req)
//         req.user = data
//         next()
//     } catch (error) {
// console.log(error)
//         res.status(error.statusCode).send({
//             message: error.message,
//             status: 'fail'
//         })
//     }

// })
        
router.post('/updatefav', async(req,res,next) => {
    try{
        console.log(req.user.email)
        let {isFav, user_id, chatType} = req.body
      let info = await contactsModel.updateOne({
              email: req.user.email,
              contact: user_id,
              chatType
          }
          ,{
              $set:{
                  isFav
              }
          })
          console.log(info)
          if(info && info.nModified == 0) {
              // return res.status(422).send({
              // 	status: 'fail',
              // 	message: 'Contact not found'
              
              // })
              const j = {
                  email: req.user.email,
                  contact: user_id,
                  chatType: chatType,
                  isFav: isFav
              }
              const c = new contactsModel(j)
              c.save(function (err, saved) {
                  if(err) {
                      res.send({ status: false, message: err,message })
                  } else if (saved) {
                      res.status(200).send({ status: 'success', message:'Updated' })
                  } else {
                      res.status(200).send({ status: 'fail', message:'not Updated' })
                  }
              } ) 
          } 
          
          res.status(200).send({
              status: 'success',
              message:'Updated'
          
          })
  
    }catch(error){
      res.status(500).send({
          status: 'fail',
              message:'Error occurred'
      })
    }
  })

router.post('/addContact', async (req, res, next) => {
    try {
        let email = req.user.email
        const a = await accountsModel.findOne({email: email}).lean().exec()
        const c = await contactsModel.find({ email: email }).count()
        console.log(email)
        console.log(req.user)
        const limit = a.contactCount - 5
        console.log(limit)
        if(limit >= c ) {
        if(req.body.email == ''){
            return res.status(422).send({
                status: 'fail',
                message: 'Not a valid email'
            })
       }

        /*         let result = await contactsModel.findOneAndUpdate({
                    email: email
                }, {
                    $addToSet: {
                        contacts: {
                            id: req.body.id
                        }
                    }
                }, {
                    new: true,
                    upsert: true
                }) */
	if(req.user.email == req.body.email) {

		return res.status(422).send({
			status: 'fail',
			message:"Cannot add loggedIn email to contacts"
		})
	}
        let contact = await accountsModel.findOne({email: req.body.email}).lean().exec()
      
        // console.log("contact",contact, req.user.email) 


        if(contact == null) {
            return res.status(422).send({
                status: 'fail',
                message: 'Not a valid email'
            })
        }
       let contactCheck = await contactsModel.findOne(
                {
		        email: req.user.email,
                contact: contact._id,
	            chatType: req.body.type,
		        isRemoved:  false		
                }
        )
        
        if(contactCheck) {
        	return res.status(422).send({
			status: 'fail',
			message:'contact already exists'
		})

        }
       let info = await contactsModel.updateOne(
                {
		            email: req.user.email,
                    contact: contact._id,
	                chatType: req.body.type
                }
        , {
            $set:{
            contact: contact._id,
            isRemoved: false,
	        chatType: req.body.type
        }
        }, {
            //new: true,
            upsert: true
        })

        // console.log("INFO",info)
/*	if(info.n != 0 && info.nModified == 0) {
		return res.status(422).send({
			status: 'fail',
			message:'contact already exists'
		})
	} */
        

        res.send({
            status: 'success',
            "message":"success"
            // message: 'contacts updated',
            // data: [{
            //     _id: contact._id,
            //     // name: contact.name || '',
            //     firstName: contact.firstName || '',
            //     lastName: contact.lastName || '',
            //     email: contact.email || '',
            //     phone: contact.phone,
            //     gender: contact.gender || '',
            //     lastSeen: contact.lastSeen || new Date('1990-01-01')
            // }]
        })
    } else {
        res.send({ status: false, message: 'please add contact limit and try'})
    }
    } catch (error) {
        console.log(error.message)
        next(new CustomError('Internal server error', 500, []))
    }
})

router.post('/removeContact', async (req, res, next) => {
    try {

	let query = [{
                    email: req.user.email
                },
                {
                    contact: req.body.id
                }
            ]

	if(req.body.type != '"') {
            query.push({chatType: req.body.type})
	}
        await contactsModel.updateOne({
            $and: query

        }, {
            $set:{
                isRemoved: true
            }
            
        })

        res.send({
            // status: 'success',
            // message: 'contact removed'
            "status":"true",
            "message":"success"        
        })

    } catch (error) {
        console.log(error)
        next(new CustomError('Internal server error', 500, []))
    }
})

router.get('/contactList', async (req, res, next) => {
    try {
        let {
            page,
            count,
	    type
        } = req.query
        // page == undefined || '' ? 1 : page
        // count == undefined || '' ? 10 : count
console.log(req.query, req.user.email)
	let query = [{
                email: req.user.email
            }, {
                isRemoved: false
            }]

	if(req.query.type) { query.push({chatType: type})}

        let contactIds = await contactsModel.paginate({
            $and: query
        }, {
            page: page ? page : 1,
            lean: true,
            limit: count ? count : 10
        })

        let ids = []
	let accountType = {}
	let accountTypeArr = []
	let isFav = {}
        contactIds.docs.forEach(_doc => {
            ids.push(_doc.contact)
	    accountType[_doc.contact] = _doc.chatType
	    isFav[_doc.contact] = _doc.isFav
	    accountTypeArr.push({_id: _doc.contact, isFav: _doc.isFav || false, type: _doc.chatType})
        })

        let contacts = await accountsModel.find({
            _id: {
                $in: ids
            }
/*        }, {
            firstName: 1,
            lastName: 1,
            // name:1,
            _id: 1,
            phone: 1,
            email: 1,
	   countrycode: 1,
	   mobile: 1,
 	   lastSeen: 1,
	   profileImage: 1 */
        }).lean().exec()

  //      console.log("CONTACT LIST", contacts)

        let result = []
	console.log('accountTypeArr-full', accountTypeArr)
       // contacts.forEach(_contact => {
	for(let i =0; i<ids.length; i++) {
	   let _contact = contacts.filter(_c => ids[i] == _c._id)
	   _contact = _contact[0]
	   let index 
	   let accountData = accountTypeArr.filter((_acc, _index) =>{
//		console.log(_acc, _contact._id)
		if(_acc._id == _contact._id) {
			index = _index
			return true
		}
	  })
	console.log('accountData',accountData)
	console.log('accountTypeArr', accountTypeArr[index], index)

	   let temp = {
                _id: '',
                firstName: '',
                lastName: '',
                image: '',
                company_logo: '',
                countrycode: '',
                phone: '',
        //      mobile: '',
                type: accountTypeArr[index].type, //accountData[0].type, // accountType[_contact._id], //req.query.type,
                // name:'',
                email: '',
          //      phone: '',
                gender: '',
                profileImage: '',
                isFav: accountTypeArr[index].isFav || false , //accountData[0].isFav || false ,//isFav[_contact._id] || false ,
                lastSeen: new Date('1990-01-01')
            }

	   Object.keys(temp).forEach(_key => {
                if (_contact[_key]) {
                    temp[_key] = _contact[_key]
                }
            })	
            result.push(temp)
	accountTypeArr.splice(index, 1)

	}

/*
	contacts.forEach(_contact => {
            let temp = {
                _id: '',
                firstName: '',
                lastName: '',
		image: '',
		company_logo: '',
		countrycode: '',
		phone: '',
	//	mobile: '',
		type: accountType[_contact._id], //req.query.type,
                // name:'',
                email: '',
          //      phone: '',
                gender: '',
		profileImage: '',
		isFav: isFav[_contact._id] || false ,
                lastSeen: new Date('1990-01-01')
            }
            Object.keys(temp).forEach(_key => {
                if (_contact[_key]) {
                    temp[_key] = _contact[_key]
                }
            })

            result.push(temp)
        })
*/

        /*       let results = await contactsModel.paginate({
        //            isRemoved: false
        	
                }, {
                    page: page,
                    lean: true,
                    limit: count
                })
        */
        //	let result = await 
        // let result = await contactsModel.findOne({
        //     email: req.user.email
        // }).lean().exec()

        // let results = result.contacts
        // let ids = []
        // console.log('results', results)
        // results.forEach(_contacts => {
        //     ids.push(_contacts.id)
        // })
        // console.log('ids', ids)
        // let resultF = await contactsModel.aggregate([{
        //     $match: {
        //         _id: {
        //             $in: ids
        //         }
        //     }
        // }, {
        //     $project: {
        //         firstName: 1,
        //         lastName: 1,
        //         email: 1,

        //     }
        // }])

        console.log("RESULT:",result)

        res.send({
            status: 'success',
            data: result,
            total: contactIds.totalDocs,
            page: contactIds.page,
            pagingCounter: contactIds.pagingCounter,
            hasPrevPage: contactIds.hasPrevPage,
            hasNextPage: contactIds.hasNextPage,
            prevPage: contactIds.prevPage,
            nextPage: contactIds.nextPage
        })
    } catch (error) {
        console.log(error)
        next(new CustomError('Internal server error', 500, []))
    }
}) 

router.get('/getContacts/:userId', async (req, res, next) => {
    try {
        let userId = req.params.userId
        let email = req.user.email
        let contacts = await contactsModel.findOne({
            email: email,
            contact: userId
        }).lean().exec()
        if(contacts == null) {
            return res.status(422).send({
                status: 'fail',
                message: 'No contacts found'
            })
        }
        let contact = await accountsModel.findOne({
            _id: userId
        }).lean().exec()
        if(contact == null) {
            return res.status(422).send({
                status: 'fail',
                message: 'No contacts found'
            })
        }
        res.send({
            status: 'success',
            data: [{
                _id: contact._id,
                // name: contact.name || '',
                firstName: contact.firstName || '',
                lastName: contact.lastName || '',
                email: contact.email || '',
                phone: contact.phone,
            }]
        })
    } catch (error) {
        console.log(error.message)
        next(new CustomError('Internal server error', 500, []))
    }
})

// router.get('/getContacts', async (req, res, next) => {
//     try {
//         let email = req.user.email
//         let contacts = await contactsModel.find({
//             email: email,
//             isRemoved: false
//         }).populate('contact', 'firstName lastName email phone').lean().exec()

//         let data = contacts.map(contact => {
//             return {
//                 _id: contact.contact._id,
//                 firstName: contact.contact.firstName,
//                 lastName: contact.contact.lastName,
//                 email: contact.contact.email,
//                 phone: contact.contact.phone,

//                 isFav: contact.isFav,
//                 chatType: contact.chatType
//             }
//         })

//         res.send({
//             status: 'success',
//             message: 'contacts fetched',
//             data: data
//         })

//     } catch (error) {
//         console.log(error)
//         next(new CustomError('Internal server error', 500, []))
//     }
// })

// router.get('/getcontactlistofcontactList', async (req, res, next) => {
//     try {   //console.log("req.query", req.query)
//         let {
//             page,
//             count,

//         } = req.query
//         // page == undefined || '' ? 1 : page
//         // count == undefined || '' ? 10 : count
//         let query = [{
//             email: req.user.email
//             // userId: req.user.id
//         }, {
//             isRemoved: false
//         }]

//         let contactIds = await contactsModel.paginate({
//             $and: query
//         }, {
//             page: page ? page : 1,
//             lean: true,
//             limit: count ? count : 10
//         })

//         let ids = []
//         contactIds.docs.forEach(_doc => {
//             ids.push(_doc.contact)
//         })

//         let contacts = await accountsModel.find({
//             _id: {
//                 $in: ids
//             }
//         }, {
//             firstName: 1,
//             lastName: 1,
//             _id: 1,
//             phone: 1,
//             email: 1,
//             countrycode: 1,
//             mobile: 1,
//             lastSeen: 1,
//             profileImage: 1
//         }).lean().exec()

//         let result = []
//         contacts.forEach(_contact => {
//             let temp = {
//                 _id: '',
//                 firstName: '',
//                 lastName: '',
//                 image: '',
//                 company_logo: '',
//                 countrycode: '',
//                 phone: '',
//                 type: '',   
//                 // name:'',
//                 email: '',
//                 // phone: '',
//                 gender: '',
//                 profileImage: '',
//                 // isFav: accountTypeArr[index].isFav || false , //accountData[0].isFav || false ,//isFav[_contact._id] || false ,
//                 lastSeen: new Date('1990-01-01')
//             }

//             Object.keys(temp).forEach(_key => {

//                 if (_contact[_key]) {

//                     temp[_key] = _contact[_key]
//                 }
//             })
//             result.push(temp)
//         })

//         res.send({
//             status: 'success',
//             data: result,
//             total: contactIds.totalDocs,
//             page: contactIds.page,

//             pagingCounter: contactIds.pagingCounter,
//             hasPrevPage: contactIds.hasPrevPage,
//             hasNextPage: contactIds.hasNextPage,
//             prevPage: contactIds.prevPage,
//             nextPage: contactIds.nextPage
//         })
//     } catch (error) {
//         console.log(error)
//         next(new CustomError('Internal server error', 500, []))
//     }
// })

// router.get('/contactList/:id', async (req, res, next) => {
//     try {
//         let {
//             page,
//             count,

//         } = req.query
//         // page == undefined || '' ? 1 : page
//         // count == undefined || '' ? 10 : count
//         let contactIds = await contactsModel.paginate({
//             $and: [{
//                     email: req.user.email
//                 },
//                 {
//                     contact: req.params.id
//                 }
//             ]
//         }, {
//             page: page ? page : 1,
//             lean: true,
//             limit: count ? count : 10
//         })

//         let ids = []
//         contactIds.docs.forEach(_doc => {
//             ids.push(_doc.contact)
//         })

//         let contacts = await accountsModel.find({
//             _id: {
//                 $in: ids
//             }
//         }).lean().exec()

//         let result = []
//         contacts.forEach(_contact => {
//             let temp = {
//                 _id: '',
//                 firstName: '',
//                 lastName: '',
//                 image: '',
//                 company_logo: '',
//                 countrycode: '',
//                 phone: '',
//                 type: '',
//                 // name:'',
//                 email: '',
//                 // phone: '',


//             }

//             Object.keys(temp).forEach(_key => {
//                 if (_contact[_key]) {
//                     temp[_key] = _contact[_key]
//                 }
//             })
//             result.push(temp)
//         })

//         res.send({
//             status: 'success',
//             data: result,
//             total: contactIds.totalDocs,
//             page: contactIds.page,
//             pagingCounter: contactIds.pagingCounter,
//             hasPrevPage: contactIds.hasPrevPage,
//             hasNextPage: contactIds.hasNextPage,
//             prevPage: contactIds.prevPage,
//             nextPage: contactIds.nextPage
//         })
//     } catch (error) {
//         console.log(error)
//         next(new CustomError('Internal server error', 500, []))
//     }
// })

// // this function is used to get the contact list of each user with user id
// router.get('/contactList/:id/:type', async (req, res, next) => {
//     try {
//         let {
//             page,
//             count,

//         } = req.query
//         // page == undefined || '' ? 1 : page
//         // count == undefined || '' ? 10 : count
//         let contactIds = await contactsModel.paginate({
//             $and: [{
//                     email: req.user.email
//                 },
//                 {   contact: req.params.id
//                 },  {                           
//                     chatType: req.params.type
//                 }
//             ]
//         }, {
//             page: page ? page : 1,
//             lean: true,
//             limit: count ? count : 10
//         })

//         let ids = []
//         contactIds.docs.forEach(_doc => {           
//             ids.push(_doc.contact)
//         })

//         let contacts = await accountsModel.find({
//             _id: {
//                 $in: ids
//             }
//         }).lean().exec()

//         let result = []
//         contacts.forEach(_contact => {
//             let temp = {
//                 _id: '',
//                 firstName: '',
//                 lastName: '',
//                 image: '',
//                 company_logo: '',
//                 countrycode: '',
//                 phone: '',
//                 type: '',
//                 // name:'',
//                 email: '',
//                 // phone: '',


//             }

//             Object.keys(temp).forEach(_key => {
//                 if (_contact[_key]) {
//                     temp[_key] = _contact[_key]
//                 }
//             })
//             result.push(temp)
//         })

//         res.send({
//             status: 'success',
//             data: result,
//             total: contactIds.totalDocs,
//             page: contactIds.page,
//             pagingCounter: contactIds.pagingCounter,
//             hasPrevPage: contactIds.hasPrevPage,
//             hasNextPage: contactIds.hasNextPage,
//             prevPage: contactIds.prevPage,
//             nextPage: contactIds.nextPage
//         })
//     } catch (error) {
//         console.log(error)
//         next(new CustomError('Internal server error', 500, []))
//     }
// })


// router.get('/contactList/:userId', async (req, res, next) => {
//     try {
//         let {
//             page,
//             count
//         } = req.query
//         // page == undefined || '' ? 1 : page
//         // count == undefined || '' ? 10 : count
//         let contactIds = await contactsModel.paginate({
//             email: req.user.email,
//             contact: req.params.userId
//         }, {
//             page: page ? page : 1,  
//             lean: true,
//             limit: count ? count : 10
//         })

//         let ids = []
//         contactIds.docs.forEach(_doc => {
//             ids.push(_doc.contact)
//         })

//         let contacts = await accountsModel.find({
//             _id: {
//                 $in: ids
//             }
//         }).lean().exec()

//         let result = []
//         contacts.forEach(_contact => {
//             let temp = {
//                 _id: '',
//                 firstName: '',
//                 lastName: '',
//                 image: '',
//                 company_logo: '',
//                 countrycode: '',
//                 phone: '',
//                 type: '',
//                 name: '',
//                 email: '',
//                 phone: '',


//             }

//             Object.keys(temp).forEach(_key => {
//                 if (_contact[_key]) {
//                     temp[_key] = _contact[_key]
//                 }
//             })
//             result.push(temp)
//         })

//         res.send({
//             status: 'success',
//             data: result,
//             total: contactIds.totalDocs,
//             page: contactIds.page,
//             pagingCounter: contactIds.pagingCounter,
//             hasPrevPage: contactIds.hasPrevPage,
//             hasNextPage: contactIds.hasNextPage,
//             prevPage: contactIds.prevPage,
//             nextPage: contactIds.nextPage
//         })
//     } catch (error) {
//         console.log(error)
//         next(new CustomError('Internal server error', 500, []))
//     }
// })

router.use(fileUpload()); // For getting kycDocumets

router.post('/changePassword', validate('changePassword'), async (req, res, next) => {
    try {
        let errors = validationResult(req)
        if (errors.isEmpty() == false) {
            console.log(errors.array())
            next(new CustomError('Invalid Inputs', 422, errors.array()))
        } else {
            let {
                old_password,
                new_password
            } = req.body

            let account = await accountsModel.findOne({
                email: req.user.email
            }).lean().exec()
            if (account.password != old_password) {
                next(new CustomError('Invalid password', 422, []))
                return
            } else {
                await accountsModel.updateOne({
                    email: req.user.email
                }, {
                    $set: {
                        password: new_password
                    }
                })

                res.send({
                    status: true,
                    message: 'password updated'
                })
            }
        }
    } catch (error) {
        next(new CustomError('Internal server error', 500, []))
    }
})

router.get('/user', async (req, res) => {
    try {

        console.log("REQ>QUERY",req.user)

        let account = await accountsModel.findOne({
            email: req.user.email
        }).lean().exec()
        delete account['password']
        res.send({
            status: true,
            data: {
                _id: account._id,
                firstName: account.firstName || '',
                lastName: account.lastName || '',
                // name: account.name || '',
                gender: account.gender || '',
                phone: account.phone || '',
		email: account.email || '',
                lastSeen: account.lastSeen || new Date(),
		profileImage: account.profileImage || ''
            }
//            data: account
        })
    } catch (error) {
        console.log("ERROR:",error)
        res.status(500).send({
            status: false,
            user: '',
            message: 'error occured'
        })
    }
})

router.get('/otherUser', async (req, res) => {
    try {


        if(req.query.id ==''){
            return res.status(422).send({
                status: 'fail',
                message: 'Not a valid id'
            }) 
       }

        let account = await accountsModel.findOne({
            _id: req.query.id
        }).lean().exec()


        if(account == null){
            return res.status(422).send({
                status: 'fail',
                message: 'Not a valid id'
            })
       }

        delete account['password']
	delete account['secret']
        delete account['pin']
        delete account['ref']

    let bussinessInfo = await businessModel.findOne({ user_email: account.email }).lean().exec()
	account.business_profile = bussinessInfo;
	//add isFav
	let contact = await contactsModel.findOne({email: req.user.email,contact: req.query.id}).lean()
	account.isFav = contact && contact.isFav ? contact.isFav : false


        res.send({
            status: true,
        data: account /*{
                _id: account._id,
                // name: account.name,
                firstName: account.firstName || '',
                lastName: account.lastName || '',
                gender: account.gender || '',
                phone: account.phone || '',
		 email: account.email || '',

                lastSeen: account.lastSeen || new Date(),
            } */
//            data: account
        })
    } catch (error) {
        console.log("ERROR:",error)
        res.status(500).send({
            status: false,
            user: '',
            message: 'error occured'
        })
    }
})

router.get('/extension', async (req, res, next) => {
    try {

        let codes = await accountsModel.aggregate([{
            $match: {
                email: req.user.email
            }
        }, {
            $project: {
                _id: 0,
                "dial0": {
                    "$ifNull": ["$dialCodes.dial0", ""]
                },
                "dial1": {
                    "$ifNull": ["$dialCodes.dial1", ""]
                },
                "dial2": {
                    "$ifNull": ["$dialCodes.dial2", ""]
                },
                "dial3": {
                    "$ifNull": ["$dialCodes.dial3", ""]
                },
                "dial4": {
                    "$ifNull": ["$dialCodes.dial4", ""]
                },
                "dial5": {
                    "$ifNull": ["$dialCodes.dial5", ""]
                },
                "dial6": {
                    "$ifNull": ["$dialCodes.dial6", ""]
                },
                "dial7": {
                    "$ifNull": ["$dialCodes.dial7", ""]
                },
                "dial8": {
                    "$ifNull": ["$dialCodes.dial8", ""]
                },
                "dial9": {
                    "$ifNull": ["$dialCodes.dial9", ""]
                },
            }
        }]).exec()

        console.log("DATAS",codes)

        res.send({
            status: 'success',
            message: 'success',
            data: codes[0]
        })
    } catch (error) {

    }
})

router.post('/updateExtension', validate('updateExtension'), async (req, res, next) => {
    try {
        let errors = validationResult(req)
        if (errors.isEmpty() == false) {
            console.log(errors.array())
            next(new CustomError('Invalid Inputs', 422, errors.array()))
        } else {
            let account = await accountsModel.findOneAndUpdate({
                email: req.user.email
            }, {
                $set: {
                    [`dialCodes.${req.body.dial_code}`]: req.body.url
                }
            }, {
                upsert: true,
                new: true
            })

            res.send({
                status: 'success',
                message: 'success',
                data: account.dialCodes
            })
        }
    } catch (error) {
        console.log(error.message)
        next(new CustomError('Internal server error', 500, []))
    }
})

router.post('/deleteExtension', validate('deleteExtension'), async (req, res, next) => {
    try {
        let errors = validationResult(req)
        if (errors.isEmpty() == false) {
            console.log(errors.array())
            next(new CustomError('Invalid Inputs', 422, errors.array()))
        } else {
            let account = await accountsModel.findOneAndUpdate({
                email: req.user.email
            }, {
                $set: {
                    [`dialCodes.${req.body.dial_code}`]: ""
                }
            }, {
                upsert: true,
                new: true
            })

            res.send({
                status: 'success',
                message: 'success',
                data: account.dialCodes
            })
        }
    } catch (error) {
        console.log(error.message)
        next(new CustomError('Internal server error', 500, []))
    }
})

router.post('/updateFCMToken', validate('updateFCM'), async (req, res, next) => {
    try {
        let errors = validationResult(req)
console.log(req.user)
        if (errors.isEmpty() == false) {
            console.log(errors.array())
            next(new CustomError('Invalid Inputs', 422, errors.array()))
        } else {
            await accountsModel.updateOne({
                email: req.user.email
            }, {
                $set: {
                    FCMToken: req.body.fcmToken
                }
            })

            res.send({
                status: true,
                message: 'updated'
            })
        }

    } catch (error) {
        console.log("ERROR:",error)
        next(new CustomError('Internal Server Error', 500, []))
    }
})

router.post('/updateLastSeen', async (req, res, next) => {
    try {

        let {
            online,
            lastSeen
        } = req.body
        online == undefined ? false : online
        lastSeen == undefined ? '' : lastSeen
        await accountsModel.updateOne({
            email: req.user.email
        }, {
            $set: {
                lastSeen: new Date(),
            }
        })

        res.send({
            "status":"true",
            "message":"success"
        })

    } catch (error) {
        next(new CustomError('Internal server error', 500, []))
    }
})

router.post('/logout', validate('logout'), async (req, res, next) => {
    try {
        let errors = validationResult(req)
        if (errors.isEmpty() == false) {
            console.log(errors.array())
            next(new CustomError('Invalid Inputs', 422, errors.array()))
        } else {
            await accountsModel.updateOne({email: req.user.email},{$set:{FCMToken: ''}}).exec()

            cache.remove(cache.collectionName.session, req.user.email)

            res.send({
                status: 'success',
                message: 'logging out...'
            })
        }
    } catch (error) {
	console.error(error.message)
        next(new CustomError('Internal Server Error', 500, []))
    }
})

router.post('/deleteIndivudualChat', validate('deleteIndivudualChat'), async (req, res, next) => {
    try {
        let errors = validationResult(req)
        if (errors.isEmpty() == false) {
            console.log(errors.array())
            next(new CustomError('Invalid Inputs', 422, errors.array()))
        } else {

            let from = req.body
            let to = req.body

            await chatRoomModel.deleteOne({$and:[{"from":from},{"to":to}]})


            res.send({
                status: 'success',
                message: 'deleted'
            })
        }
    } catch (error) {
	console.error(error.message)
        next(new CustomError('Internal Server Error', 500, []))
    }
})


router.use((err, req, res, next) => {
    res.status(err.statusCode).send({
        status: 'fail',
        message: err.message,
        error: err.erros
    })
})

// get friends list
router.post('/get_friends_list',  async (req, res, next) => {
    try {
        const email = req.user.email
        const e = await contactsModel.find({ email:email }, function (err, c ) {
            if(err) {
                res.send({ status: false, message: err.message })
            } 
        })
        
        if(e.length > 0) {
            const ar = []
            e.forEach( async function (el) {
                 ar.push(el.contact)
            })

            const user = await accountsModel.find({ _id: { $in: ar } })
            const arr = []
            user.forEach(el => {
                arr.push(el.email)
            })
            
            const fof = await contactsModel.find({ email: { $in: arr } })
            const arra = []
            fof.forEach(ele => {
                arra.push(ele.contact)
            })

            const array1 = arra.filter(val => !ar.includes(val));
            const c = await finduser(ar)
            const d = await finduser(array1)
        res.send({ status: true, message: 'friends list', friendsList: c, friendsOfFriendsList: d })
        } else {
            res.send({ status: false, message: 'No friends list' })
        }
    } catch (error) {
        console.error(error.message)
        next(new CustomError('Internal Server Error', 500, []))
        }
   })

    const finduser = (ar) => {
        const user = accountsModel.find({ _id: { $in: ar } })
    return user
    }
 
router.get('/update_user',  async (req, res, next) => {
    await accountsModel.find({}, function (err, c ) {
        if(err) {
            res.send({ status: false, message: err.message })
        } else if(c.length > 0) {
            c.forEach(el => {
                console.log(el.contactCount)
                accountsModel.findByIdAndUpdate(el._id, { contactCount: 250 }, function(err) {
                    if(err) {
                        res.send({ status: false, message: err.message })
                    }
                })
            })
           } else {
               res.send({ status: false, message: 'users not found'})
           }
    })
})

router.post('/contact_list',  async (req, res, next) => {
    let email = req.user.email
    console.log(email)
    // const usingArrayFrom = Array.from(string)
    // const usingObjectAssign = Object.assign([], string)
    let type = ''
   if(req.body.type){
     type = req.body.type
   }
    const e = await contactsModel.find({ email:email, chatType:type, isRemoved: false }, function (err, c ) {
        if(err) {
            res.send({ status: false, message: err.message })
        } 
    })
    const arr =[]
    e.forEach(el => {
        arr.push(el.contact)
    })
    
    const acc = await accountsModel.find({ _id: { $in : arr } }, function (err, found) {
        if(err) {
            res.send({ status: false, message: err.message })
        } 
    })
    
    const array = []
    acc.forEach(async function (el) {
        array.push(el.email)
    })


    const b = await businessModel.find({ user_email: { $in: array } }, function (err, fnd) {
        if(err) {
            console.log(err.message)
        } 
    })
    
    let arrays = []
    acc.forEach( async function (el) {
        b.forEach( async function (element)  {
            if(el.email === element.user_email) {
                const bjson = {
                    wallets: el.wallets,
                    dialCodes: el.dialCodes,
                    businessAccountStatus: el.businessAccountStatus,
                    kycLevel: el.kycLevel,
                    lastSeen: el.lastSeen,
                    profileImage: el.profileImage,
                    contactCount: el.contactCount,
                    location: el.location,
                    industry: el.industry,
                    mood: el.mood,
                    position: el.position,
                    status: el.status,
                    _id: el._id,
                    phone: el.phone,
                    dateOfBirth: el.dateOfBirth,
                    auth2: el.auth2,
                    accountStatus: el.accountStatus,
                    profileStatus: el.profileStatus,
                    fiatBalance: el.fiatBalance,
                    bankStatus: el.bankStatus,
                    whitelist: el.whitelist,
                    passport: el.passport,
                    license: el.license,
                    idcard: el.idcard,
                    phoneAuth: el.phoneAuth,
                    firstName: el.firstName,
                    lastName: el.lastName,
                    email: el.email,
                    password: el.password,
                    ref: el.ref,
                    pin: el.pin,
                    kycStatus: el.kycStatus,
                    hasTransactionPin: el.hasTransactionPin,
                    FCMToken: el.FCMToken,
                    countrycode: el.countrycode,
                    name: el.firstName+' '+el.lastName,
                    city: el.city,
                    country: el.country,
                    dob: el.dob,
                    postalCode: el.postalCode,
                    state: el.state,
                    streetAddress: el.streetAddress,
                    unit: el.unit,
                    business_profile: element
                }
            arrays.push(bjson)
            } else {
                const cjson = {
                    wallets: el.wallets,
                    dialCodes: el.dialCodes,
                    businessAccountStatus: el.businessAccountStatus,
                    kycLevel: el.kycLevel,
                    lastSeen: el.lastSeen,
                    profileImage: el.profileImage,
                    contactCount: el.contactCount,
                    location: el.location,
                    industry: el.industry,
                    mood: el.mood,
                    position: el.position,
                    status: el.status,
                    _id: el._id,
                    phone: el.phone,
                    dateOfBirth: el.dateOfBirth,
                    auth2: el.auth2,
                    accountStatus: el.accountStatus,
                    profileStatus: el.profileStatus,
                    fiatBalance: el.fiatBalance,
                    bankStatus: el.bankStatus,
                    whitelist: el.whitelist,
                    passport: el.passport,
                    license: el.license,
                    idcard: el.idcard,
                    phoneAuth: el.phoneAuth,
                    firstName: el.firstName,
                    lastName: el.lastName,
                    email: el.email,
                    password: el.password,
                    ref: el.ref,
                    pin: el.pin,
                    kycStatus: el.kycStatus,
                    hasTransactionPin: el.hasTransactionPin,
                    FCMToken: el.FCMToken,
                    countrycode: el.countrycode,
                    name: el.firstName+' '+el.lastName,
                    city: el.city,
                    country: el.country,
                    dob: el.dob,
                    postalCode: el.postalCode,
                    state: el.state,
                    streetAddress: el.streetAddress,
                    unit: el.unit,
                    business_profile: null
                }
            arrays.push(cjson)
            }
        })
    })
    if(arrays.length > 0) {
        var seenNames = {};

        arrays = arrays.filter(function(currentObject) {
                if (currentObject._id in seenNames) {
                    return false;
                } else {
                    seenNames[currentObject._id] = true;
                    return true;
                }
            });
        console.log(arrays.length)
        const a = []
        arrays.forEach(el => {
            e.forEach(ele => {
                if(ele.contact == el._id) {
                    const bjson = {
                        isFav: ele.isFav,
                        wallets: el.wallets,
                        dialCodes: el.dialCodes,
                        businessAccountStatus: el.businessAccountStatus,
                        kycLevel: el.kycLevel,
                        lastSeen: el.lastSeen,
                        location: el.location,
                        industry: el.industry,
                        position: el.position,
                        status: el.status,
                        mood: el.mood,
                        profileImage: el.profileImage,
                        contactCount: el.contactCount,
                        _id: el._id,
                        phone: el.phone,
                        dateOfBirth: el.dateOfBirth,
                        auth2: el.auth2,
                        accountStatus: el.accountStatus,
                        profileStatus: el.profileStatus,
                        fiatBalance: el.fiatBalance,
                        bankStatus: el.bankStatus,
                        whitelist: el.whitelist,
                        passport: el.passport,
                        license: el.license,
                        idcard: el.idcard,
                        phoneAuth: el.phoneAuth,
                        firstName: el.firstName,
                        lastName: el.lastName,
                        email: el.email,
                        password: el.password,
                        ref: el.ref,
                        pin: el.pin,
                        kycStatus: el.kycStatus,
                        hasTransactionPin: el.hasTransactionPin,
                        FCMToken: el.FCMToken,
                        countrycode: el.countrycode,
                        name: el.firstName+' '+el.lastName,
                        city: el.city,
                        country: el.country,
                        dob: el.dob,
                        postalCode: el.postalCode,
                        state: el.state,
                        streetAddress: el.streetAddress,
                        unit: el.unit,
                        business_profile: el.business_profile
                    }
                a.push(bjson)
                }
            })
        })
        if(a.length > 0) {
          res.send({ status: true, message: 'contact list retrieve', data: a })
        }
    } else {
        res.send({ status: true, message: 'no contact list' })
    }
})


module.exports = router
