const winston = require('winston');
const path = require('path');

const timeStamp = () => {
  const now = new Date();
  const date = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${date} | ${time}`;
};

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: timeStamp }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}${stack ? `\n${stack}` : ''}`;
    })
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/info.log'),
      level: 'info'
    }),
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/warning.log'),
      level: 'warn',
    }),
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      handleExceptions: true
    }),
    new winston.transports.Console({
      handleExceptions: true
    })
  ],
});

module.exports = logger;