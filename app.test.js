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

const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken', () => ({
    decode: jest.fn(),
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
        it(`没有令牌时访问非白名单路径 ${path} 返回401`, async () => {
            const response = await request(app).get(path);
            expect(response.status).toBe(401);
        });

        it(`持有非法令牌时访问非白名单路径 ${path} 返回401`, async () => {
            const mockValidToken = 'Bearer mock-invalid-token';
            jwt.decode.mockImplementation(() => {
                throw new Error('Invalid token');
            }); 
            const response = await request(app)
                .get('/user-info')
                .set('Authorization', mockValidToken);
            expect(response.status).toBe(401);
        });

        it(`持有合法令牌时访问非白名单路径 ${path} 不返回401`, async () => {
            jwt.decode.mockReturnValue({ sub: 'mocked_userid' });
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


describe('刷新令牌', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    it('如果BODY中没有给出刷新令牌，则应该返回400错误', async () => {
        const response = await request(app).post('/refresh-token').send({});
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Refresh token is required');
    });

    it('如果刷新令牌有效，则获得新令牌', async () => {
        require('./keycloakAuth').keycloakRefreshToken.mockResolvedValue({ access_token: 'new_token' });
        const response = await request(app).post('/refresh-token').send({ refresh_token: 'valid_token' });
        expect(response.status).toBe(200);
        expect(response.text).toBe(JSON.stringify({ access_token: 'new_token' }));
    });

    it('如果刷新令牌无效，返回500错误', async () => {
        require('./keycloakAuth').keycloakRefreshToken.mockRejectedValue(new Error('Invalid token'));
        const response = await request(app).post('/refresh-token').send({ refresh_token: 'invalid_token' });
        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Failed to refresh token');
    });

    it('如果keyCloak服务器错误，返回500错误', async () => {
        require('./keycloakAuth').keycloakRefreshToken.mockRejectedValue(new Error('Server error'));
        const response = await request(app).post('/refresh-token').send({ refresh_token: 'valid_token' });
        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Failed to refresh token');
    });
});


describe('更新用户信息', () => {
    const userInfo = { name: 'John', phone: '1234567890', gender: 'male' };

    beforeEach(() => {
        jest.clearAllMocks();
        jwt.decode.mockReturnValue({ sub: 'mocked_userid' });
    });

    it('正常场景', async () => {
        require('./keycloakAuth').keycloakUpdateUserInfo.mockResolvedValue(null);
        const response = await request(app)
                    .put('/user-info')
                    .set('Authorization', "Bearer mocked_token")
                    .send(userInfo);
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Profile updated successfully');
    });

    it.skip('如果用户信息无效，则拒绝更新(尚未实现）', async () => {
        const invalidUserInfo = { name: '', phone: '1234567890', gender: 'alien' }; // 假设这是无效的信息
        require('./keycloakAuth').keycloakUpdateUserInfo.mockRejectedValue(new Error('Invalid user info'));
        const response = await request(app).put('/user-info').send(invalidUserInfo);
        expect(response.status).toBe(500);
        expect(response.body.message).toBe('Failed to update profile');
    });

    it('如果服务器错误，则返回500', async () => {
        require('./keycloakAuth').keycloakUpdateUserInfo.mockRejectedValue(new Error('Server error'));
        const response = await request(app)
        .put('/user-info')
        .set('Authorization', "Bearer mocked_token")
        .send(userInfo);
        expect(response.status).toBe(500);
        expect(response.body.message).toBe('Failed to update profile');
    });
});
