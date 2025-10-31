/** @type {import('next').NextConfig} */

// 🔧 SOLUÇÃO DEFINITIVA EINVAL: Força desabilitação de symlinks
// Isso é crítico para projetos no Windows/OneDrive
process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --no-preserve-symlinks --preserve-symlinks-main=false';

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
    // 🔧 CORREÇÃO EINVAL: Desabilita symlinks completamente no Windows/OneDrive
    config.resolve.symlinks = false;
    
    // Força webpack a não seguir symlinks
    config.resolve.plugins = config.resolve.plugins || [];
    
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // 🔧 SOLUÇÃO EINVAL: Usa sistema de arquivos real, não symlinks
  // serverComponentsExternalPackages foi movido para serverExternalPackages no Next.js 15
  serverExternalPackages: [],
};

export default nextConfig;
