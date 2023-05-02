const request = require('request')
const requestPromise = require('request-promise')

module.exports = {
    post: async (method, params) => {
        request({
            method: 'POST',
            uri: 'http://pinksurfUser:99U1oqpjDmuHEU9F@173.249.60.59:3696',
            headers: {
                'content-type': 'text/plain'
            },
            body: JSON.stringify({
                method: method,
                params: params,
                // method: "omni_sendissuancefixed",
                // params:["mnUvDVzQjPFiNkEg14jWf2GHZFQQwEQfsE",2,1,0,"","","testToken_omniT","","","100000"],
                // method: "omni_createpayload_simplesend",
                // params: [1, "100"],
                //method: "omni_createpayload_issuancefixed",
                //params:[1,1,0,"","","testToken1","","","10000"],
                // method:"omni_sendrawtx",
                // params:["mnUvDVzQjPFiNkEg14jWf2GHZFQQwEQfsE","01000000013c4041d880e48558d6af504f4abf48e517d3a46e9c1385fca823117566a33c82000000006b483045022100cd607f60c0d48bf2ce1e5985d8c315900aed7919b5df098c82065b46e32eb5e50220479c60569cef6cf313ad48a2839e84463f5debee0da9f75754a246fc3756a9e5012102cedcccb75fbcf1c1aa235c3e3ac36821cda50c95273d68c1709bdbd141851d48ffffffff01a8fb3477000000001976a9144c66504262d8c819dfd1e779cf07e3c88943783788ac00000000", "","mnUvDVzQjPFiNkEg14jWf2GHZFQQwEQfsE","0.001"],
                id: 'curltest',
                jsonrpc: "1.0",
            }),
        }, function (error, response, body) {
            console.log('response', error)
            if (error != null) {
                console.log('code: ' + response.statusCode)
                console.log(body)
                return body
            } else {
                return {
                    result: "error",
                    error: body
                }
            }
        })
    },

    postAsync: async (method, params) => {
        try {
            let response = await requestPromise({
                method: 'POST',
                uri: 'http://pinksurfUser:99U1oqpjDmuHEU9F@173.249.60.59:3696',
                headers: {
                    'content-type': 'text/plain'
                },
                body: JSON.stringify({
                    method: method,
                    params: params,
                    id: 'curltest',
                    jsonrpc: "1.0",
                }),
            })
            //console.log(JSON.parse(response))
            return JSON.parse(response)
        } catch (err) {
            console.log('method:', method)
            console.log('params:', params)
            console.log(err.message)
            throw {
                error: 'error'
            }
        }

    }
}
