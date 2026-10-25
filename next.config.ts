import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "the QR page" is what people call it, so /qr answers too.
  async redirects() {
    return [
      { source: '/qr', destination: '/download', permanent: false },
      { source: '/download/app', destination: '/app', permanent: false },
    ];
  },
  // The default bottom-left spot sits under the map's own bottom-left
  // controls (results pill, locate button) during local dev — dev-only, but
  // out of the way is one less thing to mistake for a real UI bug.
  devIndicators: {
    position: 'top-right',
  },
};

export default nextConfig;
