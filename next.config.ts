import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The server runs the traced bundle under systemd; see scripts/deploy.
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
