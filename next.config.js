/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: false },
  images: { unoptimized: true },
  // Required for Vercel: ensure dynamic routes work
  trailingSlash: false,
}
module.exports = nextConfig
