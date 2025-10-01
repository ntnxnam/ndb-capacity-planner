/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    OKTA_DOMAIN: process.env.OKTA_DOMAIN,
    OKTA_CLIENT_ID: process.env.OKTA_CLIENT_ID,
    OKTA_ISSUER: process.env.OKTA_ISSUER,
    BACKEND_URL: process.env.BACKEND_URL,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
}

module.exports = nextConfig

