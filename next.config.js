/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/check-feed',
        destination: '/api/check-feed',
      },
    ];
  },
}

module.exports = nextConfig 