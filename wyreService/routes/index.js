var express = require("express");
var router = express.Router();
const CryptoJS = require("crypto-js");
const config = require("../config");
const requestPromise = require("request-promise");
const axios = require("axios");
var CircularJSON = require('circular-json');
const { response } = require("express");
const testUrl = "https://api.testwyre.com";
const productionUrl = "https://api.sendwyre.com";
const API_SECRET_KEY = config.API_SECRET_KEY;
const API_KEY = config.API_KEY;
const ACCOUNT_ID = config.ACCOUNT_ID;
const REDIRECT_URL = config.REDIRECT_URL;
const FAILURE_REDIRECT_URL = config.FAILURE_REDIRECT_URL
const orderModel = require('../models/orders')
const sdk = require('api')('@wyre-hub/v3#5tssmynlkvts70mq');

// S I G N A T U R E    C A L C U L A T I O N    U S I N G    C R Y P T O - J S
const signature = (url, data) => {
  const dataToSign = url + data;
  const token = CryptoJS.enc.Hex.stringify(
    CryptoJS.HmacSHA256(dataToSign.toString(CryptoJS.enc.Utf8), API_SECRET_KEY)
  );
  return token;
};

router.get("/pinkredirect", async (req, res, next) => {
  try {

    console.log("etwetwertw0", req.body,req)

    return res.status(200).send({
      data: req.body,
      result:true
    });

  } catch (error) {
    console.log("ERROR:", error)
    res.status(500).send({
      status: "Fail",
      error: JSON.parse(CircularJSON.stringify(error.response.data.message))
    })
  }
});

// W A L L E T    O R D E R    R E S E R V A T I O N S
router.post("/walletOrderReserve", async (req, res, next) => {
  try {

    console.log("etwetwertw0", req.body)

    const timestamp = new Date().getTime();
    const url = `${productionUrl}/v3/orders/reserve?timestamp=${timestamp}`;
    const headers = {};
    const body = {
      sourceCurrency: req.body.sourceCurrency,
      sourceAmount: req.body.sourceAmount,
      referrerAccountId: ACCOUNT_ID,
      destCurrency: req.body.destCurrency,
      amountIncludeFees: true,
      dest: req.body.dest,
      paymentMethod: req.body.paymentMethod,
      // firstName: req.body.firstName,
      // lastName: req.body.lastName,
      // state: req.body.state,
      // postalCode: req.body.postalCode,
      // city: req.body.city,
      // email: req.body.email,
      // phone: req.body.phone,
      country: req.body.country,
      // street1: req.body.street1,
      redirectUrl: REDIRECT_URL,
      failureRedirectUrl: FAILURE_REDIRECT_URL,
      lockFields: ["redirectUrl", "failureRedirectUrl", "sourceCurrency", "sourceAmount", "referrerAccountId", "dest", "destCurrency", "referrerAccountId"]
    };
    const details = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
    headers["X-Api-Key"] = API_KEY;
    headers["X-Api-Signature"] = signature(url, details);
    const config = {
      method: "POST",
      url: url,
      headers: headers,
      data: details,
    };

    const response = await axios(config);

    console.log("REDIRECT_URL", response.data.url)

    return res.json({
      redirectUrl: response.data.url,
      reservation: response.data.reservation,
      result: true
    })

    // return res.status(200).send({
    //   redirectUrl:response.data.url,
    //   reservation:response.data.reservation,
    //   result:true
    // });

  } catch (error) {
    console.log("ERROR:", error)
    res.status(500).send({
      status: "Fail",
      error: JSON.parse(CircularJSON.stringify(error.response.data.message))
    })
  }
});

