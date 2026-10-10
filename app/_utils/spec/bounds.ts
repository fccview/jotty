export interface Snipper {
  text: (value: string | undefined, max: number) => string | undefined;
  rows: <T>(rows: T[], max: number) => T[];
  tail: <T>(rows: T[], max: number) => T[];
  wasCut: () => boolean;
}

export const snipper = (): Snipper => {
  let cut = false;

  return {
    text: (value, max) => {
      if (value === undefined || value.length <= max) return value;
      cut = true;
      return value.slice(0, max);
    },
    rows: (rows, max) => {
      if (rows.length > max) cut = true;
      return rows.slice(0, max);
    },
    tail: (rows, max) => {
      if (rows.length > max) cut = true;
      return rows.slice(Math.max(rows.length - max, 0));
    },
    wasCut: () => cut,
  };
};
