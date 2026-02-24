const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const logger = require('./logger')
const { router } = require('./routes')
const path = require('path')
const cors = require('cors')

app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`)
    const errorLogger = (err, req, res, next) => {
      logger.error(err.stack || err.message || err)
      next(err)
    }
    req.on('error', errorLogger)
    res.on('error', errorLogger)
    next()
})

app.use(router)

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    next()
})

app.use(cors({
    origin: '*',
    methods: ['POST', 'GET', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))
app.options('*', cors())

app.use(bodyParser.json({ extended: false }))
app.use(bodyParser.urlencoded({ extended: true }))

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'public', '404.html'))
})

const port = process.env.PORT || 3000
const server = app.listen(port, () => {
    logger.info(`Server is listening on port ${port}...`)
    server.setTimeout(120000)
})