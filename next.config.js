const withNextIntl = require('next-intl/plugin')('./app/i18n.ts');

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/]
})

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [],
    webpackBuildWorker: true
  },
  swcMinify: true,
  images: {
    unoptimized: true
  }
}

module.exports = withNextIntl({
  ...withPWA(nextConfig)
});
