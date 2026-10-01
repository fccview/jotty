export const AGENT_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
export const AGENT_SEGMENT = "agent:";

export const INVALID_AGENT =
  "Agent id must be 1-64 letters, digits, dots, dashes or underscores with no spaces, starting with a letter or digit. Jotty lowercases it";
export const SPEC_MISSING = "The board's spec note is missing or you can't read it";
export const SPEC_ENCRYPTED = "Encrypted notes can't be a board spec";
export const INVALID_SPEC_NOTE = "Spec note id must be a note uuid";

export enum SpecStatus {
  LINKED = "linked",
  NONE = "none",
  MISSING = "missing",
  ENCRYPTED = "encrypted",
}

export enum SpecSections {
  GOAL = "goal",
  ACCEPTANCE = "acceptance criteria",
  AGENTS = "agents",
  TASKS = "tasks",
  DECISIONS = "decisions",
  REFERENCES = "references",
  PROGRESS = "progress",
  BLOCKERS = "blockers",
  HANDOVER = "handover",
}

export const SECTION_MAX_CHARS = 2000;
export const ENTRY_MAX_CHARS = 600;
export const ENTRIES_MAX = 10;
export const CARDS_MAX = 25;
export const HISTORY_MAX = 5;

export const normalAgent = (raw?: string | null): string =>
  (raw ?? "").trim().toLowerCase();

export const isAgentId = (value: string): boolean => AGENT_ID_PATTERN.test(value);

export const agentRefusal = (agent: string): string | null =>
  agent && !isAgentId(agent) ? INVALID_AGENT : null;

export const unlistedAgent = (agent: string): string =>
  `${agent} isn't in the spec's Agents section, so get_task_context has no role for it. Add it there to keep the roster in step`;

export const otherTaskAgent = (agent: string, named: string): string =>
  `The spec's task line for this card names ${named}, not ${agent}. Update one of them so they agree`;
