export const EXIT_CLASS_ATTR = "data-exit-class";

const LIVE_MEDIA = "iframe, video, audio, object, embed";

export const ghostOut = (node: HTMLElement, durationMs: number) => {
  const host = node.parentNode;
  if (!host || !node.isConnected) return;

  const ghost = node.cloneNode(true) as HTMLElement;
  ghost.querySelectorAll(LIVE_MEDIA).forEach((media) => media.remove());
  ghost.setAttribute("aria-hidden", "true");
  ghost.setAttribute("inert", "");
  ghost.style.pointerEvents = "none";
  host.appendChild(ghost);
  ghost.getBoundingClientRect();

  requestAnimationFrame(() => {
    ghost.querySelectorAll<HTMLElement>(`[${EXIT_CLASS_ATTR}]`).forEach((part) => {
      part.className = part.getAttribute(EXIT_CLASS_ATTR) || part.className;
    });
  });
  setTimeout(() => ghost.remove(), durationMs);
};
