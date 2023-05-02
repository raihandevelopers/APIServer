let Client = require('mongodb').MongoClient;
let config = require('../config')
let mongoUrl = 'mongodb://' + config.db.userName + ':' + config.db.password + '@' + config.db.host + ':' + config.db.port  + '/pinkSurf' //+ '&retryWrites=true'
let dbName = 'pinkSurf'
const events = require('events')
const eventEmitter = new events.EventEmitter()

let mongo;

init()
async function init() {
    const mongoOptions = {
	poolSize: 10,
	autoReconnect: true,
	reconnectTries: 50,
	reconnectInterval: 2000,
        db: {
            numberOfRetries: 5,
            retryMiliSeconds: 5000.
        },
        server: {
            auto_reconnect: true
        }
    }
    mongo = await Client.connect(mongoUrl, mongoOptions)
    /* let collections = await mongo.collection('accounts')
    collections.insertOne({"test":"test"}) */
    console.log('///////////////////////// connected ///////////////////////')
    eventEmitter.emit('connected')
}

const readFromDBAsync = async (query, collectionName) => {
    try {
        const db = await mongo.db(dbName)
        if (db != undefined) {
            const collection = await db.collection(collectionName)
            let result = await collection.findOne(query)

            return {
                error: 'nil',
                message: result,
                status: 'success'
            }

        } else throw {
            error: 'error',
            message: 'error',
            status: 'fail'
        }
    } catch (err) {
        console.log(err.message)
        throw {
            error: err,
            message: 'internal_server_error',
            status: 'fail'
        }
    }
}

const readManyAsync = async (query, collectionName) => {
    try {
        let db = await mongo.db(dbName)
        if (db != undefined) {
            let collection = await db.collection(collectionName)
            let result = []
            await collection.find(query).forEach(_data => {
                result.push(_data)
            })

            return {
                error: 'nil',
                message: result,
                status: 'success'
            }
        } else throw {
            error: 'error',
            message: 'error',
            status: 'fail'
        }
    } catch (error) {
        console.log(error.message)
        throw {
            error: error,
            message: 'internal_server_error',
            status: 'fail'
        }
    }
}

const insert = async (query, collectionName) => {
    try {
        let db = await mongo.db(dbName)
        if (db != undefined) {
            let collection = await db.collection(collectionName)
            let result = await collection.insertOne(query)
            return {
                error: 'nil',
                message: result,
                status: 'success'
            }
        } else throw {
            error: 'error',
            message: 'error',
            status: 'fail'
        }

    } catch (error) {
        console.log(error.message)
        throw {
            error: error,
            message: 'internal_server_error',
            status: 'fail'
        }
    }
}

const updateOneAsync = async (filter, query, collectionName) => {
    try {
        let db = await mongo.db(dbName)
        if (db != undefined) {
            let collection = await db.collection(collectionName)
            let result = await collection.updateOne(filter, query)
            return {
                error: 'nil',
                message: result,
                status: 'success'
            }
        } else throw {
            error: 'error',
            message: 'error',
            status: 'fail'
        }
    } catch (error) {
        console.log(error.message)
        throw {
            error: "error",
            message: 'internal_server_error',
            status: 'fail'
        }
    }
}

const updateOneUpsertAsync = async (filter, query, collectionName, options = {}) => {
    try {
        let db = await mongo.db(dbName)
        if (db != undefined) {
            let collection = await db.collection(collectionName)
            let result = await collection.updateOne(filter, query, options)
            return {
                error: 'nil',
                message: result,
                status: 'success'
            }
        } else throw {
            error: 'error',
            message: 'error',
            status: 'fail'
        }
    } catch (error) {
        console.log(error.message)
        throw {
            error: "error",
            message: 'internal_server_error',
            status: 'fail'
        }
    }
}

const sortReadAsync = async (query, collectionName) => {
    try {
        let db = await mongo.db(dbName)
        if (db != undefined) {
            let collection = await db.collection(collectionName)
            let result = []
            await collection.find().sort(query).forEach(_data => {
                result.push(_data)
            })
            return {
                error: 'nil',
                message: result,
                status: 'success'
            }
        } else throw {
            error: 'error',
            message: 'error',
            status: 'fail'
        }

    } catch (err) {
        throw {
            error: 'error',
            message: 'internal_server_error',
            status: 'fail'
        }
    }
}

/* 
const insert = async (params, collectionName)=>{
    Client.connect(mongoUrl,(async(err, client)=>{
        if (err){
            console.log(err)
            return {error: err, message:"error_occured", status: 'fail'}
        }
        let db = await client.db("/pinksurfing")
        if(db !== undefined){
            let collection = db.collection(collectionName)
            let keys = Object.keys(params)

            keys.forEach(param=>{
                if(param === undefined){
                    console.log("inside foreach")
                    return {error:'error', message:'undefined_parameter', status: 'fail'}
                }
            })

            collection.insertOne(params,async(err,res)=>{
                console.log(err)
                if(err != null){
                    console.log(err)
                    return {error:'error', message:'undefined_parameter', status: 'fail'}
                }else{
                    return {error:'nil', message:'inserted_successfully', status: 'success'}
                }
            })
        }
    }))
}
 */
