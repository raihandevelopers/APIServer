const request = require('request-promise')

const post = async (url, data) => {
    try {
        let response = await request.post(url, {
            method: "POST",
            json: true,
            body: data
        })

        return {
            status: 'success',
            message: response
        }
    } catch (error) {
        console.log(error.message)
        throw {
            status: 'fail',
            message: error.message
        }
    }
}

const get = async (url, headers = '') => {
    try {
        let response = await request.get(url, {
            method: "GET",
            headers: headers
        })
        return {
            status: 'success',
            message: response
        }
    } catch (error) {
        console.log(error.message)
        return {
            status: 'fail',
            message: error.message
        }
    }
}

module.exports = {
    post,
    get
}