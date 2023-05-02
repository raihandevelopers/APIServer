module.exports = {

    server: {
        port: '6002'
    },

    admin: {
        address: '0xb3e0D381194D4DB3fC6d0A421B6FD4986A921071',
        btcaddress: '2N4PBMUjhQTD1d43LZ7BbKXadyxqJXcMtnv',
        fee: 2.89
    },

    services: {
        emailService: 'http://localhost:61601', // 'http://emailservice:50001',//'http://localhost:50001'
        adminService: 'http://localhost:61602', //'http://adminapi:50002'
        xrpService: 'https://localhost:60004',
        btcService: 'http://localhost:6160',
        //bchService: 'https://localhost:61605',
        trxService: 'https://localhost:60007',
        liquidityService:'https://api./pinksurfing.exchange:60009',
        fileService: 'http://localhost:61607',
        wyreService: 'http://localhost:61609'
    },

    email: {
        host: "smtp.gmail.com",
        port: "587",
        user: "seshanth@shamlatech.com",
        password: "heeafxyjluztchtn",
        audience: 'localhost:4000'
    },

    db: {
        host: "161.97.164.226",
        port: "27017",
        userName: "pinksurfuser",
        password: "pdfznWxPMW"
    },

    tokenAuth: {
        password: "password"
    },

    marketData: {
        apiUrl: "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest",
        apiKey : '02885b61-8bb9-4f1d-85f6-b11579058f9c',//5349d76d-e3c4-4774-b825-ad1d685f5913
        apiKey_1: '06ea6ff2-933c-4938-80be-04e5100a022a',// ead0a52d-2840-4e12-9ed4-24a81824c29e
        apiKey_2: 'dc06c5b3-df57-4262-9213-4d5431e76b6c',
        apiKey_3: '5349d76d-e3c4-4774-b825-ad1d685f5913',
        apiKey_old: '51bf0436-ec60-43b3-ac34-26abbedfe86a',//1ae7b7da-d6c0-4276-837a-1ae128fcb5b2
        symbols: 'ETH,BTC,USDT',
        currency: 'USD' //USD'
    },
    wallet: {
        mnemonics: "rival sunny must ghost average slot vintage helmet day electric prevent season",
        password: "shamla@123",
        network: "testnet",//"livenet", //"testnet",
        gasLimit: "0x7a1200",
        provider: "https://data-seed-prebsc-1-s1.binance.org:8545/",//"https://mainnet.infura.io/v3/ba243d46f1ef45faa2d14c366763075a",
        //web3Key: "ba243d46f1ef45faa2d14c366763075a",
        ref:"33333",
        contracts: [
            {
                name: 'Tether',
                symbol: 'usdt',
                address: "0x4a6f50f91337755a973eCF95C2E2dFa3e5EeB0e7",//'0xdAC17F958D2ee523a2206206994597C13D831ec7',
                decimal: 6,
                network: 'testnet'
            },
            {
                name: 'MyBiz coin',
                symbol: 'mybiz',
                address: "0x4bed167F4F7d7251b922739D24eC06F029aCCB89",//'0xeaB23AFf03fcC5b98B1EaC4eb7651c86af88A538',
                decimal: 2,
                network: 'testnet'
            },
        ],
        btc: {
            node: 'https://insight.bitpay.com/api',
            testnetNode: 'http://api.blockcypher.com/v1/btc/test3',
            network: 'testnet', //livenet
            adminAddress: '2MunGKbeWBahXTiHdKH6KZp65uzJXnApevB',
            privKey: ''
        },
        eth: {
            node: 'https://insight.bitpay.com/api',
            testnetNode: 'http://api.blockcypher.com/v1/btc/test3',
            adminAddress: '0x3C85Cb582D595105fffFb5Da158Ab41C8158040c',
            network: 'testnet', //livenet
        },
        usdt: {
            node: 'https://insight.bitpay.com/api',
            testnetNode: 'http://api.blockcypher.com/v1/btc/test3',
            adminAddress: '0x3C85Cb582D595105fffFb5Da158Ab41C8158040c',

            network: 'testnet', //livenet
        },
        mybiz: {
            node: 'https://insight.bitpay.com/api',
            testnetNode: 'http://api.blockcypher.com/v1/btc/test3',
            adminAddress: '0x3C85Cb582D595105fffFb5Da158Ab41C8158040c',
            network: 'testnet', //livenet
        },
    },

    kycPath: `${__dirname}/kyc`,

    txnPath: `${__dirname}/txn`,

    cryptoPath: `${__dirname}/cryptos`,

    cryptoImgPath : 'https://pinksurfing.com',//'http://161.97.164.227:8082', //'http://stsblockchain.cf:8081',

    kycImgPath : 'http://161.97.164.227:8087',

    supportedCryptos: [
        "btc",
        //"bch",
        'eth',
        'usdt', //usdt
        //'pax',
        //'trx', //trx
        //'xrp'
        'mybiz'
    ],
    supportedFiat: [
        'usd',
        'eur'//,
        //'aed'
    ],
    languages: [
        'english',
        'japanese',
        'korean',
        'thai',
        'khmer',
        'vietnamese',
        'simplified chinese',
        'traditional chinese'
    ],

    privacyPolicyUrl: 'https://anxo.io/privacy-policy/',//'https://anxo.io/wp-content/uploads/2019/10/ANXO-Token-Terms.pdf',
    termsAndConditionsUrl: 'https://anxo.io/terms-and-conditions/',//'https://anxo.io/wp-content/uploads/2019/10/ANXO-Token-Terms.pdf',
    faqUrl: "http://shamlatech.net/anxo_faq.html",
    //faqUrl: 'https://anxo.io/wp-content/uploads/2019/10/ANXO-Token-Terms.pdf',
    moonpayKey: ''
}
