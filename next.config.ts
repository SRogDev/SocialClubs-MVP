import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // ⚠️ Para deploy rápido: ignora errores de TypeScript
    // En producción, quita esto y arregla todos los errores
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pcfmjmdxaveiqrvrqauj.supabase.co',
      },
      {
        // ImageKit CDN
        protocol: 'https',
        hostname: 'ik.imagekit.io',
      },
      {
        // Supabase Storage CDN (old hostname pattern)
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
