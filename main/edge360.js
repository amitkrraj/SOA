const axios = require('axios')
const moment = require('moment')
const fsPromises = require('fs/promises')
const cryptoJS = require('crypto-js')
const https = require('https')
const logger = require('../logger')
const Tesseract = require('tesseract.js')
const fs = require('fs')
const svg2img = require('svg2img')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const { edge360Path } = require('../constant/soaPath')

const getEdge360Soa = async (options) => {
  const { userName } = options
  try {
    const { password, securityAnswer, amc, email, arnNo = userName } = options
    if(!amc)
      throw 'Invalid AMC'
    else if(!email)
      throw 'No email found in Database'
    else if(!password || !userName || !securityAnswer)
      throw 'Credential not found'
    let { folioNo, fromDate, toDate } = options
    folioNo = folioNo.split('/')[0]
    if (!fromDate || !toDate) {
      fromDate = '01-Jan-1990'
      toDate = moment().format('DD-MMM-YYYY')
    } else {
      fromDate = moment(fromDate, 'DD-MM-YYYY').format('DD-MMM-YYYY')
      toDate = moment(toDate, 'DD-MM-YYYY').format('DD-MMM-YYYY')
    }
    const fileName = `${folioNo}_${amc}_${moment(fromDate, 'DD-MMM-YYYY').format('DDMMYY')}_${moment(toDate, 'DD-MMM-YYYY').format('DDMMYY')}.pdf`
    try {
      await fsPromises.readFile(`${edge360Path}/${fileName}`)
      logger.info('File already exists')
      return {
        fileName,
        filePath: edge360Path
      }
    } catch (err) {
    }
    let encryptedData = getDataEncrypted(JSON.stringify({
      flag: 'USER_CHECK',
      userid: userName,
      deviceid: 'Chrome',
      versionid: '110.0.0.0',
      osid: 'unknown',
      clientid: 'desktop',
      applicationid: 'edge360',
      applicationname: 'edge360'
    }))
    const checkUserName = await axios({
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      method: 'POST',
      url: `https://edge360.camsonline.com/api/v1/process`,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        Connection: 'keep-alive',
        'content-type': 'application/json',
        Host: 'edge360.camsonline.com',
        Origin: `https://edge360.camsonline.com`,
        Referer: `https://edge360.camsonline.com/signin`,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) snap Chromium/79.0.3945.79 Chrome/79.0.3945.79 Safari/537.36'
      },
      data: { data: encryptedData }
    })
    const userDetails = JSON.parse(getDataDecrypted(checkUserName.data))
    if (userDetails.status.errorflag == true) {
      const logoutRequestObject = getDataEncrypted(JSON.stringify({
        flag: 'LOG_OUT',
        userid: userName,
        logintype: null,
        deviceid: 'Chrome',
        versionid: '110.0.0.0',
        osid: 'unknown',
        clientid: 'desktop',
        applicationid: 'edge360',
        applicationname: 'edge360'
      }))
      let logoutResponse = await axios({
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        method: 'POST',
        url: `https://edge360.camsonline.com/api/v1/process`,
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
          Connection: 'keep-alive',
          'content-type': 'application/json',
          Host: 'edge360.camsonline.com',
          Origin: `https://edge360.camsonline.com`,
          Referer: `https://edge360.camsonline.com/signin`,
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) snap Chromium/79.0.3945.79 Chrome/79.0.3945.79 Safari/537.36'
        },
        data: { data: logoutRequestObject }
      })
      logoutResponse = JSON.parse(getDataDecrypted(logoutResponse.data))
      if (logoutResponse.status.errorflag == true)
        throw userDetails.status.errormsg
    }
    const sessionid = Math.floor(1e5 + 9e5 * Math.random()).toString()
    const captchaRequestObject = {
      flag: 'GET_CAPCHA',
      userid: userName,
      sessionid: sessionid,
      deviceid: 'Chrome',
      versionid: '110.0.0.0',
      osid: 'unknown',
      clientid: 'desktop',
      applicationid: 'edge360',
      applicationname: 'edge360'
    }
    encryptedData = getDataEncrypted(JSON.stringify(captchaRequestObject))
    const getCapcha = await axios({
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      method: 'POST',
      url: `https://edge360.camsonline.com/api/v1/process`,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        Connection: 'keep-alive',
        'content-type': 'application/json',
        Host: 'edge360.camsonline.com',
        Origin: `https://edge360.camsonline.com`,
        Referer: `https://edge360.camsonline.com/signin`,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) snap Chromium/79.0.3945.79 Chrome/79.0.3945.79 Safari/537.36'
      },
      data: {
        data: encryptedData
      }
    })
    const { data } = getCapcha.data
    if (!data)
      throw 'Error in getting Captcha, please retry.'

    const filePath = `temp/${folioNo}_${amc}_${Math.floor(Math.random()*10)}.png`
    svg2img(data, function(error, buffer) {
        fs.writeFileSync(filePath, buffer)
    })
    let captchakey = await Tesseract.recognize(filePath,  'eng')
    captchakey = captchakey.data.text.trim().toUpperCase()
    fs.unlink(filePath, (err) => {
      if (err)
        logger.error('Error deleting file:', err)
      else
        logger.info('File deleted successfully')
    })

    encryptedData = getDataEncrypted(JSON.stringify({
      flag: 'USER_LOGIN',
      userid: userName,
      password: password,
      captchakey,
      logintype: 'B',
      sessionid,
      deviceid: 'Chrome',
      versionid: '110.0.0.0',
      osid: 'unknown',
      clientid: 'desktop',
      applicationid: 'edge360',
      applicationname: 'edge360'
    }))
    const login = await axios({
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      method: 'POST',
      url: `https://edge360.camsonline.com/api/v1/process`,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Connection': 'keep-alive',
        'content-type': 'application/json',
        'Host': 'edge360.camsonline.com',
        'Origin': `https://edge360.camsonline.com`,
        'Referer': `https://edge360.camsonline.com/signin`,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) snap Chromium/79.0.3945.79 Chrome/79.0.3945.79 Safari/537.36'
      },
      data: {
        data: encryptedData
      }
    })
    const loginDetails = JSON.parse(getDataDecrypted(login.data))
    if (loginDetails.status.errorflag == true)
      throw loginDetails.status.errormsg

    encryptedData = getDataEncrypted(JSON.stringify({
      flag: 'GET_BROK_DETAILS',
      userid: userName,
      deviceid: 'Chrome',
      versionid: '110.0.0.0',
      osid: 'unknown',
      clientid: 'desktop',
      applicationid: 'edge360',
      applicationname: 'edge360'
    }))
    let getBrokerDetails = await axios({
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      method: 'POST',
      url: `https://edge360.camsonline.com/api/v1/process`,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Connection': 'keep-alive',
        'content-type': 'application/json',
        'Host': 'edge360.camsonline.com',
        'Origin': `https://edge360.camsonline.com`,
        'Referer': `https://edge360.camsonline.com/signin`,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) snap Chromium/79.0.3945.79 Chrome/79.0.3945.79 Safari/537.36'
      },
      data: {
        data: encryptedData
      }
    })
    getBrokerDetails = JSON.parse(getDataDecrypted(getBrokerDetails.data))
    if (getBrokerDetails.status.errorflag == true)
      throw getBrokerDetails.status.errormsg
    encryptedData = getDataEncrypted(JSON.stringify({
      flag: 'USER_ANSWER_VALIDATE',
      userid: userName,
      logintype: 'B',
      questionscode: '1,3',
      answers: `${securityAnswer},${securityAnswer}`,
      sessionid: sessionid,
      deviceid: 'Chrome',
      versionid: '110.0.0.0',
      osid: 'unknown',
      clientid: 'desktop',
      applicationid: 'edge360',
      applicationname: 'edge360'
    }))
    let validateCAMSSecurityAnswer = await axios({
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      method: 'POST',
      url: `https://edge360.camsonline.com/api/v1/process`,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Connection': 'keep-alive',
        'content-type': 'application/json',
        'Host': 'edge360.camsonline.com',
        'Origin': `https://edge360.camsonline.com`,
        'Referer': `https://edge360.camsonline.com/signin`,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) snap Chromium/79.0.3945.79 Chrome/79.0.3945.79 Safari/537.36'
      },
      data: { data: encryptedData }
    })
    validateCAMSSecurityAnswer = JSON.parse(getDataDecrypted(validateCAMSSecurityAnswer.data))
    if (validateCAMSSecurityAnswer.status.errorflag == true)
      throw validateCAMSSecurityAnswer.status.errormsg

    const { detail } = validateCAMSSecurityAnswer
    const { SESSION_ID } = detail[0]
    encryptedData = getDataEncrypted(JSON.stringify({
      flag: 'SOA_PDF_DOWNLOAD',
      fromdt: fromDate,
      todt: toDate,
      email: email,
      foliono: folioNo,
      userid: userName,
      amccode: amc,
      sessionid: SESSION_ID,
      logintype: 'B',
      brokercode: arnNo,
      remarks: 'Download',
      pan: '',
      deviceid: 'Chrome',
      versionid: '110.0.0.0',
      osid: 'unknown',
      clientid: 'desktop',
      applicationid: 'edge360',
      applicationname: 'edge360'
    }))
    let getSOABase64 = await axios({
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      method: 'POST',
      url: `https://edge360.camsonline.com/api/v1/clientonboarding`,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Connection': 'keep-alive',
        'content-type': 'application/json',
        'Host': 'edge360.camsonline.com',
        'Origin': `https://edge360.camsonline.com`,
        'Referer': `https://edge360.camsonline.com/clientonboarding`,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) snap Chromium/79.0.3945.79 Chrome/79.0.3945.79 Safari/537.36'
      },
      data: {
        data: encryptedData
      }
    })
    getSOABase64 = JSON.parse(getDataDecrypted(getSOABase64.data))
    let soaResponseData = await getCams360Base64String({ getSOABase64, userName, arnNo, SESSION_ID, folioNo })
    for(let time = 0; time <= 4; time++) {
      if(soaResponseData && soaResponseData.errorflag == false) break
      soaResponseData = await getCams360Base64String({ getSOABase64, userName, arnNo, SESSION_ID, folioNo })
    }
    if(!soaResponseData || soaResponseData.errorflag == true)
      throw 'Please check the downloads section in your edge360 account'
    const { base64String } =  soaResponseData
    if(!base64String || base64String == 'NODATA')
      throw 'Unable to get PDF, please retry' 

    await fsPromises.writeFile(`${edge360Path}/${fileName}`, base64String, { encoding:'base64' })
    return {
      fileName,
      filePath: edge360Path
    }
  } catch (error) {
    throw error
  } finally {
    const encryptedData = getDataEncrypted(JSON.stringify({
      flag: 'LOG_OUT',
      userid: userName,
      logintype: 'B',
      deviceid: 'Chrome',
      versionid: '110.0.0.0',
      osid: 'unknown',
      clientid: 'desktop',
      applicationid: 'edge360',
      applicationname: 'edge360'
    }))
    await axios({
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      method: 'POST',
      url: `https://edge360.camsonline.com/api/v1/process`,
      functionName: 'thirdPartyGetEdge360SOA',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Connection': 'keep-alive',
        'content-type': 'application/json',
        'Host': 'edge360.camsonline.com',
        'Origin': `https://edge360.camsonline.com`,
        'Referer': `https://edge360.camsonline.com/signin`,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) snap Chromium/79.0.3945.79 Chrome/79.0.3945.79 Safari/537.36'
      },
      data: {
        data: encryptedData
      }
    })
  }
}

