var express = require('express');
var router = express.Router();
const fileUpload = require('express-fileupload');
const path = require('path');
const config = require('../config')

router.use(fileUpload()); // For getting kycDocumets

router.post('/uploadKYC', async (req, res) => {
  try {

    let email = req.body.email
    let type = req.body.type

    // I N I T I A L I Z I N G    T H E    F I L E N A M E 
    let id_1 = req.files.id_1
    let id_2 = req.files.id_2

    // R E N A M I N G    T H E    F I L E N A M E 
    id_1.name = email + '_' + type + '_' + 'id_1.jpg';
    id_2.name = email + '_' + type + '_' + 'id_2.jpg';

    console.log("id_1", id_1.name, id_2.name)
    // M O V E    I M G    T O    K Y C    P A T H
    id_1.mv(path.join(config.kycPath, id_1.name));
    id_2.mv(path.join(config.kycPath, id_2.name));


    return res.status(200).send({
      status: "Success",
      message: "KYC Documents Uploaded"
    })

  } catch (error) {

    console.log("ERRRRRR", error)
    return res.status(500).send({
      status: "Fail",
      message: "Internal Server Error"
    })

  }
})

router.post('/uploadBusinessLogo', async (req, res) => {
  try {

    let email = req.body.email

    // I N I T I A L I Z I N G    T H E    F I L E N A M E 
    let id_1 = req.files.id_1;
    let type = req.body.type;

    // R E N A M I N G    T H E    F I L E N A M E 
    id_1.name = email + 'businesslogo.jpg';

    // M O V E    I M G    T O    K Y C    P A T H
    id_1.mv(path.join(config.businesslogoPath, id_1.name));

    return res.status(200).send({
      status: "Success",
      message: "Bussiness Logo Documents Uploaded"
    })

  } catch (error) {

     return res.status(500).send({
      status: "Fail",
      message: "Internal Server Error"
    })

  }
})


router.post('/uploadLegalName', async (req, res) => {
  try {

    let id = req.body.id
    let type = req.body.type

    // I N I T I A L I Z I N G    T H E    F I L E N A M E 
    let id_1 = req.files.id_1

    // R E N A M I N G    T H E    F I L E N A M E 
    id_1.name = id + '_' + type + '.jpg';

    // M O V E    I M G    T O    K Y C    P A T H
    id_1.mv(path.join(config.kycPath, id_1.name));

    return res.status(200).send({
      status: "Success",
      message: "LegalName Document Uploaded"
    })

  } catch (error) {

    console.log("ERRRRRR", error)
    return res.status(500).send({
      status: "Fail",
      message: "Internal Server Error"
    })

  }
})

router.post('/uploadTxnReceipt', async (req, res) => {
  try {

    let email = req.body.email
    let type = req.body.type

    // I N I T I A L I Z I N G    T H E    F I L E N A M E 
    let id_1 = req.files.id_1

    // R E N A M I N G    T H E    F I L E N A M E 
    id_1.name = email + type + '.jpg';

    // M O V E    I M G    T O    K Y C    P A T H
    id_1.mv(path.join(config.txnPath, id_1.name));

    return res.status(200).send({
      status: "Success",
      message: "LegalName Document Uploaded"
    })

  } catch (error) {

    console.log("ERRRRRR", error)
    return res.status(500).send({
      status: "Fail",
      message: "Internal Server Error"
    })

  }
})


router.post('/uploadCoins', async (req, res) => {
  try {

    // I N I T I A L I Z I N G    T H E    F I L E N A M E 
		let btc = req.files.btc;
		let eth = req.files.eth;
		let usdt = req.files.usdt;
		let bizx = req.files.bizx;

    // R E N A M I N G    T H E    F I L E N A M E 
		btc.name = "BTC.png";
		eth.name = "ETH.png";
		usdt.name = "USDT.png";
		bizx.name = "BIZX.png";

    // M O V E    I M G    T O    K Y C    P A T H
		btc.mv(path.join(config.cryptImgPath, btc.name));
		eth.mv(path.join(config.cryptImgPath, eth.name));
		usdt.mv(path.join(config.cryptImgPath, usdt.name));
		bizx.mv(path.join(config.cryptImgPath, bizx.name));

    return res.status(200).send({
      status: "Success",
      message: "CryptoCurrencies Logo Updated"
    })

  } catch (error) {

    console.log("ERRRRRR", error)
    return res.status(500).send({
      status: "Fail",
      message: "Internal Server Error"
    })

  }
})




module.exports = router;
