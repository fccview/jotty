import { describe, it, expect } from "vitest";
import { generateWebManifest } from "@/app/_utils/global-utils";
import { isFirefoxAndroid } from "@/app/_utils/pwa-utils";

const baseManifest = () =>
  JSON.parse(
    generateWebManifest(
      "jotty·page",
      "A simple, fast, and lightweight checklist and notes application",
      "/app-icons/favicon-16x16.png",
      "/app-icons/favicon-32x32.png",
      "/app-icons/apple-touch-icon.png",
      "/app-icons/android-chrome-512x512.png",
      "/app-icons/android-chrome-192x192.png",
      "#0c1435",
      "1.30.0",
    ),
  );

describe("generateWebManifest firefox installability", () => {
  it("exposes an installable identity", () => {
    const manifest = baseManifest();
    expect(manifest.name).toBe("jotty·page");
    expect(manifest.short_name).toBe("jotty·page");
    expect(manifest.id).toBe("/");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
  });

  it("leaves orientation open for phones and tablets", () => {
    expect(baseManifest().orientation).toBe("any");
  });

  it("ships separate any and maskable icons at 192 and 512", () => {
    const icons: { sizes: string; purpose?: string }[] = baseManifest().icons;
    const pairs = icons.map((icon) => `${icon.sizes}:${icon.purpose}`);
    expect(pairs).toEqual(
      expect.arrayContaining([
        "192x192:any",
        "192x192:maskable",
        "512x512:any",
        "512x512:maskable",
      ]),
    );
    expect(pairs).not.toContain("192x192:any maskable");
    expect(pairs).not.toContain("512x512:any maskable");
  });
});

describe("isFirefoxAndroid", () => {
  it("matches Firefox on Android", () => {
    expect(
      isFirefoxAndroid(
        "Mozilla/5.0 (Android 14; Mobile; rv:126.0) Gecko/126.0 Firefox/126.0",
      ),
    ).toBe(true);
  });

  it("refuses desktop Firefox and Android Chrome", () => {
    expect(
      isFirefoxAndroid(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
      ),
    ).toBe(false);
    expect(
      isFirefoxAndroid(
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36",
      ),
    ).toBe(false);
  });
});
