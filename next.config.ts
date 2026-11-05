import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/landing/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }];
  },
  async redirects() {
    return [
      { source: "/program", destination: "/", permanent: true },
      { source: "/program/:path+", destination: "/:path+", permanent: true },
    ];
  },
};

export default nextConfig;
