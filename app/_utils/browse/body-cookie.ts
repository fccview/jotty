import { BodyCookie, NOTE_BODIES_COOKIE } from "@/app/_consts/browse";
import { ViewMode } from "@/app/_consts/view-modes";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

interface BodySettings {
  showMarkdownPreview: boolean;
  viewMode: ViewMode;
  isDesktop: boolean;
}

export const bodyNeedOf = ({ showMarkdownPreview, viewMode, isDesktop }: BodySettings): BodyCookie => {
  if (viewMode === ViewMode.CARD && showMarkdownPreview) return BodyCookie.ON;
  if (viewMode === ViewMode.LIST && isDesktop) return BodyCookie.SELECTED;
  return BodyCookie.OFF;
};

export const isBodyCookie = (value: unknown): value is BodyCookie =>
  Object.values(BodyCookie).some((cookie) => cookie === value);

const cookieValue = (): string | undefined =>
  document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${NOTE_BODIES_COOKIE}=`))
    ?.slice(NOTE_BODIES_COOKIE.length + 1);

export const syncBodyCookie = (need: BodyCookie) => {
  if (typeof document === "undefined") return;
  if (cookieValue() === need) return;
  document.cookie = `${NOTE_BODIES_COOKIE}=${need}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
};