// R E T R E I V E    R E S E R V A T I O N    I N F O
router.post("/reservationInfo", async (req, res, next) => {
  try {
    const timestamp = new Date().getTime();
    const id = req.body.id
    const url = `${productionUrl}/v3/orders/reservation/${id}?timestamp=${timestamp}`;
    const headers = {};
    const body = {};
    const details = JSON.stringify(body);

    headers["Content-Type"] = "application/json";
    headers["X-Api-Key"] = API_KEY;
    headers["X-Api-Signature"] = signature(url, details);

    const config = {
      method: "GET",
      url: url,
    };

    const response = await axios(config);
    res.status(200).send({
      status: "Success",
      data: response.data
    });

  } catch (error) {
    console.log("ERROR:", error)
    res.status(500).send({
      status: "Fail",
      error: JSON.parse(CircularJSON.stringify(error.response.data.message))
    })
  }
});

// W A L L E T    O R D E R    C R E A T I O N
router.post("/createWalletDebitOrder", async (req, res, next) => {
  try {
    const timestamp = new Date().getTime();
    const id = req.body.id
    const url = `${productionUrl}/v3/debitcard/process/partner?timestamp=${timestamp}`;
    const headers = {};
    const body = {
      debitCard: {
        number: "5555555555554444",
        year: "2023",
        month: "10",
        cvv: "123"
      },
      reservationId: id,
      amount: "9",
      sourceCurrency: "USD",
      destCurrency: "ETH",
      dest: "ethereum:0xAA9817cb57d531007022deb6B294969e98C58af3",
      referrerAccountId: ACCOUNT_ID,
      givenName: "q242342342",
      familyName: "23542",
      email: "user@send.com",
      phone: "+919847112202",
      referenceId: "your_business_id",
      address: {
        street1: "jsfnheaikfawef",
        city: "zfg",
        state: "2342", // state code
        postalCode: "235234", // only numbers
        country: "IN"// alpha2 country code
      }
    };
    const details = JSON.stringify(body);
    console.log("B", details)
    headers["Content-Type"] = "application/json";
    headers["X-Api-Key"] = API_KEY;
    headers["X-Api-Signature"] = signature(url, details);
    const config = {
      method: "POST",
      url: url,
      headers: headers,
      data: details,
    };

    const response = await axios(config);

    // return res.json({
    //   response: response,
    //   result:true
    // })

    return res.status(200).send({
      response: JSON.parse(CircularJSON.stringify(response.data)),
      result: true
    });

  } catch (error) {
    console.log("ERROR:", error)
    res.status(500).send({
      status: "Fail",
      error: JSON.parse(CircularJSON.stringify(error.response.data.message))
    })
  }
});

// T R A C K    T H E    S T A T U S    O F    O R D E R    B Y    O R D E R I D 
router.post("/orderInfo", async (req, res, next) => {
  try {
    const timestamp = new Date().getTime();
    const id = req.body.id
    const url = `${productionUrl}/v3/orders/${id}?timestamp=${timestamp}`;
    const headers = {};
    const body = {};
    const details = JSON.stringify(body);

    headers["Content-Type"] = "application/json";
    headers["X-Api-Key"] = API_KEY;
    headers["X-Api-Signature"] = signature(url, details);

    const config = {
      method: "GET",
      url: url
    };

    const response = await axios(config);
    res.status(200).send({
      status: "Success",
      data: response.data
    });

  } catch (error) {
    console.log("ERROR:", error)
    res.status(500).send({
      status: "Fail",
      error: JSON.parse(CircularJSON.stringify(error.response.data.message))
    })
  }
});

// T R A C K    T H E    S T A T U S    O F   W A L L E T    O R D E R    B Y   T R A N S F E R    ID  
router.post("/walletOrderInfo", async (req, res, next) => {
  try {
    const timestamp = new Date().getTime();
    const id = req.body.id
    const url = `${productionUrl}/v2/transfer/${id}/track?timestamp=${timestamp}`;
    const headers = {};
    const body = {};
    const details = JSON.stringify(body);

    headers["Content-Type"] = "application/json";
    headers["X-Api-Key"] = API_KEY;
    headers["X-Api-Signature"] = signature(url, details);

    const config = {
      method: "GET",
      url: url
    };

    const response = await axios(config);
    res.status(200).send({
      status: "Success",
      data: response.data
    });

  } catch (error) {
    console.log("ERROR:", error)
    res.status(500).send({
      status: "Fail",
      error: JSON.parse(CircularJSON.stringify(error.response.data.message))
    })
  }
});

