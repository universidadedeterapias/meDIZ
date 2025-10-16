/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'node:async_hooks': false,
        'async_hooks': false,
      };
      config.resolve.fallback = {
        async_hooks: false,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        process: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        encoding: false,
      };
    }
    config.externals = [...(config.externals || []), 'async_hooks'];
    return config;
  },
  serverExternalPackages: ['@prisma/client', 'prisma', 'bcryptjs'],
  swcMinify: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};
export default nextConfig;
