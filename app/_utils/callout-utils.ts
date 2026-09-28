import { CALLOUT_ALIASES, CALLOUT_MARKER, CalloutType } from "@/app/_consts/callouts";

export interface CalloutMatch {
  type: CalloutType;
  marker: string;
}

export const matchCallout = (text: string): CalloutMatch | null => {
  const match = text.match(CALLOUT_MARKER);
  if (!match) return null;
  return { type: CALLOUT_ALIASES[match[1].toLowerCase()], marker: match[0] };
};
