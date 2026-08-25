/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { 
    typedRoutes: false,
    serverComponentsExternalPackages: ['pdf-parse']
  },
  images: { unoptimized: true },
  trailingSlash: false,
}
module.exports = nextConfig
