const express = require('express')
const router = express.Router()

router.use((req, res, next) => {
    isAdmin(req, res, next)
})

function isAdmin(req, res, next) {
    try {
        if (req.user.isAdmin) {
            next()
        } else {
            res.status(403).send({
                status: 'error',
                message: 'Forbidden',
                error: 'nil'
            })
        }
    } catch (error) {
        res.status(401).send({
            status: 'error',
            message: 'unAuthorized',
            error: 'nil'
        })
    }

}

module.exports = router