const getCams360Base64String = async ({ getSOABase64, userName, arnNo, SESSION_ID, folioNo }) => {
  try {
    if (getSOABase64.status.errorflag == true) {
      let encryptedData = getDataEncrypted(JSON.stringify({
        flag: 'SOA_REPORTS',
        userid: userName,
        brokercode: arnNo,
        logintype: 'B',
        remarks: 'SOA',
        sessionid: SESSION_ID,
        deviceid: 'Chrome',
        versionid: '110.0.0.0',
        osid: 'unknown',
        clientid: 'desktop',
        applicationid: 'edge360',
        applicationname: 'edge360'
      }))
      await sleep(3000)
      const soaReportsResponse = await axios({
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        method: 'POST',
        url: `https://edge360.camsonline.com/api/v1/clientonboarding`,
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
          Connection: 'keep-alive',
          'content-type': 'application/json',
          Host: 'edge360.camsonline.com',
          Origin: `https://edge360.camsonline.com`,
          Referer: `https://edge360.camsonline.com/signin`,
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) snap Chromium/79.0.3945.79 Chrome/79.0.3945.79 Safari/537.36'
        },
        data: {
          data: encryptedData
        }
      })
      const soaReportsResponseData = JSON.parse(getDataDecrypted(soaReportsResponse.data))

      if (soaReportsResponseData.status.errorflag == true || !soaReportsResponseData.detail.length)
        return {
          errorflag: true,
          message: 'Please check the downloads section in your edge360 account'
        }
      const requiredReport = soaReportsResponseData.detail.find(
        report =>
          folioNo.includes(report.FOLIO_NO) &&
          moment(report.ENTRY_DATE, 'DD-MMM-YYYY hh:mm:ss').isSame(
            moment(),
            'day'
          )
      )
      if (
        !requiredReport ||
        requiredReport.status == 'Queued' ||
        !requiredReport.ORG_REF_NO
      )
        return {
          errorflag: true,
          message: 'Please check the downloads section in your edge360 account'
        }
      const referenceNo = requiredReport.ORG_REF_NO
      encryptedData = getDataEncrypted(JSON.stringify({
        flag: 'SOA_DOWNLOAD_REPORTS',
        userid: userName,
        brokercode: arnNo,
        logintype: 'B',
        remarks: 'SOA',
        sessionid: SESSION_ID,
        deviceid: 'Chrome',
        versionid: '110.0.0.0',
        osid: 'unknown',
        clientid: 'desktop',
        applicationid: 'edge360',
        applicationname: 'edge360',
        groupid: referenceNo
      }))
      const soaDownloadResponse = await axios({
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        method: 'POST',
        url: `https://edge360.camsonline.com/api/v1/clientonboarding`,
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
          Connection: 'keep-alive',
          'content-type': 'application/json',
          Host: 'edge360.camsonline.com',
          Origin: `https://edge360.camsonline.com`,
          Referer: `https://edge360.camsonline.com/signin`,
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) snap Chromium/79.0.3945.79 Chrome/79.0.3945.79 Safari/537.36'
        },
        data: {
          data: encryptedData
        }
      })
      const soaDownloadResponseData = JSON.parse(
        getDataDecrypted(soaDownloadResponse.data)
      )
      if (
        soaDownloadResponseData.status.errorflag == true ||
        !soaDownloadResponseData.detail[0].REP_SUMMARY
      )
        return {
          errorflag: true,
          message: 'Please check the downloads section in your edge360 account'
        }

      return {
        errorflag: false,
        base64String: soaDownloadResponseData.detail[0].REP_SUMMARY
      }
    }
    if (
      getSOABase64.details.SoAClass_AMC.errorstatus ==
      'No transaction for the choosen input'
    )
      throw getSOABase64.details.SoAClass_AMC.errorstatus
    if (!getSOABase64.details.SoAClass_AMC.SOA_CONTENT)
      throw 'Unable to get PDF, please retry'

    return {
      errorflag: false,
      base64String: getSOABase64.details.SoAClass_AMC.SOA_CONTENT
    }
  } catch (error) {
    const errorMessage = error.message || error
    logger.error(errorMessage)
    throw errorMessage
  }
}

