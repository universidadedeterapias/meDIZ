function r2RemotePatterns() {
  const url = process.env.R2_PUBLIC_URL?.trim();
  if (!url) return [];
  try {
    const { hostname } = new URL(url);
    return [{ protocol: 'https', hostname, pathname: '/**' }];
  } catch {
    return [];
  }
}

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
  // Output standalone para Docker
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      ...r2RemotePatterns(),
      ...(process.env.NEXT_PUBLIC_LIBRARY_MEDIA_HOSTNAME
        ? [
            {
              protocol: 'https',
              hostname: process.env.NEXT_PUBLIC_LIBRARY_MEDIA_HOSTNAME,
              pathname: '/**',
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
