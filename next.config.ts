import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'isinaliza.vtexassets.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      }
    ],
    // Mantém domains para compatibilidade
    domains: ['lh3.googleusercontent.com', 'res.cloudinary.com', 'isinaliza.vtexassets.com', 'images.unsplash.com']
  },
  // Configuração para lidar com módulos Node.js no cliente
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Resolver módulos Node.js para o cliente
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        child_process: false,
        module: false,
        async_hooks: false,
        process: false,
      }
    }
    return config
  },
  // Configuração para pacotes externos do servidor
  serverExternalPackages: ['@prisma/client', 'bcryptjs']
}

export default nextConfig
