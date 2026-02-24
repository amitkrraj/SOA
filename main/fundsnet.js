const axios = require('axios')
const moment = require('moment')
const querystring = require('querystring')
const fs = require('fs/promises')
const cryptoJS = require('crypto-js')
const { fundsnetPath } = require('../constant/soaPath')
const { promisify } = require('util')
const { post } = require('request')
const postRequest = promisify(post)
const logger = require('../logger')

const getFundsnetCaptcha = async (options) => {
  try {
    const { userName, password, securityAnswer, folioNo, amc } = options
    if(!amc)
      throw 'Invalid AMC'
    else if(!userName || !password || !securityAnswer)
      throw 'Crendetial not found'
    const getPassPhrase = await postRequest({
        url: `https://fundsnet.camsonline.com/ecrms/index.aspx/GetRandomSalt`,
        json: true,
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
          Connection: 'keep-alive',
          'Content-Length': 0,
          'Content-Type': 'application/json; charset=utf-8',
          Host: 'fundsnet.camsonline.com',
          Origin: 'https://fundsnet.camsonline.com',
          Referer: `https://fundsnet.camsonline.com/eCRMS/index.aspx`,
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) snap Chromium/79.0.3945.79 Chrome/79.0.3945.79 Safari/537.36',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: {
          data: {}
        }
    })
    const passPhrase = getPassPhrase.body.d
    const cypherString = cryptoJS.AES.encrypt(password, passPhrase).toString()
    const form = querystring.stringify({
      __EVENTTARGET: '',
      __EVENTARGUMENT: '',
      __VIEWSTATE: '7ULsQBarO3VFxidZaYdjFtowqa7cMMwkIo6llwhd2CMgLvgmqjHIcToxgLHQmFIwAVr1BesWFvpiMvGSzqt+tw+ZKmAwiuhCawQm1hs/hh+25jZJOfnbm0IbunnYDDuGoiM2lHvYsdRBt6+aoeivTHw7uvlkKh67U/TN6Spz5s/8By7TMMNf9DLu7guK40htQg7aUAfLDh0s4NHgKz0Vjo4XowxJsFjIiqJI2uK4s5Ep26AmE58YOvpSh9GZXKOLJWDAM9nBCKdnVS91WtoUzIHygiq22NUBnWkw0GYbgA5tbrfK7wtryPfoaeKqkoE/5H/k8rEcZpXjWpnXP97DKh5WE6A6dr6SJyyC4+sdtBbP8ytO',
      __VIEWSTATEGENERATOR: '4B4DEAB6',
      __VIEWSTATEENCRYPTED: '',
      UserCode: userName,
      UserPwd: cypherString,
      hdnGUID: '3012201905355735571834352731Chrome6215528443',
      txtCaptcha: 'P3HR8',
      hdnPwd: cypherString,
      hdnPassphrase: passPhrase
    })

    const fnCrmsAuthenticate = await postRequest({
      url: `https://fundsnet.camsonline.com/ecrms/Login/fnCrmsAuthenticate.aspx`,
      json: true,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'max-age=0',
        Connection: 'keep-alive',
        'Content-Length': form.length,
        'Content-Type': 'application/x-www-form-urlencoded',
        Host: 'fundsnet.camsonline.com',
        Origin: `https://fundsnet.camsonline.com`,
        Referer: `https://fundsnet.camsonline.com/ecrms/index.aspx`,
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) snap Chromium/79.0.3945.79 Chrome/79.0.3945.79 Safari/537.36'
      },
      body: form
    })

    if (!fnCrmsAuthenticate.headers || !fnCrmsAuthenticate.headers.location || !fnCrmsAuthenticate.headers.location.includes('/ecrms/Login/fnCrmsSecurityQuestions.aspx'))
      throw { message: 'Invalid login, check credentials' }

    const securityBody = fnCrmsAuthenticate.headers.location
    const getSecurityQuestionPage = await axios({
      method: 'GET',
      url: `https://fundsnet.camsonline.com${securityBody}`,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'max-age=0',
        Connection: 'keep-alive',
        Host: 'fundsnet.camsonline.com',
        Referer: `https://fundsnet.camsonline.com/ecrms/index.aspx`,
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) snap Chromium/79.0.3945.79 Chrome/79.0.3945.79 Safari/537.36'
      }
    })

    let hidAllStr = getSecurityQuestionPage.data
      .split('id="hidAllStr" value="')[1].split('" />')[0]
    let hidSessionId = getSecurityQuestionPage.data
      .split('id="hidSessionId" value="')[1].split('" />')[0]
    const hidpwdexp = getSecurityQuestionPage.data
      .split('id="hidpwdexp" value="')[1].split('" />')[0]
    let __VIEWSTATEGENERATOR = getSecurityQuestionPage.data
      .split('id="__VIEWSTATEGENERATOR" value="')[1].split('" />')[0]
    let __VIEWSTATE = getSecurityQuestionPage.data
      .split('id="__VIEWSTATE" value="')[1].split('" />')[0]

    const securityQuestionForm = querystring.stringify({
        __VIEWSTATE,
        __VIEWSTATEGENERATOR,
        __VIEWSTATEENCRYPTED: '',
        txtQes1: securityAnswer.toUpperCase(),
        txtQes2: securityAnswer.toUpperCase(),
        btnSubmit: 'Submit',
        hidAllStr,
        hidSessionId,
        hidpwdexp,
        hidQid1: 'Q1',
        hidQid2: 'Q1'
    })
    const postSecurityQuestion = await postRequest({
      url: `https://fundsnet.camsonline.com${securityBody}`,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'max-age=0',
        Connection: 'keep-alive',
        'Content-Length': securityQuestionForm.length,
        'Content-Type': 'application/x-www-form-urlencoded',
        Host: 'fundsnet.camsonline.com',
        Origin: `https://fundsnet.camsonline.com`,
        Referer: `https://fundsnet.camsonline.com${securityBody}`,
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) snap Chromium/79.0.3945.79 Chrome/79.0.3945.79 Safari/537.36'
      },
      json: true,
      body: securityQuestionForm
    })
    if (!postSecurityQuestion.headers.location)
      throw { message:'Error in getting header location' }

    const getfnCrmsBlank = await axios({
      method:'GET',
      url: `https://fundsnet.camsonline.com${postSecurityQuestion.headers.location}`,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'max-age=0',
        Connection: 'keep-alive',
        Host: 'fundsnet.camsonline.com',
        Origin: `https://fundsnet.camsonline.com`,
        Referer: `https://fundsnet.camsonline.com${securityBody}`,
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) snap Chromium/79.0.3945.79 Chrome/79.0.3945.79 Safari/537.36'
      }
    })
    if (!getfnCrmsBlank.data.includes('BrokerOnlineSite/BrokerOnline/BOL_InvLocate.aspx'))
      throw { message: 'Error in getting getfnCrmsBlank' }
    const BOLInvLocateToken = getfnCrmsBlank.data
      .split('href="../BrokerOnlineSite/BrokerOnline/BOL_InvLocate.aspx')[1]
      .split('">Direct Access</a></td>')[0]

    const getDirectAccess = await axios({
      method:'GET',
      url: `https://fundsnet.camsonline.com/eCRMS/BrokerOnlineSite/BrokerOnline/BOL_InvLocate.aspx${BOLInvLocateToken}`,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'max-age=0',
        Connection: 'keep-alive',
        Host: 'fundsnet.camsonline.com',
        Origin: `https://fundsnet.camsonline.com`,
        Referer: `https://fundsnet.camsonline.com${postSecurityQuestion.headers.location}`,
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) snap Chromium/79.0.3945.79 Chrome/79.0.3945.79 Safari/537.36'
      }
    })
    const directAccessBody = getDirectAccess.data
    hidAllStr = directAccessBody.split('id="hidAllStr" value="')[1].split('" />')[0]
    hidSessionId = directAccessBody.split('id="hidSessionId" value="')[1].split('" />')[0]
    __VIEWSTATEGENERATOR = directAccessBody.split('id="__VIEWSTATEGENERATOR" value="')[1].split('" />')[0]
    __VIEWSTATE = directAccessBody.split('id="__VIEWSTATE" value="')[1].split('" />')[0]
    const hidAllStr1 = directAccessBody.split('id="hidAllStr1" value="')[1].split('" />')[0]
    const invLocateForm = querystring.stringify({
      __EVENTTARGET: '',
      __EVENTARGUMENT: '',
      __VIEWSTATE,
      __VIEWSTATEGENERATOR,
      rdolist: 'rdoFolio',
      txtFolionoloc: folioNo,
      drpfundfolio: amc,
      btnGofolio: 'Go',
      pancheck: '',
      allstr: '',
      sess_id: '',
      jh1name: '',
      jh2name: '',
      jh1panno: '',
      jh2panno: '',
      panverify: '',
      jh1panverify: '',
      jh2panverify: '',
      brokcodename: '',
      subbrokname: '',
      bankdet: '',
      taxstatus: '',
      lastadvise: '',
      addlAmount: '',
      chequeno: '',
      chqdate: '',
      bankname: '',
      branchname: '',
      redeemAmt: '',
      redeemunit: '',
      switchamt: '',
      switchUnit: '',
      Scheme: '',
      opt: '',
      subopt: '',
      Mods: '',
      fund: '',
      brkcodename: '',
      foliono: '',
      chkdgt: '',
      panstatush1: '',
      kycstatush1: '',
      panstatush2: '',
      kycstatush2: '',
      panstatush3: '',
      kycstatush3: '',
      custmid: '',
      brokcode: '',
      brokname: '',
      fundname: '',
      rcount: '',
      flag: '',
      hidAllStr,
      hidNewAllstr: '',
      hidDefNewAllStr: '',
      hidSessionId,
      HidGuardpan: '',
      HidrepFlag: '',
      hidAllStr1
    })

    const postInvLocate = await axios({
      method:'POST',
      url: `https://fundsnet.camsonline.com/eCRMS/BrokerOnlineSite/BrokerOnline/BOL_InvLocate.aspx${BOLInvLocateToken}`,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'max-age=0',
        Connection: 'keep-alive',
        'Content-Length': invLocateForm.length,
        'Content-Type': 'application/x-www-form-urlencoded',
        Host: 'fundsnet.camsonline.com',
        Origin: `https://fundsnet.camsonline.com`,
        Referer: `https://fundsnet.camsonline.com/eCRMS/BrokerOnlineSite/BrokerOnline/BOL_InvLocate.aspx${BOLInvLocateToken}`,
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) snap Chromium/79.0.3945.79 Chrome/79.0.3945.79 Safari/537.36'
      },
      data: invLocateForm
    })
    const BOL_AcctStmt = postInvLocate.data.split('var qry = \'')[1].split('\';')[0]
    let acctStmt = await axios({
      method:'GET',
      url: `https://fundsnet.camsonline.com/eCRMS/BrokerOnlineSite/BrokerOnline/${BOL_AcctStmt}`,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'max-age=0',
        Connection: 'keep-alive',
        Host: 'fundsnet.camsonline.com',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) snap Chromium/79.0.3945.79 Chrome/79.0.3945.79 Safari/537.36'
      }
    })
    if (!acctStmt || !acctStmt.data || !acctStmt.data.includes('<img src="../../LogIn/ImageHandler.ashx?'))
      throw { message: 'Error in getting Broker Online Account Statement' }

    acctStmt = acctStmt.data
    const captchaToken = acctStmt.split('<img src="../../LogIn/ImageHandler.ashx?')[1].split('"')[0]
    const captchaLink = `https://fundsnet.camsonline.com/eCRMS/LogIn/ImageHandler.ashx?${captchaToken}`
    const url = `https://fundsnet.camsonline.com/eCRMS/BrokerOnlineSite/BrokerOnline/${BOL_AcctStmt}`
    let { fromDate, toDate, dateType = 'FULL' } = options
    if (!fromDate || !toDate) {
      fromDate = '01-Jan-1900'
      toDate = moment().format('DD-MMM-YYYY')
    } else {
      dateType = 'givenperiod'
      fromDate = moment(fromDate, 'DD-MM-YYYY').format('DD-MMM-YYYY')
      toDate = moment(toDate, 'DD-MM-YYYY').format('DD-MMM-YYYY')
    }
    const fields = [
      'id="__CSRFTOKEN" value="',
      'id="folio_no" value="',
      'id="amc" value="',
      'id="sta" value="',
      'id="reqtype" value="',
      'id="usercode" value="',
      'id="remoteaddr" value="',
      'id="filepath" value="',
      'id="unitdomain" value="',
      'id="invemail" value="',
      'id="hidexfol" value="',
      'id="hidAmcLogo" value="',
      'id="hidAllValue" value="',
      'id="hidSessId" value="',
      'id="footrep" value="',
      'id="hidUserCode" value="',
      'id="__VIEWSTATEGENERATOR" value="',
      'id="__VIEWSTATE" value="'
    ]
    const result = fields.some(field => acctStmt.includes(field))
    if (!result) throw 'Error in getting token info'
    __VIEWSTATEGENERATOR = acctStmt.split('id="__VIEWSTATEGENERATOR" value="')[1].split('" />')[0]
    __VIEWSTATE = acctStmt.split('id="__VIEWSTATE" value="')[1].split('" />')[0]
    const __CSRFTOKEN = acctStmt.split('id="__CSRFTOKEN" value="')[1].split('" />')[0]
    const folio_no = acctStmt.split('id="folio_no" value="')[1].split('" />')[0]
    const amc_code = acctStmt.split('id="amc" value="')[1].split('" />')[0]
    const sta = acctStmt.split('id="sta" value="')[1].split('" />')[0]
    const hidAmcLogo = acctStmt.split('id="hidAmcLogo" value="')[1].split('" />')[0]
    const reqtype = acctStmt.split('id="reqtype" value="')[1].split('" />')[0]
    const usercode = acctStmt.split('id="usercode" value="')[1].split('" />')[0]
    const remoteaddr = acctStmt.split('id="remoteaddr" value="')[1].split('" />')[0]
    const filepath = acctStmt.split('id="filepath" value="')[1].split('" />')[0]
    const unitdomain = acctStmt.split('id="unitdomain" value="')[1].split('" />')[0]
    const invemail = acctStmt.split('id="invemail" value="')[1] && acctStmt.split('id="invemail" value="')[1].split('" />')[0]
    const hidexfol = acctStmt.split('id="hidexfol" value="')[1].split('" />')[0]
    const hidAllValue = acctStmt.split('id="hidAllValue" value="')[1].split('" />')[0]
    const hidSessId = acctStmt.split('id="hidSessId" value="')[1].split('" />')[0]
    const footrep = acctStmt.split('id="footrep" value="')[1].split('" />')[0]
    const hidUserCode = acctStmt.split('id="hidUserCode" value="')[1].split('" />')[0]
    const pdfData = {
      __CSRFTOKEN,
      __EVENTTARGET: '',
      __EVENTARGUMENT: '',
      __VIEWSTATE,
      __VIEWSTATEGENERATOR,
      rdStmtType: dateType,
      hdnGUID: '',
      txtCaptcha: '',
      fper: fromDate,
      tper: toDate,
      folio_no,
      amc: amc_code,
      amcname: '',
      stattype: dateType,
      sta,
      reqtype,
      usercode,
      remoteaddr,
      filepath,
      unitdomain,
      sess_id: '',
      invemail,
      hidexfol,
      hidAmcLogo,
      hidAllValue,
      hidSessId,
      footrep,
      brok_code: '',
      hidbrok_code: '',
      hidUserCode,
      hidMultiBrokFolio: '',
      parentflag: '',
      hdnusacanadaflag: '',
      hidChkDpflag: '',
      hdnacstcapval: '',
      hidMulti_brk: '',
      hidDP_FLAG: ''
    }
    const fundsNetToken = `${folioNo.split('/')[0]}_${amc}.txt`
    const saveFolioInfo = JSON.stringify({
      pdfData,
      url,
      folioNo,
      amc,
      captchaLink,
      fromDate,
      toDate,
      captchaTry: 0
    })
    await fs.writeFile(`temp/${fundsNetToken}`, saveFolioInfo)
    return {
      captchaLink,
      fundsNetToken
    }
  } catch (error) {
    const errorMessage = error.message || error
    logger.error(errorMessage)
    throw errorMessage
  }
}

