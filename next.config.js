/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/SpaceX-demo',
  assetPrefix: '/SpaceX-demo/',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images2.imgbox.com' },
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: 'imgur.com' },
      { protocol: 'https', hostname: 'live.staticflickr.com' },
      { protocol: 'https', hostname: '**.staticflickr.com' },
      { protocol: 'https', hostname: 'thespacedevs-prod.nyc3.digitaloceanspaces.com' }
    ]
  }
}

module.exports = nextConfig
