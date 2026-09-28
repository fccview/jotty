import { refreshItems, settleRelations } from "./indexer";
import { flushRelationsWatch } from "./watcher";

export const freshRelations = async (uuids: string[] = []): Promise<void> => {
  try {
    await flushRelationsWatch();
    await settleRelations();
    await refreshItems(uuids);
  } catch (error) {
    console.error("Relations could not catch up before answering:", error);
  }
};
