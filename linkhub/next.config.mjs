import path from 'node:path';

const isProd = process.env.NODE_ENV === 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export -> ./out . Remove this if you move to a Node host and want SSR.
  output: 'export',
  // Relative asset paths so the exported site works when served from a sub-path.
  // Not applied in dev, where it would break hot reload.
  assetPrefix: isProd ? './' : undefined,
  images: { unoptimized: true },
  trailingSlash: true,
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(process.cwd());
    return config;
  },
};
export default nextConfig;
