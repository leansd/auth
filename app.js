const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./logger')
const {getSessionInfoFromWeixin} = require('./weixinAuth');
const {keycloakAuth,keycloakRefreshToken,fetchPublicKey,keycloakUpdateUserInfo} = require('./keycloakAuth');
const jwt = require('jsonwebtoken');


const app = express();
app.use(bodyParser.json());

const url_login = '/auth/v1/login';
const url_public_info = '/auth/v1/public-info';
const url_refresh_token = '/auth/v1/refresh-token';
const url_user_info = '/user/v1/user-info';

/**
 * 增加Token验证
 */
const WHITELISTED_PATHS = [url_login, url_public_info,url_refresh_token];
fetchPublicKey();
app.use(async (req, res, next) => {
  if (WHITELISTED_PATHS.includes(req.path)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.info(`Missing or invalid token in request: ${req.path}`);
      return res.status(401).send({ message: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
      //jwt.verify(token, getPublicKey(), { algorithms: ['RS256'] }); 
      const payload = jwt.decode(token); 
      req.user = payload; 
      next();
  } catch (err) {
      logger.error(err);
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
  console.log(code);
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



app.post(url_login, handleLoginRequest);

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

app.post(url_refresh_token, handleRefreshTokenRequest);


/**
 * 更新用户信息
 * @param {*} req
 *      - 支持3个数据：name, phone, gender
 * @param {*} res
 * */
async function handleUpdateUserInfoRequest(req, res) {
  const userId = req.user.sub;
  try {
    await keycloakUpdateUserInfo(userId, req.body);
    res.send({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).send({ message: 'Failed to update profile', error: error.message });
  }
}

app.put(url_user_info, handleUpdateUserInfoRequest);

module.exports = {app,url_login,url_public_info,url_refresh_token,url_user_info};
