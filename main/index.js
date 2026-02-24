const logger = require('../logger')
const { STATUS, MESSAGE, AMC_BOS_CODE } = require('../constant').default
const karvyService = require('./karvy')
const fundsnetService = require('./fundsnet')
const edge360Service = require('./edge360')
const { getKARVY_CAMS_Data_SOA } = require('../database')

// Karvy SOA
const getKarvySoa = async (req, res) => {
  try {
    const { Folio_No, Instrument_Id, fromDate, toDate } = req.query
    if(!Folio_No || typeof Folio_No != 'string') throw 'Invalid Folio_No in request param.'
    if(!Instrument_Id) throw 'Invalid Instrument_Id in request param.'
    const rtaData = await getKARVY_CAMS_Data_SOA({
      Folio_No,
      Instrument_Id,
      rtaType: 1
    })
    if(!rtaData || rtaData[0]) throw 'Folio No is not found in database.'
    const result = await karvyService.getKarvySOA({
      folioNo: Folio_No,
      fund: AMC_BOS_CODE[rtaData[0].amc_bos_code],
      userName: rtaData[0].user_name,
      password: rtaData[0].password,
      fromDate,
      toDate
    })
    sendPdf(res, result)
  }
  catch (error) {
    logger.error(error)
    res.send({
        status: STATUS.FAILED,
        message: error.message || error.stack || error || MESSAGE.FAILED
    })
  }
}

// Fudsnet SOA
const getFundsnetCaptcha = async (req, res) => {
    try {
      const { Folio_No, Instrument_Id, fromDate, toDate } = req.query
      if(!Folio_No || typeof Folio_No != 'string') throw 'Invalid folio no in request param.'
      if(!Instrument_Id) throw 'Invalid Instrument_Id in request param.'
      const rtaData = await getKARVY_CAMS_Data_SOA({
        Folio_No,
        Instrument_Id,
        rtaType: 2
      })
      if(!rtaData || !rtaData[0]) throw 'Folio No is not found in database.'
      const result = await fundsnetService.getFundsnetCaptcha({
        folioNo: Folio_No,
        amc: AMC_BOS_CODE[rtaData[0].bos_code],
        userName: rtaData[0].user_name,
        password: rtaData[0].password,
        securityAnswer: rtaData[0].answer,
        fromDate,
        toDate
      })
      res.send({
          status: STATUS.SUCCESS,
          message: MESSAGE.SUCCESS,
          result
      })
    }
    catch (error) {
      logger.error(error)
      res.send({
          status: STATUS.FAILED,
          message: error.message || error.stack || error || MESSAGE.FAILED
      })
    }
}

const getFundsnetSoa = async (req, res) => {
  try {
    const { captchaText, fundsNetToken } = req.query
    if (!captchaText || !fundsNetToken)
      throw { message: 'CaptchaText/fundsNetToken param is missing' }
    const result = await fundsnetService.getFundsnetSoa({ captchaText, fundsNetToken })
    sendPdf(res, result)
  }
  catch (error) {
    logger.error(error)
    res.send({
        status: STATUS.FAILED,
        message: error.message || error.stack || error || MESSAGE.FAILED
    })
  }
}

// Edge360 SOA
const getEdge360Soa = async (req, res) => {
    try {
      const { Folio_No, Instrument_Id, fromDate, toDate } = req.query
      if(!Folio_No || typeof Folio_No != 'string') throw 'Invalid folio no in request param.'
      if(!Instrument_Id) throw 'Invalid Instrument_Id in request param.'
      const rtaData = await getKARVY_CAMS_Data_SOA({
        Folio_No,
        Instrument_Id,
        rtaType: 2
      })
      if(!rtaData || !rtaData[1]) throw 'Folio No is not found in database.'
      const result = await edge360Service.getEdge360Soa({
        folioNo: Folio_No,
        email: rtaData[1].email_id,
        userName: rtaData[1].user_name,
        password: rtaData[1].password,
        securityAnswer: rtaData[1].answer,
        amc: AMC_BOS_CODE[rtaData[1].bos_code],
        fromDate,
        toDate
      })
      sendPdf(res, result)
    }
    catch (error) {
      logger.error(error)
      res.send({
          status: STATUS.FAILED,
          message: error.message || error.stack || error || MESSAGE.FAILED
      })
    }
}

const sendPdf = (res, result) => {
  const { fileName, filePath } = result
  const downloadPath = `${filePath}/${fileName}`
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Filename', fileName)
  res.setHeader('Content-Disposition', `inline; filename=${fileName}`)
  return res.download(downloadPath)
}

module.exports = {
  getKarvySoa,
  getFundsnetCaptcha,
  getFundsnetSoa,
  getEdge360Soa
}