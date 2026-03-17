import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http", // 如果你有 https，这里写 https
        hostname: "xylxf.xyz",
        port: "", // 如果没有特殊端口就留空
        pathname: "/**", // 允许该域名下的所有路径
      },
      // 如果你同时用 blog.xylxf.xyz，也要加上
      {
        protocol: "http",
        hostname: "blog.xylxf.xyz",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
