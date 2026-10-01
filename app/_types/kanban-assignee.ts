export enum AssigneeKinds {
  NONE = "none",
  USER = "user",
  AGENT = "agent",
}

export interface BoardPerson {
  username: string;
  avatarUrl?: string;
  hasAccess: boolean;
}

export interface AssigneePick {
  kind: AssigneeKinds;
  name: string;
}