const getFundsnetSoa = async (options) => {
  try{
    const { captchaText, fundsNetToken } = options
    let folioRequiredData = await fs.readFile(`temp/${fundsNetToken}`, 'utf8')
    if (!folioRequiredData)
      throw 'Error in finding fundsNetToken value, please retry.'
    folioRequiredData = JSON.parse(folioRequiredData)
    let { pdfData } = folioRequiredData
    const { url, folioNo, amc, captchaLink } = folioRequiredData
    pdfData.txtCaptcha = captchaText.toUpperCase()
    pdfData = querystring.stringify(pdfData)

    const getCapchaRequest = await axios({
      method: 'GET',
      url: captchaLink,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        Host: 'fundsnet.camsonline.com',
        Origin: `https://fundsnet.camsonline.com`,
        Pragma: 'no-cache',
        Referer: url,
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) snap Chromium/79.0.3945.79 Chrome/79.0.3945.79 Safari/537.36'
      },
      responseType: 'arraybuffer'
    })

    const getSOAPdf = await axios({
      method: 'POST',
      url: `https://fundsnet.camsonline.com/Acctstmt/AcctStmt.aspx`,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Content-Length': pdfData.length,
        'Content-Type': 'application/x-www-form-urlencoded',
        Host: 'fundsnet.camsonline.com',
        Origin: `https://fundsnet.camsonline.com`,
        Pragma: 'no-cache',
        Referer: url,
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) snap Chromium/79.0.3945.79 Chrome/79.0.3945.79 Safari/537.36'
      },
      responseType: 'arraybuffer',
      data: pdfData
    })
    if(getSOAPdf.status != 200 || getSOAPdf.data.length < 50) throw 'Session is expired, please retry.'
    logger.info('Fundsnet pdf is fetched successfully.')
    const fileName = `${folioNo.split('/')[0]}_${amc}.pdf`
    await fs.writeFile(`${fundsnetPath}/${fileName}`, getSOAPdf.data)
    return {
      fileName,
      filePath: fundsnetPath
    }
  } catch (error) {
    const errorMessage = error.message || error
    logger.error(errorMessage)
    throw errorMessage
  }
}

module.exports = {
  getFundsnetCaptcha,
  getFundsnetSoa
}