const express = require('express')
const router = express.Router()
const main = require('../main')

router.get('/getKarvySoa', main.getKarvySoa)
router.get('/getFundsnetCaptcha', main.getFundsnetCaptcha)
router.get('/getFundsnetSoa', main.getFundsnetSoa)
router.get('/getEdge360Soa', main.getEdge360Soa)

module.exports = {
    router
}