const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: false,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    // Enabled for production - React Hook warnings are non-critical
    ignoreDuringBuilds: false,
  },
  experimental: {
    serverComponentsExternalPackages: ['@ai-sdk/openai', '@ai-sdk/anthropic', '@ai-sdk/google', '@ai-sdk/groq'],
    instrumentationHook: true,
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@/components': path.resolve(__dirname, 'components'),
      '@/lib': path.resolve(__dirname, 'lib'),
      '@/types': path.resolve(__dirname, 'types'),
      '@/app': path.resolve(__dirname, 'app')
    }

    // Add extension resolution to help with module loading
    config.resolve.extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', ...config.resolve.extensions]
    
    // Ensure modules are resolved correctly
    config.resolve.modules = ['node_modules', __dirname]
    
    return config
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    // Expose VERCEL_ENV to client-side for production detection
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV,
  },
}

module.exports = nextConfig
