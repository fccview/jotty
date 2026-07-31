export const BORDER_RADIUS_VAR = "--jotty-radius";
export const ADMIN_BORDER_RADIUS_VAR = "--jotty-radius-admin";

export const DEFAULT_BORDER_RADIUS = 0.25;
export const MIN_BORDER_RADIUS = 0;
export const MAX_BORDER_RADIUS = 2;
export const BORDER_RADIUS_STEP = 0.05;

export const clampRadius = (value?: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_BORDER_RADIUS;
  }
  return Math.min(MAX_BORDER_RADIUS, Math.max(MIN_BORDER_RADIUS, value));
};

export const radiusToRem = (value?: number): string =>
  `${clampRadius(value)}rem`;
