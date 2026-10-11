const FALLBACK = {
  primary: "rgb(139, 59, 208)",
  primaryForeground: "rgb(255, 255, 255)",
  foreground: "rgb(20, 20, 20)",
  soft: "rgb(243, 240, 249)",
  background: "rgb(255, 255, 255)",
};

const FALLBACK_FONT = "sans-serif";
const RGB_TRIPLE = /^\d+\s+\d+\s+\d+$/;

let queue: Promise<unknown> = Promise.resolve();
let renderCount = 0;

const cssColor = (variable: string, light: boolean, fallback: string) => {
  if (light || typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  if (!value) return fallback;
  return RGB_TRIPLE.test(value) ? `rgb(${value.replace(/\s+/g, ", ")})` : value;
};

const bodyFont = () =>
  typeof window === "undefined" ? FALLBACK_FONT : getComputedStyle(document.body).fontFamily || FALLBACK_FONT;

const themeVariables = (light: boolean) => {
  const primary = cssColor("--primary", light, FALLBACK.primary);
  const foreground = cssColor("--foreground", light, FALLBACK.foreground);
  const background = cssColor("--background", light, FALLBACK.background);
  const muted = cssColor("--muted", light, FALLBACK.soft);
  return {
    fontFamily: bodyFont(),
    primaryColor: primary,
    primaryTextColor: cssColor("--primary-foreground", light, FALLBACK.primaryForeground),
    primaryBorderColor: foreground,
    lineColor: primary,
    secondaryColor: cssColor("--secondary", light, FALLBACK.soft),
    tertiaryColor: muted,
    background,
    mainBkg: background,
    secondBkg: muted,
    tertiaryBkg: cssColor("--accent", light, FALLBACK.soft),
    textColor: foreground,
    border1: foreground,
    border2: foreground,
    nodeBorder: foreground,
    clusterBkg: muted,
    clusterBorder: foreground,
    defaultLinkColor: primary,
    titleColor: foreground,
    edgeLabelBackground: background,
    nodeTextColor: foreground,
  };
};

export const normalizeMermaid = (code: string): string =>
  code.replace(/^(\s*)sankey(\s)/m, "$1sankey-beta$2");

const removeLeftovers = (id: string) => {
  document.getElementById(id)?.remove();
  document.getElementById(`d${id}`)?.remove();
};

const draw = async (code: string, light: boolean) => {
  const { default: mermaid } = await import("mermaid");
  mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    securityLevel: "strict",
    themeVariables: themeVariables(light),
  });
  const source = normalizeMermaid(code);
  await mermaid.parse(source);
  renderCount += 1;
  const id = `jotty-mermaid-${renderCount}`;
  try {
    const { svg } = await mermaid.render(id, source);
    return svg;
  } finally {
    removeLeftovers(id);
  }
};

export const renderMermaid = (code: string, light = false): Promise<string> => {
  const job = queue.then(() => draw(code, light));
  queue = job.catch(() => undefined);
  return job;
};

export const mermaidErrorText = (error: unknown) =>
  error instanceof Error ? error.message : String(error ?? "");
