import type { NextConfig } from "next";

// Server-side base URL of the Go backend (includes /api/v1). The browser never
// talks to it directly — requests go same-origin to /api/v1/* and are proxied
// here, which avoids CORS and keeps the backend origin private.
const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080/api/v1";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_BASE_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
