import type { DomHook } from "./hooks";

const LINKED_ATTRS = ["href", "src"];
const HAS_SCHEME = /^[a-z][a-z\d+.-]*:/i;

const absolute = (value: string, baseUrl: string) => {
  if (!value.trim() || HAS_SCHEME.test(value)) return value;
  try {
    return new URL(value, baseUrl).href;
  } catch (error) {
    console.warn(`Could not resolve "${value}" against ${baseUrl}:`, error);
    return value;
  }
};

export const rebaseLinks = (baseUrl: string): DomHook => (doc) =>
  LINKED_ATTRS.forEach((name) =>
    doc.querySelectorAll(`[${name}]`).forEach((element) => {
      element.setAttribute(name, absolute(element.getAttribute(name) ?? "", baseUrl));
    }),
  );
