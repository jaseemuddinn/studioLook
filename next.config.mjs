/** @type {import('next').NextConfig} */
const nextConfig = {
    // Reduce warnings for NextAuth.js with MongoDB
    serverExternalPackages: ['@auth/mongodb-adapter', 'mongodb'],

    // ESLint configuration for builds
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: false, // Set to true if you want to completely skip ESLint during builds
    },
};

export default nextConfig;
