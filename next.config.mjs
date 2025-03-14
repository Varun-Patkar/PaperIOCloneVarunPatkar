/** @type {import('next').NextConfig} */
const nextConfig = {
	typescript: {
		// Ignore TypeScript errors
		ignoreBuildErrors: true,
	},
	eslint: {
		// Ignore ESLint errors
		ignoreDuringBuilds: true,
	},
};

export default nextConfig;
