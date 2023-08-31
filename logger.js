const winston = require('winston');

const logger = winston.createLogger({
  level: 'info', 
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(), // 输出到控制台
    new winston.transports.File({ filename: 'app.log' }) // 输出到文件
  ]
});

module.exports = logger;