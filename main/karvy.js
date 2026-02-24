const axios = require('axios')
const moment = require('moment')
const https = require('https')
const querystring = require('querystring')
const fs = require('fs/promises')
const { exec } = require('child_process')
const { promisify } = require('util')
const { post } = require('request')
const postRequest = promisify(post)
const logger = require('../logger')
const { MESSAGE } = require('../constant').default
const { karvyPath } = require('../constant/soaPath')

const getKarvySOA = async (options) => {
  try {
    const { userName, password, folioNo, fund, fromDate = '01/01/1990', toDate = moment().format('DD/MM/YYYY') } = options
    if(!fund)
      throw 'Invalid AMC'
    else if(!userName || !password)
      throw 'Credential not found'
    const fileName = `${folioNo.split('/')[0]}_${fund}_${moment(fromDate, 'DD/MM/YYYY').format('DDMMYY')}_${moment(toDate, 'DD/MM/YYYY').format('DDMMYY')}.pdf`
    try {
      await fs.readFile(`${karvyPath}/${fileName}`)
      logger.info('File already exists')
      return {
        fileName,
        filePath: karvyPath
      }
    } catch (err) {
    }
    const getLoginForm = await axios({
      url: 'https://mfs.kfintech.com/mfs/distributor/Distributor_Login.aspx',
      method: 'GET',
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        'Accept-Encoding': "gzip, deflate, br",
        'Accept-Language': "en-GB,en-US;q=0.9,en;q=0.8",
        Connection: 'keep-alive',
        'Content-Type': 'application/x-www-form-urlencoded',
        Host: 'mfs.kfintech.com',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': "same-origin",
        'Upgrade-Insecure-Requests': 1,
        'User-Agent': "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36"
      }
    })
    const viewState = getLoginForm.data.split('id="__VIEWSTATE" value="')[1].split('" />')[0]
    const viewStateGenerator = getLoginForm.data.split('id="__VIEWSTATEGENERATOR" value="')[1].split('" />')[0]
    const eventValidation = getLoginForm.data.split('id="__EVENTVALIDATION" value="')[1].split('" />')[0]
    const randomCharacters = new Array('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 
    'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y',
    'z', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0')
    const char1 = randomCharacters[Math.floor(Math.random()*62)]
    const char2 = randomCharacters[Math.floor(Math.random()*62)]
    const char3 = randomCharacters[Math.floor(Math.random()*62)]
    const code = `${char1}${char2}` + `${char3}42`
    const loginForm = querystring.stringify({
      __LASTFOCUS: '',
      __EVENTARGUMENT: '',
      __VIEWSTATE: viewState,
      __VIEWSTATEGENERATOR: viewStateGenerator,
      __EVENTVALIDATION: eventValidation,
      __VIEWSTATEENCRYPTED: '',
      txtUserId: userName,
      txtPassword: password,
      'txtcapthca$txtcptcha': code,
      'txtcapthca$captcha': code,
      btnSubmit: 'Sign In'
    })
    const login = await postRequest({
      url: 'https://mfs.kfintech.com/mfs/distributor/Distributor_Login.aspx',
      rejectUnauthorized: false,
      json: true,
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        'Accept-Encoding': "gzip, deflate, br",
        'Accept-Language': "en-GB,en-US;q=0.9,en;q=0.8",
        Connection: 'keep-alive',
        'Content-Length': loginForm.length,
        'Content-Type': 'application/x-www-form-urlencoded',
        Host: 'mfs.kfintech.com',
        Origin: 'https://mfs.kfintech.com',
        Referer: 'https://mfs.kfintech.com/mfs/distributor/Distributor_Login.aspx',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': "same-origin",
        'Upgrade-Insecure-Requests': 1,
        'User-Agent': "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36"
      },
      body: loginForm
    })
    if (!login.headers.location || !login.headers['set-cookie'])
      throw "Error while login, Please retry with correct credentials"

    logger.info('Kavy logged in successfully')
    const cookies = login.headers['set-cookie'][0].split(';')[0]
    const home = await axios({
      url: 'https://mfs.kfintech.com/mfs/distributor/General/Distributor_Home.aspx',
      method: 'GET',
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        'Accept-Encoding': "gzip, deflate, br",
        'Accept-Language': "en-GB,en-US;q=0.9,en;q=0.8",
        Cookie: cookies,
        Host: 'mfs.kfintech.com',
        Origin: 'https://mfs.kfintech.com',
        Referer: 'https://mfs.kfintech.com/mfs/distributor/Distributor_Login.aspx',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': "same-origin",
        'Upgrade-Insecure-Requests': 1,
        'User-Agent': "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36"
      }
    })

    const brokerCode = home.data.split("var distCode = '")[1].split("';")[0]
    const search = await postRequest({
      rejectUnauthorized: false,
      json: true,
      url: 'https://mfs.kfintech.com/mfs/distributor/Query/QueryNew.aspx/SearchResult',
      functionName: 'getKarvySOA',
      headers: {
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'Accept-Encoding': "gzip, deflate, br",
        'Accept-Language': "en-GB,en-US;q=0.9,en;q=0.8",
        Connection: 'keep-alive',
        'Content-Type': 'application/json; charset=UTF-8',
        Cookie: cookies,
        Host: 'mfs.kfintech.com',
        Origin: 'https://mfs.kfintech.com',
        Referer: 'https://mfs.kfintech.com/mfs/distributor/Query/QueryNew.aspx',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': "same-origin",
        'User-Agent': "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: {
        fund,
        searchoption: 'ACNO',
        searchtext: folioNo,
        chkinc: '',
        brokercode: brokerCode,
        Pageno: '1'
      },
      json: true
    })
    const searchData = JSON.parse(search.body.d)
    if(!Array.isArray(searchData) && !searchData.length)
      throw "Please retry"
    const { encacno, enFund } = searchData[0]
    if (!encacno || !enFund)
      throw 'Invalid Karvy Folio No'

    logger.info('Karvy Folio No is verified')
    const getFormData = await axios({
      method:'GET',
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      url: 'https://mfs.kfintech.com/mfs/distributor/Query/Accountstatementnew.aspx',
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        'Accept-Encoding': "gzip, deflate, br",
        'Accept-Language': "en-GB,en-US;q=0.9,en;q=0.8",
        Connection: 'keep-alive',
        Cookie: cookies,
        Host: 'mfs.kfintech.com',
        Referer: 'https://mfs.kfintech.com/mfs/distributor/Query/QueryNew.aspx',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': "same-origin",
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': 1,
        'User-Agent': "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36"
      },
      params: {
        accNo: encacno,
        fund: enFund
      }
    })

    if (!getFormData.data.includes('Accountstatementnew.aspx'))
      throw 'Error in getting account Statement. Please retry.'

    const accountStatementArray = getFormData.data.split('\n')
    let dgrdSchemes = {}
    for (const accountStatement of accountStatementArray)
      if (accountStatement.includes('dgrdSchemes$'))
        dgrdSchemes = {
          ...dgrdSchemes,
          [`${accountStatement.split('<input name="')[1].split('"')[0]}`]: 'on'
        }
    if (!Object.keys(dgrdSchemes).length)
      throw "Please retry"
    const urlAppend = getFormData.data.split('Accountstatementnew.aspx')[1].split('"')[0]
    const __VIEWSTATE = getFormData.data.split('id="__VIEWSTATE" value="')[1].split('"')[0]
    const __VIEWSTATEGENERATOR = getFormData.data.split('id="__VIEWSTATEGENERATOR" value="')[1].split('"')[0]
    const __PREVIOUSPAGE = getFormData.data.split('id="__PREVIOUSPAGE" value="')[1].split('"')[0]
    const __EVENTVALIDATION = getFormData.data.split('id="__EVENTVALIDATION" value="')[1].split('"')[0]
    let pdfForm
    if (getFormData.data.includes('value="Detailed"')) {
      pdfForm = {
        scriptmanager1: 'updatepanel1|btnViewAndPrint',
        __EVENTTARGET: 'btnViewAndPrint',
        __EVENTARGUMENT: '',
        __VIEWSTATE,
        __VIEWSTATEGENERATOR,
        __SCROLLPOSITIONX: 0,
        __SCROLLPOSITIONY: 0,
        __VIEWSTATEENCRYPTED: '',
        __PREVIOUSPAGE,
        __EVENTVALIDATION,
        rblstmttype: 'Detailed',
        txtFromDate: fromDate,
        txtToDate: toDate,
        ...dgrdSchemes,
        hidName: '',
        hdnAcno: folioNo,
        __ASYNCPOST: 'true'
      }
    }
    else
      pdfForm = {
        scriptmanager1: 'updatepanel1|btnViewAndPrint',
        __EVENTTARGET: 'btnViewAndPrint',
        __EVENTARGUMENT: '',
        __VIEWSTATE,
        __VIEWSTATEGENERATOR,
        __SCROLLPOSITIONX: 0,
        __SCROLLPOSITIONY: 0,
        __VIEWSTATEENCRYPTED: '',
        __PREVIOUSPAGE,
        __EVENTVALIDATION,
        txtFromDate: moment().format('DD/MM/YYYY'),
        txtToDate: moment().format('DD/MM/YYYY'),
        ...dgrdSchemes,
        hidName: '',
        hdnAcno: folioNo,
        __ASYNCPOST: 'true'
      }
    pdfForm = querystring.stringify(pdfForm)
    const getPDFLink = await axios({
      method: 'POST',
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      url: `https://mfs.kfintech.com/mfs/distributor/Query/Accountstatementnew.aspx${urlAppend}`,
      functionName: 'getKarvySOA',
      headers: {
        Accept: '*/*',
        'Accept-Encoding': "gzip, deflate, br",
        'Accept-Language': "en-GB,en-US;q=0.9,en;q=0.8",
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Content-Length': pdfForm.length,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Cookie: cookies,
        Host: 'mfs.kfintech.com',
        Origin: `https://mfs.kfintech.com`,
        Referer: `https://mfs.kfintech.com/mfs/distributor/Query/Accountstatementnew.aspx${urlAppend}`,
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': "same-origin",
        'User-Agent': "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
        'X-MicrosoftAjax': 'Delta=true'
      },
      data: pdfForm
    })
    if (!getPDFLink.data.includes('id="hidName" value="'))
      throw 'Error in getting the PDF. Please retry.'

    logger.info('Karvy SOA is found for the given Folio No')
    const appendLink = getPDFLink.data.split('id="hidName" value="')[1].split('"')[0]
    const downloadLink = `https://mfs.kfintech.com/mfs/distributor/Query/${appendLink}`
    exec(`curl -o "${karvyPath}/${fileName}" --insecure "${downloadLink}"`, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Karvy Error: ${error.message}`)
        logger.error(`Karvy SOA file write error: ${stderr}`)
        throw error
      }
      logger.info(`stdout: ${stdout}`)
    })
    return {
      fileName,
      filePath: karvyPath
    }
  } catch (error) {
    logger.error(error.stack || error)
    throw error.message || error
  }
}

module.exports = {
  getKarvySOA
}