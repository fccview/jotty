export const PWA_INSTALLED_KEY = "pwa-installed";

export const PWA_DISMISSED_KEY = "pwa-prompt-dismissed";

export const isFirefoxAndroid = (userAgent?: string): boolean => {
  const ua =
    userAgent ?? (typeof navigator === "undefined" ? "" : navigator.userAgent);
  return /android/i.test(ua) && /firefox|fxios/i.test(ua);
};
