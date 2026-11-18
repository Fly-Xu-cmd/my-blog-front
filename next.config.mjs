/** @type {import("next").NextConfig} */

const nextConfig = {
  output: 'standalone',
  // Keep the Node SDK's optional proxy/compiler integrations out of Webpack.
  serverExternalPackages: ['qiniu'],
  // Prisma selects a native engine at runtime. Include both supported Linux
  // OpenSSL targets explicitly so tracing doesn't omit the dynamic selection.
  outputFileTracingIncludes: {
    '/*': ['./node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/**/*'],
  },
  // The generated JS server and precompiled Prisma client do not compile TS.
  outputFileTracingExcludes: {
    '/*': ['**/node_modules/typescript{,/**}'],
    'next-server': ['**/node_modules/typescript{,/**}'],
  },
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
