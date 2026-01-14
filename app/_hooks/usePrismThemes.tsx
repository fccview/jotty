import { useEffect } from "react";

const THEME_NAMES = [
  "prism",
  "prism-dark",
  "prism-funky",
  "prism-okaidia",
  "prism-tomorrow",
  "prism-twilight",
  "prism-coy",
  "prism-solarizedlight",
];

export const usePrismTheme = (theme: string) => {
  useEffect(() => {
    const linkId = "prism-theme-stylesheet";

    const removeAllThemeStyles = () => {
      const existingLink = document.getElementById(linkId);
      if (existingLink) existingLink.remove();

      document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
        const href = link.getAttribute("href") || "";
        if (
          (href.includes("prismjs/themes/") ||
            href.includes("/api/prism-theme")) &&
          THEME_NAMES.some(
            (name) => href.includes(name) || href.includes(`theme=${name}`)
          )
        ) {
          link.remove();
        }
      });

      document.querySelectorAll("style").forEach((style) => {
        if (
          THEME_NAMES.some((name) =>
            style.textContent?.includes(`prismjs/themes/${name}`)
          )
        ) {
          style.remove();
        }
      });
    };

    removeAllThemeStyles();

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.type = "text/css";
    link.setAttribute("data-prism-theme", theme);
    link.href = `/api/prism-theme?theme=${theme}`;
    document.head.appendChild(link);

    return () => removeAllThemeStyles();
  }, [theme]);
};
