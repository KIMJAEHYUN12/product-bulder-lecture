import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  reactCompiler: true,
  trailingSlash: true,
  turbopack: {
    root: "/home/user/ovision/simplystock/simplystock",
  },
};

export default nextConfig;
