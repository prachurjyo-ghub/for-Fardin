import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  async rewrites() {
    const apiOrigin = process.env.API_INTERNAL_URL?.replace(/\/$/, "");
    return apiOrigin
      ? [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }]
      : [];
  },
};

export default nextConfig;
