import type { PublicTheme, ThemeVariables } from "@/app/_types/theme";

const STYLE_BREAKOUT = /</g;
const CSS_LESS_THAN = "\\3c ";

const _rule = (variables: ThemeVariables) =>
  `:root:root{${Object.entries(variables)
    .map(([name, value]) => `${name}:${value};`)
    .join("")}}`;

export const OwnerTheme = ({ theme: { variables, darkVariables } }: { theme: PublicTheme }) => (
  <style
    dangerouslySetInnerHTML={{
      __html: (darkVariables
        ? `${_rule(variables)}@media (prefers-color-scheme: dark){${_rule(darkVariables)}}`
        : _rule(variables)
      ).replace(STYLE_BREAKOUT, CSS_LESS_THAN),
    }}
  />
);
