import { SpecSections } from "@/app/_consts/agents";

export type SpecText = Partial<Record<SpecSections, string>>;

const FENCE = /^\s*(```|~~~)/;
const HEADING = /^(#{1,2})\s+(.*?)\s*#*\s*$/;
const LINE_BREAK = /\r?\n/;
const LIST_START = /^([-*+]|\d+[.)])\s+/;
const INDENTED = /^\s+\S/;
const SECTION_NAMES: string[] = Object.values(SpecSections);

const _sectionOf = (title: string): SpecSections | undefined => {
  const name = title.trim().toLowerCase();
  return SECTION_NAMES.includes(name) ? (name as SpecSections) : undefined;
};

export const specSections = (content: string): SpecText => {
  const found = new Map<SpecSections, string[]>();
  let current: SpecSections | undefined;
  let fenced = false;

  content.split(LINE_BREAK).forEach((line) => {
    if (FENCE.test(line)) fenced = !fenced;
    const heading = fenced ? null : line.match(HEADING);

    if (heading) {
      current = heading[1].length === 2 ? _sectionOf(heading[2]) : undefined;
      if (current && !found.has(current)) found.set(current, []);
      return;
    }

    if (current) found.get(current)?.push(line);
  });

  return Object.fromEntries(
    Array.from(found.entries()).map(([name, lines]) => [name, lines.join("\n").trim()]),
  );
};

export const specEntries = (section?: string): string[] => {
  const entries: string[] = [];
  let lines: string[] = [];
  let inList = false;

  const flush = () => {
    const text = lines.join("\n").trim();
    if (text) entries.push(text);
    lines = [];
    inList = false;
  };

  (section ?? "").split(LINE_BREAK).forEach((line) => {
    if (!line.trim()) {
      if (!inList) flush();
      return;
    }

    if (LIST_START.test(line)) {
      flush();
      lines = [line];
      inList = true;
      return;
    }

    const continues = lines.length > 0 && (!inList || INDENTED.test(line));
    if (!continues) flush();
    lines.push(line);
  });

  flush();
  return entries;
};

const _escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const mentions = (entry: string, needle: string): boolean =>
  !!needle &&
  new RegExp(`(?<![a-z0-9_.-])${_escape(needle)}(?![a-z0-9_-]|\\.[a-z0-9])`, "i").test(entry);
