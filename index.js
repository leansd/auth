const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./logger')
const getSessionInfoFromWeixin = require('./weixinAuth');
const {keycloakAuth,keycloakRefreshToken} = require('./keycloakAuth');
const { PORT } = require('./config');


const app = express();
app.use(bodyParser.json());

/**
 * handle Login Request
 * @param {*} req 
 * @param {*} res 
 */
async function handleLoginRequest(req, res) {
  const code = req.body.code;
  logger.info(`login received : ${code}`);

  try {
    const { openid } = await getSessionInfoFromWeixin(code);
    logger.info(`login successful with openid: ${openid}`);
    const token = await generateToken(openid);
    // 返回token给小程序端
    res.send(token);
  } catch (error) {
    logger.error(error.message);
    res.status(500).send('登录失败');
  }
}

async function generateToken(openid) {
  const authResult = await keycloakAuth(openid);
  return authResult;
}



app.post('/login', handleLoginRequest);

async function handleRefreshTokenRequest(req, res) {
  const refreshToken = req.body.refresh_token;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    const token = await keycloakRefreshToken(refreshToken);
    res.send(token);
  } catch (error) {
    logger.error(error.message);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
}

app.post('/refresh-token', handleRefreshTokenRequest);

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