/* 
const updateOneAsync = async(filter, query, collectionName)=>{
    try{
        let mongoc = await Client.connect(mongoUrl)

        let db = await mongoc.db("/pinksurfing")
        if(db !== undefined){
            let collection = await db.collection(collectionName)
            let result = await collection.updateOne(filter, query)
            return {error:'nil', message:result, status: 'success'}
        }else throw {error:'error', message:'error', status:'fail'}

    }catch(err){
        throw {error: err, message:'internal_server_error', status:'fail'}
    }
    
} */
/* 
const updateOneUpsertAsync = async(filter, query, collectionName, options)=>{
    try{
        //options = options === undefined ? {} : options

        if(options == undefined){
            options = {}
        }

        let mongoc = await Client.connect(mongoUrl)
     
        let db = await mongoc.db("/pinksurfing")
        if(db !== undefined){
            let collection = await db.collection(collectionName)
            let result = await collection.updateOne(filter, query, options)
            return {error:'nil', message:result, status: 'success'}
        }else throw {error:'error', message:'error', status:'fail'}

    }catch(err){
        throw {error: err, message:'internal_server_error', status:'fail'}
    }
    
}
 */
const updateOne = async (filter, query, collectionName) => {
    Client.connect(mongoUrl, (async (err, client) => {
        if (err) {
            console.log(err)
            throw {
                error: err,
                message: "error_occured",
                status: 'fail'
            }
        }
        let db = await client.db("/pinksurfing")
        if (db !== undefined) {
            let collection = await db.collection(collectionName)
            /*  let keys = Object.keys(query)

             keys.forEach(param=>{
                 if(param === undefined){
                     console.log("inside foreach")
                     throw {error:'error', message:'undefined_parameter', status: 'fail'}
                 }
             }) */

            await collection.updateOne(filter, query)
            console.log("inside updateone", err)
            if (err != null) {
                console.log(err)
                throw {
                    error: 'error',
                    message: 'undefined_parameter',
                    status: 'fail'
                }
            } else {
                return {
                    error: 'nil',
                    message: 'inserted_successfully',
                    status: 'success'
                }
            }

        } else {
            return {
                error: 'nil',
                message: 'inserted_successfully',
                status: 'fail'
            }
        }
    }))
}

const readFromDB = async (query, collectionName) => {
    Client.connect(mongoUrl, (async (err, client) => {
        if (err) {
            console.log(err)
            return new Error({
                error: err,
                message: "error_occured",
                status: 'fail'
            })
        }
        let db = await client.db("/pinksurfing")
        if (db !== undefined) {
            let collection = db.collection(collectionName)
            let result = await collection.findOne(query)
            /* .then(async result =>{
                            console.log(result)
                            return await result
                        }).catch(err =>{
                            return new Error({error: err, message:'undefined_parameter', status:'fail'})
                        }) */
            console.log(result)
            return result
        } else throw {
            error: 'error',
            message: 'error',
            status: 'fail'
        }
    }))

}
/* 
const readFromDBAsync = async(query, collectionName)=>{

        let db = await mongoc.db("/pinksurfing")
        if(db !== undefined){
            let collection = await db.collection(collectionName)
            let result = await collection.findOne(query)
            return {error:'nil', message:result, status: 'success'}
        }else throw {error:'error', message:'error', status:'fail'}

    }catch(err){
        throw {error: err, message:'internal_server_error', status:'fail'}
    }
    
} */
/* 
const readManyAsync = async(query, collectionName)=>{
    try{
        let mongoc = await Client.connect(mongoUrl)

        let db = await mongoc.db("/pinksurfing")
        if(db !== undefined){
            let collection = await db.collection(collectionName)
            let result = []
            await collection.find(query).forEach(_data=>{
                result.push(_data)
            })// toArray()
           
            
            return {error:'nil', message:result, status: 'success'}
        }else throw {error:'error', message:'error', status:'fail'}

    }catch(err){
        throw {error: err, message:'internal_server_error', status:'fail'}
    }
    
}
 */
/* 
const sortReadAsync = async(query, collectionName)=>{
    try{
        let mongoc = await Client.connect(mongoUrl)
    
        let db = await mongoc.db("/pinksurfing")
        if(db !== undefined){
            let collection = await db.collection(collectionName)
            let result = []
            await collection.find().sort(query).forEach(_data=>{
                result.push(_data)
            })// toArray()
           
            
            return {error:'nil', message:result, status: 'success'}
        }else throw {error:'error', message:'error', status:'fail'}

    }catch(err){
        throw {error: err, message:'internal_server_error', status:'fail'}
    }
    
} */

module.exports = {
    //connectToDb,
    //insertToDb,
    //updateOne,
    //readFromDB,
    insert,
    readManyAsync,
    readFromDBAsync,
    updateOneAsync,
    updateOneUpsertAsync,
    sortReadAsync,

    eventEmitter
}
