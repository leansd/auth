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

describe('Token Validation', () => {
    const WHITELISTED_PATHS = ['/login', '/public-info', '/refresh-token'];

    // 测试白名单中的路径
    WHITELISTED_PATHS.forEach(path => {
        it(`should allow access to whitelisted path ${path} without token`, async () => {
            const response = await request(app).get(path);
            expect(response.status).not.toBe(401);
        });
    });

    it('should deny access to non-whitelisted paths without token', async () => {
        const response = await request(app).get('/some-non-whitelisted-path');
        expect(response.status).toBe(401);
    });

    it('should allow access to non-whitelisted paths with valid token', async () => {
        // 这里你需要提供一个有效的模拟令牌
        const mockValidToken = 'Bearer your-mock-valid-token';
        const response = await request(app)
            .get('/user-info')
            .set('Authorization', mockValidToken);
        expect(response.status).not.toBe(401);
    });
});


const { getSessionInfoFromWeixin } = require('./weixinAuth');
const {keycloakAuth} = require('./keycloakAuth');
describe('Login Functionality', () => {
    afterEach(() => {
        // 在每个测试之后重置mocks，确保没有mock状态在测试之间泄露
        jest.clearAllMocks();
    });

    it('should handle valid code', async () => {
        const mockCode = 'validCode';
        getSessionInfoFromWeixin.mockResolvedValue({ openid: 'mockOpenid' });
        const response = await request(app)
            .post('/login')
            .send({ code: mockCode });
        expect(response.status).toBe(200);
    });

    it('should handle invalid code', async () => {
        const mockCode = 'invalidCode';
        require('./weixinAuth').getSessionInfoFromWeixin.mockRejectedValue(new Error('Invalid code'));

        const response = await request(app)
            .post('/login')
            .send({ code: mockCode });

        expect(response.status).toBe(500); // 根据你的错误处理代码进行调整
        expect(response.text).toBe('登录失败');
    });

    it('should handle failure in getting session info from Weixin', async () => {
        const mockCode = 'someCode';
        require('./weixinAuth').getSessionInfoFromWeixin.mockRejectedValue(new Error('Weixin API failure'));

        const response = await request(app)
            .post('/login')
            .send({ code: mockCode });

        expect(response.status).toBe(500); // 根据你的错误处理代码进行调整
        expect(response.text).toBe('登录失败');
    });
});
