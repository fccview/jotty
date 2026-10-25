import type { DomHook } from "./hooks";

const CHECKBOX = 'input[type="checkbox"]';

const boxOf = (item: Element) => {
  const first = item.firstElementChild;
  if (first?.matches(CHECKBOX)) return first;
  const nested = first?.tagName === "P" ? first.firstElementChild : null;
  return nested?.matches(CHECKBOX) ? nested : null;
};

const tickItem = (item: Element) => {
  const box = boxOf(item);
  if (!box) return;
  item.setAttribute("data-type", "taskItem");
  item.setAttribute("data-checked", String(box.hasAttribute("checked")));
  box.remove();
};

const unordered = (list: Element) => {
  if (list.tagName === "UL") return list;
  const bullets = list.ownerDocument.createElement("ul");
  bullets.append(...Array.from(list.childNodes));
  list.replaceWith(bullets);
  return bullets;
};

export const tickTasks: DomHook = (doc) =>
  doc.querySelectorAll("ul, ol").forEach((list) => {
    const items = Array.from(list.children).filter((child) => child.tagName === "LI");
    if (!items.length || !items.every(boxOf)) return;
    unordered(list).setAttribute("data-type", "taskList");
    items.forEach(tickItem);
  });
