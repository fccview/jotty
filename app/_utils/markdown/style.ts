export const stylePixels = (style: string, name: string) =>
  style.match(new RegExp(`(?:^|;|\\s)${name}:\\s*(\\d+)px`))?.[1];
