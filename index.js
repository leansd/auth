const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

require('dotenv').config();

const APP_ID = process.env.APP_ID;
const APP_SECRET = process.env.APP_SECRET;
const PORT = process.env.PORT || 8848;


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


const app = express();
app.use(bodyParser.json());

app.post('/login', async (req, res) => {
  const code = req.body.code;

  try {
    logger.info(`login received : ${code}`)
    const response = await axios.get(`https://api.weixin.qq.com/sns/jscode2session?appid=${APP_ID}&secret=${APP_SECRET}&js_code=${code}&grant_type=authorization_code`);
    logger.info(`login response: ${JSON.stringify(response.data)}` )
    if (response.data.errcode){
      logger.error(`login failed: ${response.data.errmsg}`)
      res.status(500).send('登录失败' + response.data.errmsg);
      return;
    }
    const openid = response.data.openid;
    const session_key = response.data.session_key;

    // 基于openid生成token（这里为简化示例）
    const token = generateToken(openid); 

    // 返回token给小程序端
    res.json({ token });
  } catch (error) {
    logger.error(`登录凭证换取失败: ${error}`)
    res.status(500).send('登录失败');
  }
});

function generateToken(openid) {
  return `token_${openid}`;
}

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
