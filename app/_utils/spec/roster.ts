import { isAgentId, normalAgent } from "@/app/_consts/agents";
import { AgentRole } from "@/app/_types/agents";
import { isCardRef } from "@/app/_utils/kanban/card-keys";

export interface SpecTask {
  cardId: string;
  line: string;
  dependsOn: string[];
  agent?: string;
}

const BULLET = /^[-*+]\s+(.*)$/;
const TICKED = /`([^`]+)`/;
const TICKED_ALL = /`([^`]+)`/g;
const DEPENDS_ON = /depends on/i;
const AGENT_REF = /\bagent\s+`([^`]+)`/i;
const AGENT_REFS = new RegExp(AGENT_REF.source, "gi");
const ROLE_LEAD = /^[\s*_]*[-:]?\s*/;
const EDGE_MARKS = /^[*_]+|[*_:,]+$/g;

const _topItems = (section?: string): string[] =>
  (section ?? "")
    .split(/\r?\n/)
    .map((line) => line.match(BULLET)?.[1]?.trim() ?? "")
    .filter(Boolean);

const _agentFrom = (text: string): AgentRole | null => {
  const ticked = text.match(TICKED);
  const token = ticked ? ticked[1] : text.split(/\s+/)[0];
  const id = normalAgent(token.replace(EDGE_MARKS, ""));
  if (!isAgentId(id)) return null;

  const tokenEnd = ticked
    ? (ticked.index ?? 0) + ticked[0].length
    : text.indexOf(token) + token.length;

  return { id, role: text.slice(tokenEnd).replace(ROLE_LEAD, "").trim() };
};

export const specAgents = (section?: string): AgentRole[] =>
  _topItems(section).reduce<AgentRole[]>((agents, text) => {
    const agent = _agentFrom(text);
    if (agent && !agents.some((known) => known.id === agent.id)) agents.push(agent);
    return agents;
  }, []);

const _taskFrom = (text: string): SpecTask | null => {
  const ticked = text.match(TICKED);
  if (!ticked) return null;

  const agentRef = text.match(AGENT_REF);
  const dependsAt = text.search(DEPENDS_ON);
  const dependsText = dependsAt < 0 ? "" : text.slice(dependsAt).replace(AGENT_REFS, "");

  return {
    cardId: ticked[1].trim(),
    line: text,
    dependsOn: Array.from(dependsText.matchAll(TICKED_ALL))
      .map((match) => match[1].trim())
      .filter(Boolean),
    ...(agentRef && { agent: normalAgent(agentRef[1]) }),
  };
};

export const specTasks = (section?: string): SpecTask[] =>
  _topItems(section)
    .map(_taskFrom)
    .filter((task): task is SpecTask => task !== null);

export const taskFor = (tasks: SpecTask[], boardUuid: string, cardId: string): SpecTask | undefined =>
  tasks.find((task) => isCardRef(boardUuid, cardId, task.cardId));
