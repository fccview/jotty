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

const LINK_ID = "prism-theme-stylesheet";
const THEME_ATTR = "data-prism-theme";

let holders = 0;

export const usePrismTheme = (theme: string) => {
  useEffect(() => {
    const removeAllThemeStyles = () => {
      const existingLink = document.getElementById(LINK_ID);
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

    holders += 1;

    if (document.getElementById(LINK_ID)?.getAttribute(THEME_ATTR) !== theme) {
      removeAllThemeStyles();

      const link = document.createElement("link");
      link.id = LINK_ID;
      link.rel = "stylesheet";
      link.type = "text/css";
      link.setAttribute(THEME_ATTR, theme);
      link.href = `/api/prism-theme?theme=${theme}`;
      document.head.appendChild(link);
    }

    return () => {
      holders -= 1;
      if (holders === 0) removeAllThemeStyles();
    };
  }, [theme]);
};
