import { Item } from "@/app/_types";
import { ContextSpec } from "@/app/_types/agents";
import {
  ENTRIES_MAX,
  ENTRY_MAX_CHARS,
  SECTION_MAX_CHARS,
  SpecSections,
  SpecStatus,
} from "@/app/_consts/agents";
import { Snipper } from "@/app/_utils/spec/bounds";
import { mentions, specEntries } from "@/app/_utils/spec/sections";
import { SpecTask } from "@/app/_utils/spec/roster";
import { SpecRead } from "./spec";

const _closed = (status: SpecStatus): ContextSpec => ({
  status,
  agents: [],
  progress: [],
  blockers: [],
  handover: [],
  truncated: false,
});

export const specView = (
  spec: SpecRead,
  item: Item,
  task: SpecTask | undefined,
  snip: Snipper,
): ContextSpec => {
  if (spec.status !== SpecStatus.LINKED) return _closed(spec.status);

  const { sections } = spec;
  const needles = [item.id, item.agent].filter((needle): needle is string => !!needle);

  const whole = (name: SpecSections) => snip.text(sections[name] || undefined, SECTION_MAX_CHARS);

  const picked = (name: SpecSections) =>
    snip
      .tail(
        specEntries(sections[name]).filter((entry) =>
          needles.some((needle) => mentions(entry, needle)),
        ),
        ENTRIES_MAX,
      )
      .map((entry) => snip.text(entry, ENTRY_MAX_CHARS) ?? "");

  return {
    status: spec.status,
    ...(spec.note && { note: spec.note }),
    goal: whole(SpecSections.GOAL),
    acceptance: whole(SpecSections.ACCEPTANCE),
    decisions: whole(SpecSections.DECISIONS),
    references: whole(SpecSections.REFERENCES),
    agents: spec.agents,
    ...(task && {
      task: {
        line: snip.text(task.line, ENTRY_MAX_CHARS) ?? "",
        dependsOn: task.dependsOn,
        ...(task.agent && { agent: task.agent }),
      },
    }),
    progress: picked(SpecSections.PROGRESS),
    blockers: picked(SpecSections.BLOCKERS),
    handover: picked(SpecSections.HANDOVER),
    truncated: false,
  };
};
