import type { Element, ElementContent } from "hast";
import { element, hasClass, isElement, isText, type HastParent } from "./types";

const isTaskItem = (node: ElementContent) => isElement(node, "li") && hasClass(node, "task-list-item");

const checkboxOf = (node: ElementContent | undefined) =>
  isElement(node, "input") && node.properties?.type === "checkbox" ? node : null;

const trimLeading = (children: ElementContent[]) => {
  const first = children[0];
  if (isText(first)) first.value = first.value.replace(/^\s+/, "");
};

const toTaskItem = (item: Element) => {
  item.properties = { ...item.properties, "data-type": "taskItem" };
  const firstElementIndex = item.children.findIndex((child) => !isText(child) || child.value.trim());
  const first = item.children[firstElementIndex];

  if (isElement(first, "p") && checkboxOf(first.children[0])) {
    const box = checkboxOf(first.children[0])!;
    item.properties["data-checked"] = String(box.properties?.checked != null && box.properties?.checked !== false);
    first.children.shift();
    trimLeading(first.children);
    return;
  }

  const box = checkboxOf(first);
  if (!box) return;
  item.properties["data-checked"] = String(box.properties?.checked != null && box.properties?.checked !== false);
  item.children.splice(firstElementIndex, 1);
  const blockStart = item.children.findIndex(
    (child) => isElement(child) && ["ul", "ol", "p", "pre", "blockquote", "table", "div"].includes(child.tagName),
  );
  const inline = blockStart === -1 ? item.children : item.children.slice(0, blockStart);
  const rest = blockStart === -1 ? [] : item.children.slice(blockStart);
  trimLeading(inline);
  item.children = [element("p", {}, inline), ...rest];
};

const splitMixed = (list: Element): Element[] => {
  const runs: Element[] = [];
  for (const child of list.children) {
    if (!isElement(child, "li")) continue;
    const task = isTaskItem(child);
    const last = runs[runs.length - 1];
    if (last && (last.properties?.["data-type"] === "taskList") === task) {
      last.children.push(child);
      continue;
    }
    runs.push(element("ul", task ? { "data-type": "taskList" } : {}, [child]));
  }
  return runs;
};

export const splitTaskLists = (parent: HastParent) => {
  for (let index = 0; index < parent.children.length; index++) {
    const child = parent.children[index];
    if (!isElement(child, "ul") || !hasClass(child, "contains-task-list")) continue;
    child.children.forEach((item) => {
      if (isTaskItem(item)) toTaskItem(item as Element);
    });
    const runs = splitMixed(child);
    parent.children.splice(index, 1, ...runs);
    index += runs.length - 1;
  }
};
