/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
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
    
    // Prevent async_hooks from being bundled
    config.module = {
      ...config.module,
      exprContextCritical: false,
    };
    
    return config;
  },
  serverExternalPackages: ['@prisma/client', 'prisma', 'bcryptjs'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
