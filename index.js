const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const app = express();

require('dotenv').config();

const APP_ID = process.env.APP_ID;
const APP_SECRET = process.env.APP_SECRET;

// 使用body-parser来解析post请求的body
app.use(bodyParser.json());

app.post('/login', async (req, res) => {
  const code = req.body.code;

  try {
    console.log('login received', code)
    const response = await axios.get(`https://api.weixin.qq.com/sns/jscode2session?appid=${APP_ID}&secret=${APP_SECRET}&js_code=${code}&grant_type=authorization_code`);
    console.log(response.data)
    if (response.data.errcode){
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
    console.error('登录凭证换取失败', error);
    res.status(500).send('登录失败');
  }
});

function generateToken(openid) {
  return `token_${openid}`;
}

app.listen(8848, () => {
  console.log('Server started on http://localhost:8848');
});
