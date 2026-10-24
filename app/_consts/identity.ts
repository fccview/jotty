export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: string): boolean => UUID_REGEX.test(value);

export const PATH_UUID_NAMESPACE = "3170b6d3-f27c-4d18-b640-d52e20c2790a";

export enum StampRefusals {
  EMPTY = "empty",
  UNPARSABLE = "unparsable",
  FOREIGN_UUID = "foreignUuid",
}
