/** @type {import('next').NextConfig} */
const nextConfig = {
    // Reduce warnings for NextAuth.js with MongoDB
    serverExternalPackages: ['@auth/mongodb-adapter', 'mongodb']
};

export default nextConfig;
