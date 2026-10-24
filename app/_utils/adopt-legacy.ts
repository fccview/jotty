import { adoptRefs } from "@/app/_server/actions/attachments";
import { scanAttachments, scanLegacy, swapRefs } from "@/app/_utils/legacy-refs";

export const withAdoptedAttachments = async (
  itemUuid: string,
  markdown: string,
): Promise<string> => {
  const origins = [window.location.origin];
  const target = itemUuid.toLowerCase();
  const refs = [
    ...(scanLegacy(markdown, origins)?.refs ?? []),
    ...scanAttachments(markdown, origins).filter((ref) => ref.item !== target),
  ];
  if (!refs.length) return markdown;

  const result = await adoptRefs(itemUuid, refs.map((ref) => ref.url));
  if (!result.success || !result.data) {
    console.warn("Attachments from elsewhere stayed where they were:", result.error);
    return markdown;
  }

  const moved = result.data;
  const swaps = refs
    .filter((ref) => moved[ref.url])
    .map((ref) => ({ ref, url: moved[ref.url] }));

  return swaps.length ? swapRefs(markdown, swaps) : markdown;
};
