export const AUTOSAVE_DEFAULT_MS = 5000;

export enum SaveState {
  IDLE = "idle",
  SAVING = "saving",
  SAVED = "saved",
  FAILED = "failed",
}

interface SaveQueueOptions<T> {
  save: (value: T) => Promise<boolean>;
  onState: (state: SaveState) => void;
}

export const createSaveQueue = <T>({ save, onState }: SaveQueueOptions<T>) => {
  let pending: { value: T } | null = null;
  let running: Promise<boolean> | null = null;

  const attempt = async (value: T) => {
    try {
      return await save(value);
    } catch (error) {
      console.error("[autosave] save failed:", error);
      return false;
    }
  };

  const drain = async () => {
    while (pending) {
      const { value } = pending;
      pending = null;
      onState(SaveState.SAVING);
      if (!(await attempt(value))) {
        pending ??= { value };
        onState(SaveState.FAILED);
        return false;
      }
    }
    onState(SaveState.SAVED);
    return true;
  };

  const start = () => {
    running ??= drain().finally(() => {
      running = null;
    });
    return running;
  };

  const push = (value: T) => {
    pending = { value };
    void start();
  };

  const flush = async () => {
    while (running || pending) {
      if (!(await start())) return false;
    }
    return true;
  };

  const reset = () => {
    pending = null;
  };

  return { push, flush, reset };
};

export type SaveQueue<T> = ReturnType<typeof createSaveQueue<T>>;
