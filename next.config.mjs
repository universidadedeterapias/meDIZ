/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        async_hooks: false,
        fs: false,
        crypto: false,
        stream: false,
      };
    }
    // Evita problemas com symlinks no Windows/OneDrive
    config.resolve.symlinks = false;
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configurações de API routes
  experimental: {
    // Aumenta timeout para API routes que processam muitos dados
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
