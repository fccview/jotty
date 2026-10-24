import { defaultUrlTransform } from "react-markdown";

const DIALABLE_PROTOCOL = /^(tel|sms):/i;

export const noteUrlTransform = (url: string): string =>
  DIALABLE_PROTOCOL.test(url) ? url : defaultUrlTransform(url);
