const winston = require('winston')

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
}

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
}

const logger = winston.createLogger({
  levels: logLevels,
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.simple()
      ),
    }),
  ],
})
winston.addColors(logColors)

module.exports = logger