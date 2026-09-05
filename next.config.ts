import type { NextConfig } from 'next';

const repository = 'UIDSimulator';
const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';
const nextConfig: NextConfig = {
  output: 'export',
  basePath: isGitHubPages ? `/${repository}` : '',
  assetPrefix: isGitHubPages ? `/${repository}/` : '',
  images: { unoptimized: true },
};

export default nextConfig;
