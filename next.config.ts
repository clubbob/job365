import type { NextConfig } from 'next';

const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const nextConfig: NextConfig = {
  distDir: process.env.JOB365_NEXT_DIST_DIR || '.next',
  serverExternalPackages: ['firebase-admin', 'jspdf', 'html2canvas'],
  async rewrites() {
    if (!firebaseProjectId) return [];

    const firebaseOrigin = `https://${firebaseProjectId}.firebaseapp.com`;
    return [
      {
        source: '/__/auth/:path*',
        destination: `${firebaseOrigin}/__/auth/:path*`,
      },
      {
        source: '/__/firebase/:path*',
        destination: `${firebaseOrigin}/__/firebase/:path*`,
      },
    ];
  },
};

export default nextConfig;
