import { withSerwist } from "@serwist/turbopack";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

const maxBodySize = "1gb";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["ws", "libsodium-wrappers-sumo"],
  experimental: {
    // https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions
    serverActions: {
      bodySizeLimit: maxBodySize,
    },
    // https://nextjs.org/docs/app/api-reference/config/next-config-js/proxyClientMaxBodySize
    proxyClientMaxBodySize: maxBodySize,
  },
  allowedDevOrigins: ['192.168.86.233'],
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif|woff|woff2|css|js)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default withSerwist(withNextIntl(nextConfig));
