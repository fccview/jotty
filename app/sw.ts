import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  Serwist,
  NetworkFirst,
  CacheableResponsePlugin,
  ExpirationPlugin,
  StaleWhileRevalidate,
  CacheFirst,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

const pageStrategy = new NetworkFirst({
  cacheName: "pages",
  matchOptions: { ignoreVary: true },
  networkTimeoutSeconds: 5,
  plugins: [
    new CacheableResponsePlugin({ statuses: [200] }),
    new ExpirationPlugin({
      maxEntries: 128,
      maxAgeSeconds: 30 * 24 * 60 * 60,
    }),
  ],
});

const embedPageStrategy = new StaleWhileRevalidate({
  cacheName: "embed-pages",
  plugins: [
    new CacheableResponsePlugin({ statuses: [200] }),
    new ExpirationPlugin({
      maxEntries: 32,
      maxAgeSeconds: 7 * 24 * 60 * 60,
    }),
  ],
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      matcher: ({ request, url }) =>
        request.mode === "navigate" && url.searchParams.has("embed"),
      handler: embedPageStrategy,
    },
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: pageStrategy,
    },
    {
      matcher: ({ request, sameOrigin }) =>
        request.headers.get("RSC") === "1" && sameOrigin,
      handler: pageStrategy,
    },
    {
      matcher: /\/_next\/static.+\.js$/i,
      handler: new CacheFirst({
        cacheName: "static-js",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: /\.(?:css|woff|woff2|ttf|eot|otf)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "static-assets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 128,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();
