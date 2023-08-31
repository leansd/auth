const axios = require('axios');

async function getSessionInfoFromWeixin(APP_ID, APP_SECRET, code) {
    try {
        const response = await axios.get(`https://api.weixin.qq.com/sns/jscode2session?appid=${APP_ID}&secret=${APP_SECRET}&js_code=${code}&grant_type=authorization_code`);

        if (response.data.errcode) {
            throw new Error(`login failed: ${response.data.errmsg}`);
        }

        return {
            openid: response.data.openid,
            session_key: response.data.session_key
        };
    } catch (error) {
        throw new Error(`登录凭证换取失败: ${error}`);
    }
}


module.exports =  getSessionInfoFromWeixin;