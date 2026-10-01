export const cardKey = (boardUuid: string, cardId: string): string =>
  cardId.startsWith(`${boardUuid}-`) ? cardId.slice(boardUuid.length + 1) : cardId;

export const isCardRef = (boardUuid: string, cardId: string, ref: string): boolean => {
  const wanted = ref.trim().toLowerCase();
  return cardId.toLowerCase() === wanted || cardKey(boardUuid, cardId).toLowerCase() === wanted;
};
