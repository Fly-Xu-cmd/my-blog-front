/** @type {import("next").NextConfig} */

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.xylxf.xyz",
        port: "",
        pathname: "/**",
      },
    ],
  },
  /**
   * 永久重定向旧的 /frontend/* 路径到根路径
   * 解决 Google Search Console "重复网页"和"网页会自动重定向"问题
   */
  async redirects() {
    return [
      {
        source: "/frontend",
        destination: "/",
        permanent: true,
      },
      {
        source: "/frontend/:path*",
        destination: "/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
