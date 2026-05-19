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
      {
        source: '/portfolio',
        destination: '/lab?tab=holdings',
        permanent: true,
      },
      {
        source: '/watchlist',
        destination: '/lab?tab=watchlist',
        permanent: true,
      },
      {
        source: '/compare',
        destination: '/lab?tab=compare',
        permanent: true,
      },
      {
        source: '/backtest',
        destination: '/lab?tab=backtest',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;