
class CustomError extends Error {
    constructor(message, statusCode, error) {
        super()
        this.message = message
        this.statusCode = statusCode
        this.errors = error

        if(Array.isArray(this.errors)) {
            this.errors.forEach(_err => {
                if(_err.param == 'authorization') {
                    this.message = _err.msg
                }
            })
        }
    }
}

module.exports = CustomError