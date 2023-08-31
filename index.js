const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./logger')
const getSessionInfoFromWeixin = require('./weixinAuth');
const keycloakAuth = require('./keycloakAuth');
const { PORT } = require('./config');


const app = express();
app.use(bodyParser.json());

async function handleLoginRequest(req, res) {
  const code = req.body.code;
  logger.info(`login received : ${code}`);

  try {
      const { openid } = await getSessionInfoFromWeixin(code);
      logger.info(`login successful with openid: ${openid}`);
      const token = await generateToken(openid); 
      // 返回token给小程序端
      res.json({ token });
  } catch (error) {
      logger.error(error.message);
      res.status(500).send('登录失败');
  }
}
async function generateToken(openid) {
  const authResult = await keycloakAuth(openid);
  return authResult.access_token;
}

app.post('/login', handleLoginRequest);


app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
