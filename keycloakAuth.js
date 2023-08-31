const axios = require('axios');
const KeycloakAdminClient = require('keycloak-admin').default;
const qs = require('qs');
const { KEYCLOAK_ADMIN_CLIENT_ID,
    KEYCLOAK_ADMIN_PASSWORD,
    KEYCLOAK_ADMIN_USERNAME,
    KEYCLOAK_AUTH_CLIENT_ID,
    KEYCLOAK_BASE_URL,
    KEYCLOAK_NEW_USER_DEFAULT_PASSWORD,
    KEYCLOAK_REALM_NAME } = require('./config');

const keycloakConfig = {
    baseUrl: KEYCLOAK_BASE_URL,
    realmName: KEYCLOAK_REALM_NAME,
};

const keycloakAdmin = new KeycloakAdminClient(keycloakConfig);


async function keycloakAuth(openid) {

    // 使用openid检查用户是否存在
    await keycloakAdmin.auth({
        username: KEYCLOAK_ADMIN_USERNAME,
        password: KEYCLOAK_ADMIN_PASSWORD,
        grantType: 'password',
        clientId: KEYCLOAK_ADMIN_CLIENT_ID,
    });

    let users = await keycloakAdmin.users.find({ search: openid });
    if (users.length === 0) {
        // 创建新用户
        await keycloakAdmin.users.create({
            username: openid,
            enabled: true,
            credentials: [{
                type: 'password',
                value: KEYCLOAK_NEW_USER_DEFAULT_PASSWORD
            }]
        });
    }

    let data = {
        username: openid,
        password: KEYCLOAK_NEW_USER_DEFAULT_PASSWORD,
        client_id: KEYCLOAK_AUTH_CLIENT_ID,
        grant_type: 'password'
    };
    // 从Keycloak获取token
    const keycloakResponse = await axios.post(
        `${keycloakConfig.baseUrl}/realms/${keycloakConfig.realmName}/protocol/openid-connect/token`,
        qs.stringify(data),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    return keycloakResponse.data;
}

async function keycloakRefreshToken(refreshToken) {

    let data = {
        client_id: KEYCLOAK_AUTH_CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
    };
    const keycloakResponse = await axios.post(
        `${keycloakConfig.baseUrl}/realms/${keycloakConfig.realmName}/protocol/openid-connect/token`,
        qs.stringify(data),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return keycloakResponse.data;
}

module.exports = {
    keycloakAuth,
    keycloakRefreshToken
};