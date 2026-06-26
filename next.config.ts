import path from "node:path";
import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(process.cwd()),
  ...(isGitHubPages
    ? {
        output: "export",
        basePath: "/diabetes-prescription-calculator",
        assetPrefix: "/diabetes-prescription-calculator/",
        images: {
          unoptimized: true,
        },
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
