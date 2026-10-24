import { IMAGE_MIME_BY_EXT } from "./files";

export const ATTACHMENTS_FOLDER = "attachments";
export const AVATARS_FOLDER = "avatars";
export const ATTACHMENT_ROUTE = "/api/attachment";
export const AVATAR_ROUTE = "/api/avatar";
export const ATTACHMENTS_PATH = "/attachments";
export const AVATAR_VERSION_PARAM = "v";
export const ATTACHMENT_NAME_MAX = 180;
export const ATTACHMENT_NAME_BYTES = 255;
export const ATTACHMENT_FALLBACK_NAME = "file";
export const ATTACHMENT_PAGE_SIZE = 60;

export enum AttachmentKinds {
  IMAGE = "image",
  VIDEO = "video",
  FILE = "file",
}

export enum AttachmentErrors {
  UNAUTHENTICATED = "attachments.errors.unauthenticated",
  NO_FILE = "attachments.errors.noFile",
  TOO_LARGE = "attachments.errors.tooLarge",
  NOT_FOUND = "attachments.errors.notFound",
  DENIED = "attachments.errors.denied",
  BAD_NAME = "attachments.errors.badName",
  NOT_IMAGE = "attachments.errors.notImage",
  FAILED = "attachments.errors.failed",
}

const ATTACHMENT_ERRORS = new Set<string>(Object.values(AttachmentErrors));

export const isAttachmentError = (error: string | undefined): error is AttachmentErrors =>
  Boolean(error && ATTACHMENT_ERRORS.has(error));

export const LEGACY_ROUTES: Record<AttachmentKinds, string> = {
  [AttachmentKinds.IMAGE]: "/api/image",
  [AttachmentKinds.VIDEO]: "/api/video",
  [AttachmentKinds.FILE]: "/api/file",
};

export const LEGACY_DIRS: Record<AttachmentKinds, string> = {
  [AttachmentKinds.IMAGE]: "images",
  [AttachmentKinds.VIDEO]: "videos",
  [AttachmentKinds.FILE]: "files",
};

export const RETIRED_PUBLIC_ENV: Record<AttachmentKinds, string> = {
  [AttachmentKinds.IMAGE]: "SERVE_PUBLIC_IMAGES",
  [AttachmentKinds.VIDEO]: "SERVE_PUBLIC_VIDEOS",
  [AttachmentKinds.FILE]: "SERVE_PUBLIC_FILES",
};

export const VIDEO_MIME_BY_EXT: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".ogv": "video/ogg",
  ".m4v": "video/mp4",
};

export const ATTACHMENT_MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".csv": "text/csv",
  ".json": "application/json",
  ".zip": "application/zip",
  ".rar": "application/x-rar-compressed",
  ".7z": "application/x-7z-compressed",
  ".tar": "application/x-tar",
  ".gz": "application/gzip",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".iso": "application/x-iso9660-image",
  ".dmg": "application/x-apple-diskimage",
  ...VIDEO_MIME_BY_EXT,
  ...IMAGE_MIME_BY_EXT,
};

export const INLINE_MIME_PREFIXES = ["image/", "video/", "audio/"];
export const INLINE_MIMES = ["application/pdf", "text/plain", "text/markdown", "text/csv"];
export const SVG_MIME = "image/svg+xml";
export const SVG_POLICY = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
export const OCTET_STREAM = "application/octet-stream";

export const extOf = (name: string): string => {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot).toLowerCase() : "";
};

export const mimeOf = (name: string): string =>
  ATTACHMENT_MIME_BY_EXT[extOf(name)] || OCTET_STREAM;

export const kindOf = (mimeType: string): AttachmentKinds => {
  if (mimeType.startsWith("image/")) return AttachmentKinds.IMAGE;
  if (mimeType.startsWith("video/")) return AttachmentKinds.VIDEO;
  return AttachmentKinds.FILE;
};

const _encodeName = (name: string): string =>
  encodeURIComponent(name).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

export const attachmentUrl = (itemUuid: string, name: string): string =>
  `${ATTACHMENT_ROUTE}/${itemUuid.toLowerCase()}/${_encodeName(name)}`;

export const avatarUrl = (userUuid: string, version: number): string =>
  `${AVATAR_ROUTE}/${userUuid.toLowerCase()}?${AVATAR_VERSION_PARAM}=${version}`;

export const isLegacyUrl = (url: string | undefined): boolean =>
  Boolean(url) && Object.values(LEGACY_ROUTES).some((route) => url!.includes(`${route}/`));

export const ownsAvatar = (url: string | undefined, userUuid: string): boolean =>
  Boolean(url?.startsWith(`${AVATAR_ROUTE}/${userUuid}?`));

export const shortUuid = (uuid: string): string => uuid.slice(0, 8);

const _lastSegment = (url: string): string => {
  const segment = url.split(/[?#]/)[0].split("/").pop() || "";
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

export const urlKind = (url: string): AttachmentKinds => {
  const legacy = (Object.keys(LEGACY_ROUTES) as AttachmentKinds[]).find((kind) =>
    url.includes(`${LEGACY_ROUTES[kind]}/`),
  );
  return legacy ?? kindOf(mimeOf(_lastSegment(url)));
};
