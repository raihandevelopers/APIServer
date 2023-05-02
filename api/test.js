//const db = require('./lib/db')
const cache = require('./lib/cache')

testCache()

function testCache() {
    cache.create('test', 'test', {
        data: 'abc'
    })
    console.log("step1", cache.getAlive('test', 'test'))
    cache.update('test', 'test', {
        data: 'cde'
    })
    console.log("step2", cache.getAlive('test', 'test'))
    cache.update('test', 'test', {
        data: 'fgh'
    })
    console.log("step3", cache.getAlive('test', 'test'))
    cache.create('test2', 'test2', {
        data: 'abc'
    })

}

// db.eventEmitter.on('connected', testRead)
/* setTimeout(testRead,10000)
async function testRead(){
    console.log(await db.readFromDBAsync({email: 'seshanth@shamlatech.com'}, "accounts"))
} */