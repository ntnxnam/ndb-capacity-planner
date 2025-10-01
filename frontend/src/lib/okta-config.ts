export const oktaConfig = {
  issuer: process.env.OKTA_ISSUER || 'https://nutanix.okta.com/oauth2/default',
  clientId: process.env.OKTA_CLIENT_ID || '',
  redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/login/callback` : '',
  scopes: ['openid', 'profile', 'email'],
  pkce: true,
  disableHttpsCheck: process.env.NODE_ENV === 'development',
};

