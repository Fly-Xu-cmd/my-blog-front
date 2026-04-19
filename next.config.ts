import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https", // 如果你有 https，这里写 https
        hostname: "image.xylxf.xyz",
        port: "", // 如果没有特殊端口就留空
        pathname: "/**", // 允许该域名下的所有路径
      },
    ],
  },
};

export default nextConfig;
