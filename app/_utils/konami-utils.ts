/**
 * @fccview here, I used to always add easter eggs to my websites/app growing up and since
 * I became a tech lead my job has been so serious I haven't been able to have much fun with things.
 * If you found this in the codebase... try typing ↑ ↑ ↓ ↓ ← → ← → B A and see what happens.
 *
 * Thank you for using Jotty <3
 */

export const KONAMI_CODE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

const GLYPHS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
const TASKS = new WeakMap<Node, NodeJS.Timeout>();

export const stopKonami = (node: Text) => {
  clearInterval(TASKS.get(node));
  TASKS.delete(node);
};

const _konami = (node: Text, target: string) => {
  stopKonami(node);

  let step = 0;
  const id = setInterval(() => {
    if (step++ >= 15) {
      node.textContent = target;
      stopKonami(node);
      return;
    }

    node.textContent = target
      .split("")
      .map((c) =>
        c === " " ? " " : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
      )
      .join("");
  }, 50);

  TASKS.set(node, id);
};

export const getTextNodes = (root: Node): Text[] => {
  const nodes: Text[] = [],
    walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        ["SCRIPT", "STYLE", "SVG"].includes(n.parentElement?.tagName || "")
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT,
    });
  let node;

  while ((node = walk.nextNode())) nodes.push(node as Text);
  return nodes;
};

export const startChaos = (nodes: Text[], originalMap: Map<Text, string>) => {
  const words: string[] = [];
  nodes.forEach((n) => {
    if (!originalMap.has(n)) originalMap.set(n, n.textContent || "");
    words.push(
      ...(originalMap.get(n) || "").split(/(\s+)/).filter((w) => w.trim())
    );
  });

  const pool = words.sort(() => Math.random() - 0.5);
  let i = 0;

  nodes.forEach((node) => {
    const text = originalMap.get(node) || "";
    const newText = text
      .split(/(\s+)/)
      .map((s) => (!s.trim() ? s : pool[i++] || s))
      .join("");

    _konami(node, newText);
  });
};

export const resetChaos = (originalMap: Map<Text, string>) => {
  originalMap.forEach((text, node) => {
    _konami(node, text);
  });
};
