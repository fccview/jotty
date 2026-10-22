export const PINBOARD_GRID =
  "grid-cols-1 min-[500px]:grid-cols-2 min-[1072px]:grid-cols-3 min-[1292px]:grid-cols-4";

export const PINBOARD_BESIDE_TAGS_GRID =
  "grid-cols-1 min-[500px]:grid-cols-2 min-[1072px]:grid-cols-3 min-[1628px]:grid-cols-4";

const PINNED_NOTES_GRID =
  "grid-cols-1 min-[588px]:grid-cols-2 min-[1230px]:grid-cols-3 min-[1520px]:grid-cols-4";

const PINNED_LISTS_GRID =
  "grid-cols-1 min-[548px]:grid-cols-2 min-[1170px]:grid-cols-3 min-[1440px]:grid-cols-4";

const BASE_COLUMNS = /^grid-cols-(\d+)/;
const MIN_WIDTH_COLUMNS = /min-\[(\d+)px\]:grid-cols-(\d+)/g;

const masonryFromGrid = (grid: string): Record<string, number> => {
  const steps = Array.from(grid.matchAll(MIN_WIDTH_COLUMNS)).map(([, width, count]) => ({
    width: Number(width),
    count: Number(count),
  }));
  const counts = [Number(grid.match(BASE_COLUMNS)?.[1] ?? 1), ...steps.map((step) => step.count)];

  return steps.reduce<Record<string, number>>(
    (columns, step, index) => ({ ...columns, [step.width - 1]: counts[index] }),
    { default: counts[counts.length - 1] },
  );
};

export const NOTE_CARD_COLUMNS = masonryFromGrid(PINNED_NOTES_GRID);
export const LIST_CARD_COLUMNS = masonryFromGrid(PINNED_LISTS_GRID);
export const NOTE_PAGE_COLUMNS = { default: 3, 1229: 2, 587: 1 };
export const BOARD_CARD_COLUMNS = { default: 3, 1499: 2, 767: 1 };
