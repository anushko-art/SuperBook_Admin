import type { NextConfig } from "next";
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Tell Next.js NOT to bundle these Node.js-only packages.
  // They are required by API routes (server-side only) and must stay external.
  serverExternalPackages: ['pg', 'pg-pool', 'bcryptjs'],

  // Allow images served from the local /uploads path and any HTTPS source
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },

  // Standalone output for Docker/self-hosted deployments.
  // Set BUILD_STANDALONE=true in the build environment to enable.
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
