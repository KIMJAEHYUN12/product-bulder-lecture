const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  serverExternalPackages: ['puppeteer', 'sharp', 'firebase-admin'],
};

module.exports = nextConfig;
