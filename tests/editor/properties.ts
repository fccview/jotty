import { expect } from "vitest";
import { freshSave, reloadedJson, unchangedSave } from "./harness";
import type { NodeJson } from "@/app/_utils/markdown/serialize/types";
import type { TableSyntax } from "@/app/_types";

export const normalise = (markdown: string) => markdown.replace(/\r\n?/g, "\n");

export const expectStable = (markdown: string, tableSyntax?: TableSyntax) => {
  const fresh = freshSave(markdown, tableSyntax);
  expect(freshSave(fresh, tableSyntax), "fresh save drifts on a second save").toBe(fresh);
  expect(reloadedJson(fresh), "reloading the fresh save changes the document").toEqual(reloadedJson(markdown));
  return fresh;
};

export const expectRoundtrip = (markdown: string, tableSyntax?: TableSyntax) => {
  expect(unchangedSave(markdown, tableSyntax), "unchanged save is not byte identical").toBe(normalise(markdown));
  return expectStable(markdown, tableSyntax);
};

export const blocks = (json: NodeJson) => json.content ?? [];

export const blockTypes = (json: NodeJson) => blocks(json).map((node) => node.type);

export const findAll = (json: NodeJson, type: string): NodeJson[] => [
  ...(json.type === type ? [json] : []),
  ...(json.content ?? []).flatMap((child) => findAll(child, type)),
];

export const findOne = (json: NodeJson, type: string) => {
  const [found] = findAll(json, type);
  expect(found, `expected a ${type} node`).toBeDefined();
  return found;
};

export const textOf = (json: NodeJson): string =>
  json.text ?? (json.content ?? []).map(textOf).join("");

export const markTypes = (json: NodeJson) =>
  findAll(json, "text").flatMap((node) => (node.marks ?? []).map((mark) => mark.type));
