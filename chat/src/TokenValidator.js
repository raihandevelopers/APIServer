const jwt = require('jsonwebtoken')
const cache = require('./cache')

class TokenError extends Error {
    constructor(message, statusCode) {
        super()
        this.message = message
        this.statusCode = statusCode
    }
}

class TokenValidator {
    constructor(password, options = {
        expiresIn: "5d"
    }) {
        this.jwtPassword = password
        this.options = options
    }

    sign(data) {
        return jwt.sign(data, this.jwtPassword, this.options)
    }

    validate(req) {
        if (req.headers.authorization) {
            let token = req.headers.authorization
            if (token.slice(0, 6) == ("Bearer" || "bearer")) {
                token = token.slice(7)
            }

            let tokenStatus = this._verify(token)
            if (tokenStatus.status == 'valid') {
                let data


                data = cache.getAlive(cache.collectionName.session, tokenStatus.message.email)
                if (data == null) {
                    throw new TokenError("token_not_found", 401)
                }


                if (data.sessionId != token) {
                    throw new TokenError('logout', 401)
                }

                delete data['pin']
                delete data['password']

                return data
            }

        } else {
            throw new TokenError('invalid_token', 401)
        }
    }

    _verify(token) {
        try {
            let decoded = jwt.verify(token, this.jwtPassword, this.options)
            return {
                status: 'valid',
                message: decoded
            }
        } catch (error) {
            return {
                status: 'expired',
                message: ''
            }
        }
    }
}

module.exports = TokenValidator