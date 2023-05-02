module.exports = {

    server: {
        port: '6001'
    },
    db: {
        host: "161.97.164.226",
        port: "27017",
        userName: "pinksurfuser",
        password: "pdfznWxPMW",
        dbName: "pinkSurf"
    },

    kycImgPath : 'http://167.86.86.243:8087',

    txnImgPath : ' http://167.86.86.243:8083',

    admin: {
        address: '0xb3e0D381194D4DB3fC6d0A421B6FD4986A921071',
        fee: 2.89
    },

    marketData: {
        apiUrl: "https://pro-api.coinmarketcap.com//v1/cryptocurrency/quotes/latest",
        apiKey : '7ce4d6fc-b187-4418-9137-118a4d74bc79',
        apiKey_1: '06ea6ff2-933c-4938-80be-04e5100a022a',//bcdc9318-890b-4fd6-b721-f4f175f03e51
        apiKey_2: 'dc06c5b3-df57-4262-9213-4d5431e76b6c',
        apiKey_3: '5349d76d-e3c4-4774-b825-ad1d685f5913',
        apiKey_old: '51bf0436-ec60-43b3-ac34-26abbedfe86a',
        symbols: 'ETH,BTC,USDT,XAUT,PAXG,POWR',
        currency: 'USD'
    },

    services: {
        emailService: 'http://localhost:61601', // 'http://emailservice:50001',//'http://localhost:50001'
        adminService: 'http://localhost:61602', //'http://adminapi:50002'
        xrpService: 'https://localhost:60004',
        btcService: 'http://localhost:61605',
        //bchService: 'https://localhost:61605',
        trxService: 'https://localhost:60007',
        liquidityService:'https://api./pinksurfing.exchange:60009',
        fileService: 'http://localhost:61607',
        
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

    tokenAuth: {
        password: "password"
    },

    supportedCryptos: [
        "btc",
        "eth",
        "usdt",
        "xaut",
        "paxg",
        "powr"
    ],


    txnPath: `${__dirname}/txns`,


    topUpAddress: {
        btc: "2MunGKbeWBahXTiHdKH6KZp65uzJXnApevB",
        eth: "0xb3e0D381194D4DB3fC6d0A421B6FD4986A921071",
        usdt: "0xb3e0D381194D4DB3fC6d0A421B6FD4986A921071",
        paxg: "0xb3e0D381194D4DB3fC6d0A421B6FD4986A921071",
        xaut: "0xb3e0D381194D4DB3fC6d0A421B6FD4986A921071",
        powr: "0xb3e0D381194D4DB3fC6d0A421B6FD4986A921071"
    }
}
