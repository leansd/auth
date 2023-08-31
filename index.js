const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./logger')
const getSessionInfoFromWeixin = require('./weixin_auth');

require('dotenv').config();

const APP_ID = process.env.APP_ID;
const APP_SECRET = process.env.APP_SECRET;
const PORT = process.env.PORT || 8848;

const app = express();
app.use(bodyParser.json());

app.post('/login', async (req, res) => {
  const code = req.body.code;
  logger.info(`login received : ${code}`);
  try {
    const { openid } = await getSessionInfoFromWeixin(APP_ID, APP_SECRET,code);
    logger.info(`login successful with openid: ${openid}`);
    const token = generateToken(openid); 
    // 返回token给小程序端
    res.json({ token });
  } catch (error) {
    logger.error(error.message);
    res.status(500).send('登录失败');
  }
});


function generateToken(openid) {
  return `token_${openid}`;
}

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
