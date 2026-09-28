export interface TextSlice {
  content: string;
  contentLength: number;
  nextOffset?: number;
}

export const sliceText = (text: string, offset: number, limit?: number): TextSlice => {
  const end = limit === undefined ? text.length : offset + limit;
  return {
    content: text.slice(offset, end),
    contentLength: text.length,
    ...(end < text.length && { nextOffset: end }),
  };
};
