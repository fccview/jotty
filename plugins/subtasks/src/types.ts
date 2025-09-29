export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface SubtasksPluginData {
  subtasks: Subtask[];
  labels: string[];
  expanded: boolean;
}

export interface ItemWithSubtasks {
  id: string;
  text: string;
  completed: boolean;
  pluginData?: {
    'subtasks-and-labels'?: SubtasksPluginData;
    [key: string]: any;
  };
  [key: string]: any;
}