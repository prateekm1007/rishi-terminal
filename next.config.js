/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  async redirects() {
    return [
      {
        source: '/commodity/:symbol',
        destination: '/commodities/:symbol',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
