export interface DomKit {
  parser: DOMParser;
  document: Document;
}

const LAYOUT_WHITESPACE = /^(\n\s\s|\n)$/;
const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

export const browserKit = (): DomKit => ({
  parser: new window.DOMParser(),
  document: window.document,
});

const dropLayout = (element: Element): Element => {
  Array.from(element.childNodes)
    .reverse()
    .forEach((child) => {
      if (child.nodeType === TEXT_NODE && child.nodeValue && LAYOUT_WHITESPACE.test(child.nodeValue)) {
        element.removeChild(child);
        return;
      }
      if (child.nodeType === ELEMENT_NODE) dropLayout(child as Element);
    });
  return element;
};

export const bodyFrom = (html: string, kit: DomKit): HTMLElement =>
  dropLayout(kit.parser.parseFromString(`<body>${html}</body>`, "text/html").body) as HTMLElement;
