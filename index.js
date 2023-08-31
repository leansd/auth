const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./logger')
const getSessionInfoFromWeixin = require('./weixinAuth');
const {keycloakAuth,keycloakRefreshToken,fetchPublicKey,publicKey} = require('./keycloakAuth');
const { PORT } = require('./config');


const app = express();
app.use(bodyParser.json());


/**
 * 增加Token验证
 */
const WHITELISTED_PATHS = ['/login', '/public-info'];
fetchPublicKey();
app.use(async (req, res, next) => {
  if (WHITELISTED_PATHS.includes(req.path)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send({ message: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
      jwt.verify(token, publicKey, { algorithms: ['RS256'] }); 
      const payload = jwt.decode(token); 
      req.user = payload; 
      next();
  } catch (err) {
      return res.status(401).send({ message: 'Invalid token' });
  }
});

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

/**
 * 刷新token
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
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