// S U B S C R I B E    T O    W E B H O O K S
router.post("/subscribe", async (req, res, next) => {
  try {
    const timestamp = new Date().getTime();
    const url = `${productionUrl}/v3/subscriptions?timestamp=${timestamp}`;
    const headers = {};
    const body = {
      // subscribeTo:'account:AC_LY9WAZ6ZUN4',
      subscribeTo: `account:${ACCOUNT_ID}`,
      notifyTarget: 'http://161.97.164.227:61609/subscribeInfo',//'http://stsblockchain.cf:61609/subscribeInfo',
      referenceId: '111'
    };
    const details = JSON.stringify(body);
    console.log("B", details)
    headers["Content-Type"] = "application/json";
    headers["X-Api-Key"] = API_KEY;
    headers["X-Api-Signature"] = signature(url, details);
    const config = {
      method: "POST",
      url: url,
      headers: headers,
      data: details,
    };

    const response = await axios(config);

    // return res.json({
    //   response: response,
    //   result:true
    // })

    return res.status(200).send({
      response: JSON.parse(CircularJSON.stringify(response.data)),
      result: true
    });

  } catch (error) {
    console.log("ERROR:", error)
    res.status(500).send({
      status: "Fail",
      error: JSON.parse(CircularJSON.stringify(error.response.data.message))
    })
  }
});

// G E T    S U B S C R I P T I O N S
router.post("/getSubscriptions", async (req, res, next) => {
  try {
    const timestamp = new Date().getTime();
    const url = `${productionUrl}/v3/subscriptions?offset=0?length=20?timestamp=${timestamp}`;
    const headers = {};
    const body = {};
    const details = JSON.stringify(body);

    headers["Content-Type"] = "application/json";
    headers["X-Api-Key"] = API_KEY;
    headers["X-Api-Signature"] = signature(url, details);

    const config = {
      method: "GET",
      url: url
    };

    const response = await axios(config);
    res.status(200).send({
      status: "Success",
      data: JSON.parse(CircularJSON.stringify(response.data))
    });

  } catch (error) {
    console.log("ERROR:", error)
    res.status(500).send({
      status: "Fail",
      error: JSON.parse(CircularJSON.stringify(error.response.data.message))
    })
  }
});

router.post("/subscribeInfo", async (req, res, next) => {
  try {

    await orderModel.updateOne({ reservation: req.body.reservation }, {
      $set: {
        orderId: req.body.orderId,
        orderStatus: req.body.orderStatus,
        transferId: req.body.transferId,
        failedReason: req.body.failedReason,
        error: req.body.error
      }
    },
      {
        upsert: true
      })

    console.log("----------------------------PAYLOADS : \n", req.body)

    res.send({
      result: "PAYLOAD RECEIVED"
    })

  } catch (error) {
    res.status(500).send({
      status: "Fail",
      error: error
    })
  }
});

// G E T    U S E R    A U T H O R I Z E
router.post("/authenticateUser", async (req, res, next) => {
  try {
    const timestamp = new Date().getTime();
    const id = req.body.id
    const url = `${productionUrl}/v3/debitcard/authorization/${id}?timestamp=${timestamp}`;
    const headers = {};
    const body = {};
    const details = JSON.stringify(body);

    headers["Content-Type"] = "application/json";
    headers["X-Api-Key"] = API_KEY;
    headers["X-Api-Signature"] = signature(url, details);

    const config = {
      method: "GET",
      url: url
    };

    const response = await axios(config);
    res.status(200).send({
      status: "Success",
      data: response.data
    });

  } catch (error) {
    res.status(500).send({
      status: "Fail",
      error: JSON.parse(CircularJSON.stringify(error.response.data.message))
    })
  }
});

