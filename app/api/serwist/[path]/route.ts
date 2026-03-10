import { createSerwistRoute } from "@serwist/turbopack";

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "app/sw.ts",
    useNativeEsbuild: true,
    nextConfig: {},
    maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
    globIgnores: ["flags/**"],
  });
