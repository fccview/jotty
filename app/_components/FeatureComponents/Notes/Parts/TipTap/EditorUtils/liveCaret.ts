import { getDeterministicColor } from "@/app/_utils/color-utils";
import { initialsOf } from "@/app/_utils/avatar-utils";

export type AvatarOf = (username: string) => string | undefined;

type CaretUser = { name?: string };

const UNKNOWN = "?";

const tag = <K extends keyof HTMLElementTagNameMap>(name: K, className = "") => {
  const element = document.createElement(name);
  element.className = className;
  return element;
};

const caretAvatar = (name: string, avatarOf: AvatarOf) => {
  const holder = tag("span", "jotty-live-caret__avatar");
  const url = avatarOf(name);
  if (!url) {
    holder.textContent = initialsOf(name);
    return holder;
  }
  const image = tag("img");
  image.src = url;
  image.alt = "";
  holder.append(image);
  return holder;
};

export const liveCaret = (avatarOf: AvatarOf) => (user: CaretUser) => {
  const name = user.name || UNKNOWN;
  const caret = tag("span", "jotty-live-caret");
  caret.style.setProperty("--live-colour", getDeterministicColor(name));
  const flag = tag("span", "jotty-live-caret__flag rounded-jotty");
  const label = tag("span", "jotty-live-caret__name");
  label.textContent = name;
  flag.append(caretAvatar(name, avatarOf), label);
  caret.append(flag);
  return caret;
};

export const liveSelection = (user: CaretUser) => ({
  nodeName: "span",
  class: "jotty-live-selection",
  style: `background-color: ${getDeterministicColor(user.name || UNKNOWN)}33`,
});