// C R E A T E    U S E R    A U T H E N T I C A T E
router.post("/authorizeUser", async (req, res, next) => {
  try {
    const timestamp = new Date().getTime();
    const { orderId, reservationId, sms, card } = req.body
    const url = `${productionUrl}/v3/debitcard/authorize/partner?timestamp=${timestamp}`;
    const headers = {};
    const body = {
      type: "ALL",
      walletOrderId: orderId,
      reservation: reservationId,
      sms: sms,
      card2fa: card
    };
    const details = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
    headers["X-Api-Key"] = API_KEY;
    headers["X-Api-Signature"] = signature(url, details);
    const config = {
      method: "POST",
      url: url,
      headers: headers,
      data: details,
    };

    const response = await axios(config);

    return res.status(200).send({
      response: JSON.parse(CircularJSON.stringify(response.data)),
      result: true
    });

  } catch (error) {
    console.log("ERROR:", error)
    res.status(500).send({
      status: "Fail",
      error: JSON.parse(CircularJSON.stringify(error.response.data.message))
    })
  }
});

// A P P L E    P A Y    O R D E R    I N T E G R A T I O N

// W A L L E T    O R D E R    C R E A T I O N     U S I N G    A P P L E P A Y
router.post("/createWalletOrders", async (req, res, next) => {
  try {
    const timestamp = new Date().getTime();
    const id = req.body.id
    const url = `${productionUrl}/v3/apple-pay/process/partner?timestamp=${timestamp}`;
    const headers = {};
    const body = {
      partnerId: ACCOUNT_ID,
      payload: {
        "paymentObject": {
          "billingContact": { //<-- this must be a valid US billing address
            "addressLines": [
              "street address"
            ],
            "administrativeArea": "IL",
            "country": "United States",
            "countryCode": "US",
            "familyName": "LastName",
            "givenName": "Your 1st name",
            "locality": "San Francisco",
            "postalCode": "94103", //<- must be 5 digits, values like 94103-9123 are not accepted.
            "subAdministrativeArea": "",
            "subLocality": ""
          },
          "shippingContact": {
            "addressLines": [
              "street address 1"
            ],
            "administrativeArea": "CA",
            "country": "United States",
            "countryCode": "US",
            "emailAddress": "user@sendwyre.com",
            "familyName": "name",
            "givenName": "last name",
            "locality": "San Francisco",
            "phoneNumber": "+14100000000",
            "postalCode": "60606",
            "subAdministrativeArea": "",
            "subLocality": ""
          },
          "token": {
            "paymentData": {
              "version": "",
              "data": "",
              "signature": "",
              "header": {
                "ephemeralPublicKey": "",
                "publicKeyHash": "",
                "transactionId": ""
              }
            },
            "paymentMethod": {
              "displayName": "Visa 1234",
              "network": "Visa",
              "type": "debit"
            },
            "transactionIdentifier": ""
          }
        },
        "orderRequest": {
          "amount": 1.84,
          "destCurrency": "ETH",
          "sourceCurrency": "USD",
          "reservationId": id,
          "dest": "ethereum:0x9E01E0E60dF079136a7a1d4ed97d709D5Fe3e341",
          "referenceId": "your_reference_id_goes_here_as_a_String", //<- this is completely optional 
          "referrerAccountId": ACCOUNT_ID //<-  this is a placeholder, remove the {} and keep only your account id.
        }
      }
    }
    const details = JSON.stringify(body);
    console.log("B", details)
    headers["Content-Type"] = "application/json";
    headers["X-Api-Key"] = API_KEY;
    headers["X-Api-Signature"] = signature(url, details);
    const config = {
      method: "POST",
      url: url,
      headers: headers,
      data: details,
    };

    const response = await axios(config);

    // return res.json({
    //   response: response,
    //   result:true
    // })

    return res.status(200).send({
      response: JSON.parse(CircularJSON.stringify(response.data)),
      result: true
    });

  } catch (error) {
    console.log("ERROR:", error)
    res.status(500).send({
      status: "Fail",
      error: JSON.parse(CircularJSON.stringify(error.response.data.message))
    })
  }
});


