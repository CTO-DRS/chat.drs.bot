import type { NextConfig } from "next";

const basePath = process.env.IS_DEMO === "1" ? "/demo" : "";

const nextConfig: NextConfig = {
  // Enable `DOCKER_BUILD=1 next build` to emit .next/standalone for Docker
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" as const } : {}),
  ...(basePath
    ? {
        assetPrefix: "/demo-assets",
        basePath,
        redirects: async () => [
          {
            basePath: false,
            destination: basePath,
            permanent: false,
            source: "/",
          },
        ],
      }
    : {}),
  cacheComponents: true,
  devIndicators: false,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  experimental: {
    appNewScrollHandler: true,
    cachedNavigations: true,
    inlineCss: true,
    prefetchInlining: true,
    turbopackFileSystemCacheForDev: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
    ],
  },
  logging: {
    fetches: {
      fullUrl: false,
    },
    incomingRequests: false,
  },
  poweredByHeader: false,
  // React Compiler disabled: memory-hungry on constrained (4GB) environments
  // and caused OOM kills during Turbopack compilation.
  reactCompiler: false,
};

export default nextConfig;
