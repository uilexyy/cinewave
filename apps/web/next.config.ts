import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@cinewave/shared",
    "@cinewave/types",
    "@cinewave/validation",
    "@cinewave/api-client",
    "@cinewave/config",
    "@prisma/client",
  ],
};

export default nextConfig;
