import { isAgentId, normalAgent } from "@/app/_consts/agents";
import { AssigneeKinds, AssigneePick, BoardPerson } from "@/app/_types/kanban-assignee";

export const MAX_PEOPLE_SHOWN = 8;

export interface AssigneeOption {
  pick: AssigneePick;
  person?: BoardPerson;
  disabled: boolean;
}

export interface AssigneeChoices {
  options: AssigneeOption[];
  invalidAgent: boolean;
}

export const assigneeChoices = (
  people: BoardPerson[],
  query: string,
  canShare: boolean,
): AssigneeChoices => {
  const needle = query.trim().toLowerCase();
  const exact = people.some((person) => person.username.toLowerCase() === needle);
  const agent = exact ? "" : normalAgent(query);
  const agentOk = !!agent && isAgentId(agent);

  const matches = people
    .filter((person) => person.username.toLowerCase().includes(needle))
    .slice(0, MAX_PEOPLE_SHOWN)
    .map((person) => ({
      pick: { kind: AssigneeKinds.USER, name: person.username },
      person,
      disabled: !person.hasAccess && !canShare,
    }));

  return {
    options: [
      ...(needle ? [] : [{ pick: { kind: AssigneeKinds.NONE, name: "" }, disabled: false }]),
      ...matches,
      ...(agentOk ? [{ pick: { kind: AssigneeKinds.AGENT, name: agent }, disabled: false }] : []),
    ],
    invalidAgent: !!agent && !agentOk,
  };
};
