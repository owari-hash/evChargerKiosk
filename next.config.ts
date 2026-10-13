import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "the QR page" is what people call it, so /qr answers too.
  async redirects() {
    return [{ source: '/qr', destination: '/download', permanent: false }];
  },
  /* config options here */
};

export default nextConfig;
