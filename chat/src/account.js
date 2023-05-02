const accountsModel = require('../models/accounts')

class Account {
    constructor(param) {
        this.email = param.email
        this.id = param._id
    }

    async getAccount() {
        try {
            if (this.email != undefined) {
                let account = await this._getAccountByEmail()
                return account;
            } else if(this.id != undefined) {
                let account = await this._getAccountById()
                return account;
            }
        } catch (error) {
            throw error.message
        }
    }

    async _getAccountByEmail() {
        try {
            let account = await accountsModel.findOne({
                email: this.email
            }).lean().exec()
            return account
        } catch (error) {
            throw error.message
        }
    }

    async _getAccountById() {
        try {
            let account = await accountsModel.findOne({
                _id: this.id
            }).lean().exec()
            return account
        } catch (error) {
            throw error.message
        }
    }
}

module.exports = Account