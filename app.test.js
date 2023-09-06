const request = require('supertest');

jest.mock('./keycloakAuth', () => ({
    keycloakAuth: jest.fn().mockResolvedValue('mocked_token'),
    keycloakRefreshToken: jest.fn().mockResolvedValue('mocked_refresh_token'),
    keycloakUpdateUserInfo: jest.fn().mockResolvedValue(null),
    fetchPublicKey: jest.fn(),
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