router.post("/walletOrderReserves", async (req, res, next) => {
  try {
    const timestamp = new Date().getTime();
    const url = `${productionUrl}/v3/orders/reserve?timestamp=${timestamp}`;
    const headers = {};
    const body = {
      sourceCurrency: "USD",
      sourceAmount: "9",
      referrerAccountId: ACCOUNT_ID,
      destCurrency: "ETH",
      amountIncludeFees: true,
      referenceId: "111",
      dest: "ethereum:0xAA9817cb57d531007022deb6B294969e98C58af3",
      paymentMethod: "debit-card",
      firstName: "q242342342",
      lastName: "23542",
      state: "2342",
      postalCode: "235234",
      city: "zfg",
      email: "user@send.com",
      phone: "+919847112202",
      country: "IN",
      redirectUrl: REDIRECT_URL,
      failureRedirectUrl: FAILURE_REDIRECT_URL,
      street1: "jsfnheaikfawef",
      lockFields: ["redirectUrl", "failureRedirectUrl", "sourceCurrency", "country", "sourceAmount", "email", "phone", "city", "state", "postalCode", "lastName", "firstName", "referrerAccountId", "dest", "destCurrency", "referrerAccountId"]
    };
    const details = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
    headers["X-Api-Key"] = API_KEY;
    headers["X-Api-Signature"] = signature(url, details);
    const config = {
      method: "POST",
      url: url,
      headers: headers,
      data: details,
    };

    const response = await axios(config);

    return res.json({
      redirectUrl: response.data.url,
      reservation: response.data.reservation,
      result: true
    })

    // return res.status(200).send({
    //   redirectUrl:response.data.url,
    //   reservation:response.data.reservation,
    //   result:true
    // });

  } catch (error) {
    console.log("ERROR:", error)
    res.status(500).send({
      status: "Fail",
      error: "error"
    })
  }
});


router.post("/orderDetails", async (req, res, next) => {

  try {
    let result = await requestPromise.post({
      url: 'http://localhost:61609/subscribeInfo',//'http://stsblockchain.cf:61609/subscribeInfo',
      method: "POST",
      json: true
    })

    res.status(200).send({
      status: "Success",
      result: result
    })

  } catch (error) {
    console.log("ERROR:", error)
    res.status(500).send({
      status: "Fail",
      error: error
    })
  }

})

// const body = {
//       sourceAmount: 1, // it means 10 EUR, or destAmount: 0.002, which means in ETH
//       amountIncludeFees: true,
//       sourceCurrency: "USD",
//       destCurrency: "BTC",
//       referrerAccountId: ACCOUNT_ID,
//       email: "user@send.com",
//       dest: "ethereum:0x9E01E0E60dF079136a7a1d4ed97d709D5Fe3e341",
//       firstName: "",
//       city: "",
//       phone: "+1111142343211",
//       street1: "sgergt",
//       country: "reerert", // alpoha 2 country code
//       redirectUrl: "rwe",
//       failureRedirectUrl: "werw",
//       paymentMethod: "debit-card,apple-pay",
//       state: "2342", // state code
//       postalCode: "235234",
//       lastName: "23542",
//       lockFields: ["referrerAccountId"],
//     };

router.post("/test1", async (req, res) => {
  try {

    sdk.CreateWallet({ type: 'DEFAULT' })

      .then(res => console.log(res))

      .catch(err => console.error("err", err));
      
    return res.json({
      message: "wire service"
    })
  }
  catch (err) {
    res.send({
      message: err.message
    })
  }
})


module.exports = router;
