export enum ThemeMode {
  FIXED = "fixed",
  SYSTEM = "system",
}

export type ThemeVariables = Record<string, string>;

export interface EffectiveTheme {
  id: string;
  name: string;
  mode: ThemeMode;
  variables: ThemeVariables;
  darkVariables: ThemeVariables | null;
  radius: string | null;
  customCss: boolean;
}

export interface PublicTheme {
  variables: ThemeVariables;
  darkVariables: ThemeVariables | null;
}
