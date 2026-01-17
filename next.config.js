/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable static page generation for dynamic pages
  output: 'standalone',
}

module.exports = nextConfig
