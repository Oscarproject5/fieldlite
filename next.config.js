/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['twilio'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle twilio on the server
      config.externals.push('twilio');
    }
    return config;
  },
}

module.exports = nextConfig