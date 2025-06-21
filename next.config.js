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
    ignoreDuringBuilds: false,
  },
  experimental: {
    serverComponentsExternalPackages: ['@ai-sdk/openai', '@ai-sdk/anthropic', '@ai-sdk/google'],
  },
  webpack: (config, { isServer }) => {
    // Ensure proper module resolution for Vercel deployment
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': __dirname,
    }
    
    // Add extension resolution to help with module loading
    config.resolve.extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', ...config.resolve.extensions]
    
    // Ensure modules are resolved correctly
    config.resolve.modules = ['node_modules', __dirname]
    
    // Force resolve specific problematic modules
    config.resolve.alias['../../../lib/ai-providers'] = require('path').resolve(__dirname, 'lib/ai-providers')
    config.resolve.alias['../../../lib/rate-limit'] = require('path').resolve(__dirname, 'lib/rate-limit.ts')
    config.resolve.alias['../../../lib/utils'] = require('path').resolve(__dirname, 'lib/utils.ts')
    config.resolve.alias['../../../types/consensus'] = require('path').resolve(__dirname, 'types/consensus.ts')
    
    return config
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
}

module.exports = nextConfig
