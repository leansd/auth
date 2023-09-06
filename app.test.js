const request = require('supertest');

jest.mock('./keycloakAuth', () => ({
    keycloakAuth: jest.fn().mockResolvedValue({ token: 'mocked_token' }),
    keycloakRefreshToken: jest.fn().mockResolvedValue('mocked_refresh_token'),
    keycloakUpdateUserInfo: jest.fn().mockResolvedValue(null),
    fetchPublicKey: jest.fn(),
}));

jest.mock('./weixinAuth', () => ({
    getSessionInfoFromWeixin: jest.fn()
}));

const app = require('./app'); 

describe('白名单中的路径不需要访问令牌，其他路径需要访问令牌', () => {
    const WHITELISTED_PATHS = ['/login', '/public-info', '/refresh-token'];
    const PROTECTED_PATHS = ['/user-info'];
    // 测试白名单中的路径
    WHITELISTED_PATHS.forEach(path => {
        it(`可以不使用令牌访问路径 ${path} `, async () => {
            const response = await request(app).get(path);
            expect(response.status).not.toBe(401);
        });
    });

    PROTECTED_PATHS.forEach(path => {
        it(`没有令牌时访问非白名单路径 ${path} 应该返回401`, async () => {
            const response = await request(app).get(path);
            expect(response.status).toBe(401);
        });

        it(`持有令牌时访问非白名单路径 ${path} 不返回401`, async () => {
            const mockValidToken = 'Bearer mock-valid-token';
            const response = await request(app)
                .get('/user-info')
                .set('Authorization', mockValidToken);
            expect(response.status).not.toBe(401);
        });
    });
});


const { getSessionInfoFromWeixin } = require('./weixinAuth');
const {keycloakAuth} = require('./keycloakAuth');
describe('使用小程序码登录并换取令牌', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('如果小程序的CODE有效，则调用Auth服务，换取Token', async () => {
        const mockCode = 'validCode';
        getSessionInfoFromWeixin.mockResolvedValue({ openid: 'mockOpenid' });
        const response = await request(app)
            .post('/login')
            .send({ code: mockCode });
        expect(response.status).toBe(200);
    });

    it('如果CODE被微信服务器拒绝，返回500', async () => {
        const mockCode = 'invalidCode';
        require('./weixinAuth').getSessionInfoFromWeixin.mockRejectedValue(new Error('Invalid code'));

        const response = await request(app)
            .post('/login')
            .send({ code: mockCode });

        expect(response.status).toBe(500); 
        expect(response.text).toBe('登录失败');
    });

    it('如果微信服务器出错，返回500', async () => {
        const mockCode = 'someCode';
        require('./weixinAuth').getSessionInfoFromWeixin.mockRejectedValue(new Error('Weixin API failure'));

        const response = await request(app)
            .post('/login')
            .send({ code: mockCode });

        expect(response.status).toBe(500); 
        expect(response.text).toBe('登录失败');
    });
});
