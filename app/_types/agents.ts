import { SpecStatus } from "@/app/_consts/agents";
import { StatusChange } from "./checklist";

export interface AgentRole {
  id: string;
  role: string;
}

export interface BoardAgents {
  specNote: string | null;
  status: SpecStatus;
  agents: AgentRole[];
}

export interface PinnedSpec extends BoardAgents {
  boardId: string;
}

export interface ContextStatus {
  id: string;
  label: string;
  order: number;
  count: number;
}

export interface ContextChild {
  id: string;
  text: string;
  status: string;
  completed: boolean;
  agent?: string;
}

export interface ContextCard {
  id: string;
  text: string;
  description?: string;
  status: string;
  statusLabel: string;
  completed: boolean;
  agent?: string;
  assignee?: string;
  priority?: string;
  score?: number;
  targetDate?: string;
  parentId?: string;
  children: ContextChild[];
  history: StatusChange[];
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

export interface OpenTask {
  itemId: string;
  text: string;
  status: string;
}

export interface ContextAgent {
  id: string;
  indexed: boolean;
  role?: string;
  openTasks: OpenTask[];
}

export interface ContextDependency {
  itemId: string;
  found: boolean;
  text?: string;
  status?: string;
  completed?: boolean;
}

export interface ContextSpecNote {
  id: string;
  title: string;
  category: string;
  owner?: string;
  updatedAt: string;
  contentLength: number;
}

export interface ContextSpec {
  status: SpecStatus;
  note?: ContextSpecNote;
  goal?: string;
  acceptance?: string;
  decisions?: string;
  references?: string;
  agents: AgentRole[];
  task?: { line: string; dependsOn: string[]; agent?: string };
  progress: string[];
  blockers: string[];
  handover: string[];
  truncated: boolean;
}

export interface TaskContext {
  board: {
    id: string;
    title: string;
    category: string;
    owner?: string;
    statuses: ContextStatus[];
    specNote: string | null;
  };
  card: ContextCard;
  agent: ContextAgent | null;
  dependencies: ContextDependency[];
  spec: ContextSpec;
}

export interface AgentTask {
  boardId: string;
  boardTitle: string;
  specNote: string | null;
  itemId: string;
  parentId?: string;
  text: string;
  status: string;
  statusLabel: string;
  completed: boolean;
  agent: string;
  assignee?: string;
  priority?: string;
  lastModifiedAt?: string;
}

export interface AgentTaskFilter {
  agent?: string;
  boardId?: string;
  statuses?: string[];
  includeCompleted?: boolean;
}
