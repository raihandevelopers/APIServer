module.exports = {

    services: {
        emailService: 'http://localhost:61601',//'http://emailservice:50001',//'http://localhost:50001'
        adminService: 'http://localhost:61602',
        trxService: 'http://localhost:60007',
        xrpService: 'http://localhost:60004',
        userService: 'http://localhost::3535',
        fileService: 'https://localhost:61607',
    },

    admin: {
        address: '0xb3e0D381194D4DB3fC6d0A421B6FD4986A921071'
    },

    marketData: {
        apiUrl: "https://pro-api.coinmarketcap.com//v1/cryptocurrency/quotes/latest",
        apiKey: '7ce4d6fc-b187-4418-9137-118a4d74bc79',
        apiKey_1: '06ea6ff2-933c-4938-80be-04e5100a022a',
        apiKey_2: 'dc06c5b3-df57-4262-9213-4d5431e76b6c',
        apiKey_3: '5349d76d-e3c4-4774-b825-ad1d685f5913',
        apiKey_old: '51bf0436-ec60-43b3-ac34-26abbedfe86a',
        symbols: 'ETH,BTC,USDT,XAUT,PAXG,POWR',
        currency: 'USD'
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
        password: "pdfznWxPMW",
        dbName: 'pinkSurf'
    },

    receiveCron: {
        initialBlock: '0', //'12477532',//'12508370',//'12478585' //'12478588' 
    },

    tokenAuth: {
        password: "password"
    },

    wallet: {
        mnemonics: "rival sunny must ghost average slot vintage helmet day electric prevent season",
        password: "shamla@123",
        network: "testnet",//"livenet", //"testnet",
        gasLimit: "0x7a1200", //mainnet,mainnet
        provider: "https://data-seed-prebsc-1-s1.binance.org:8545/",//"https://mainnet.infura.io/v3/58847649f3134a20b2a7938323a22751", //https://mainnet.infura.io/v3/b00052ef476d4da390f13b1915589908
        web3Key: "58847649f3134a20b2a7938323a22751", //"738e75993d7a4970a72aff4a06e67843", // "58847649f3134a20b2a7938323a22751", //"573eb304ecd74eac9342092d23f2929a",//"ba243d46f1ef45faa2d14c366763075a", //"738e75993d7a4970a72aff4a06e67843",
        web3Key1: "58847649f3134a20b2a7938323a22751",
        web3Keys: {
            key1:  'c373d2abb84545aa8462e4434e25239c', //'ad9f46e7836a476bb15bd8b3d9b7db9f',
            key2: 'e7e726c2c4d3458eac6097edb72d8df8',//'7fdb47199528414cb76a544fc69beab0',
            key3: 'aeb701244a60473da7a699e1518fcef3',//'2ba05e7c38c845daa082679b114babc3',
            key4: '42178dd5bb5d4dc0bacc1fe00bcd086a',//'155721cae0c44e6f83ef7b811f304dfd',
            backups: {
                key1: 'a78f64dfcfe24e6bbf3a2a319dae40e5',
                key2: '8089e31add064b00aafa9e505e235236',
                key3: 'd9435bd487e94b8d83908a9b86382181',
                key4: 'cabad172833c4b4b84cd4f823d0fc0ec',
                key5: 'f3bea884e26e4456a0a1b38ce7885097',
                key6: 'd1a905c1b7464720bd65ff78968601fe'
            }
        },
        ref: "33333",
        adminAddress: "0xa96080bee895418a1d3E2888c01e4CF7964B7944",//'0x51690ccf11BD80054EC11C9661577fEd6751c6fc',
        contracts: [
            {
                name: 'Tether',
                symbol: 'usdt',
                address: "0x4a6f50f91337755a973eCF95C2E2dFa3e5EeB0e7",//'0xdAC17F958D2ee523a2206206994597C13D831ec7',//'0x4811F27Ffbb2f7C9DBCe84002F26f8100Ce3C321',
                adminAddress: "0xa96080bee895418a1d3E2888c01e4CF7964B7944",//'0x51690ccf11BD80054EC11C9661577fEd6751c6fc',
                decimal: 6,
                network: 'testnet'
            },
            {
                name: 'MyBiz coin',
                symbol: 'mybiz',
                address: "0x4bed167F4F7d7251b922739D24eC06F029aCCB89",//'0xeaB23AFf03fcC5b98B1EaC4eb7651c86af88A538',
                adminAddress: "0xa96080bee895418a1d3E2888c01e4CF7964B7944",//'0x51690ccf11BD80054EC11C9661577fEd6751c6fc',
                decimal: 2,
                network: 'testnet'
            },
        ],
        btc: {
            node: 'https://insight.bitpay.com/api',
            testnetNode: 'http://api.blockcypher.com/v1/btc/test3',
            network: 'livenet', //livenet
            adminAddress: '2MunGKbeWBahXTiHdKH6KZp65uzJXnApevB',
            privKey: ''
        },
        eth: {
            node: 'https://insight.bitpay.com/api',
            testnetNode: 'http://api.blockcypher.com/v1/btc/test3',
            adminAddress: '0x3C85Cb582D595105fffFb5Da158Ab41C8158040c',
            network: 'livenet', //livenet
        },
        usdt: {
            node: 'https://insight.bitpay.com/api',
            testnetNode: 'http://api.blockcypher.com/v1/btc/test3',
            adminAddress: '0x3C85Cb582D595105fffFb5Da158Ab41C8158040c',
            network: 'livenet', //livenet
        },
        mybiz: {
            node: 'https://insight.bitpay.com/api',
            testnetNode: 'http://api.blockcypher.com/v1/btc/test3',
            adminAddress: '0xeaB23AFf03fcC5b98B1EaC4eb7651c86af88A538',
            network: 'livenet', //livenet
        },
    },


    kycPath: `${__dirname}/kyc`,
    supportedCryptos: [
        "btc",
        "bch",
        'eth',
        'usdt',
        'pax',
        'trx',
        'xrp'
    ],
    supportedFiat: [
        'usd',
        'eur'
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
    seed: 'sncHdE26MUUA7DQ6wtEzxvWpbKZ9M',
    rippleProvider: 'wss://s.altnet.rippletest.net:51233', //'wss://s.altnet.rippletest.net' 
    depositAddress: 'rsJ3hMM34fFbe5PqNJrgu5gB1riDmRubbz',
}
