/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during builds on Vercel
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable type checking during builds on Vercel
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['twilio'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle twilio on the server
      config.externals.push('twilio');
    }
    return config;
  },
}

module.exports = nextConfig