const getDataEncrypted = pass => {
  const encryptionSalt = _parse(unescape(encodeURIComponent('db0acbf6e3ed32e2a7529d4a42178551')))
  let data = cryptoJS.AES.encrypt(
    _parse(unescape(encodeURIComponent(pass))),
    encryptionSalt,
    {
      keySize: 16,
      iv: _parse(unescape(encodeURIComponent('globalaesvectors'))),
      mode: cryptoJS.mode.CBC,
      padding: cryptoJS.pad.Pkcs7
    }
  )
  return (data = (data = data.ciphertext.toString(cryptoJS.enc.Base64))
    .split('+')
    .join('-'))
    .split('/')
    .join('_')
}

const _init = (n,e) => {
  const bytePass = {}
  n = bytePass.words = n || []
  bytePass.sigBytes = void 0 !=e ? e :4 * n.length
  return bytePass
}

const getDataDecrypted = pass => {
  const decryptionSalt = _parse(unescape(encodeURIComponent('62cab3d14f8633053345ed2fad337813')))
  pass = pass.split('-').join('+')
  pass = pass.split('_').join('/')
  const data = cryptoJS.AES.decrypt(pass, decryptionSalt, {
    mode: cryptoJS.mode.CBC,
    iv: _parse(unescape(encodeURIComponent('globalaesvectors'))),
    keySize: 16,
    padding: cryptoJS.pad.Pkcs7
  })
  return data.toString(cryptoJS.enc.Utf8)
}

const _parse = function (n) {
  for (var e = n.length, l = [], t = 0; t < e; t++)
    l[t >>> 2] |= (255 & n.charCodeAt(t)) << (24 - (t % 4) * 8)
  return _init(l, e)
}

module.exports = {
  getEdge360Soa
}