import fs from "fs/promises";
import { createReadStream } from "fs";
import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import {
  INLINE_MIMES,
  INLINE_MIME_PREFIXES,
  SVG_MIME,
  SVG_POLICY,
  mimeOf,
} from "@/app/_consts/attachments";

export enum CachePolicies {
  PRIVATE = "private, max-age=0, must-revalidate",
  PUBLIC_BRIEF = "public, max-age=300",
  PUBLIC_FOREVER = "public, max-age=31536000, immutable",
}

const RANGE = /^bytes=(\d*)-(\d*)$/;

interface Span {
  start: number;
  end: number;
}

export const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const _disposition = (name: string, mime: string): string => {
  const inline =
    INLINE_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix)) ||
    INLINE_MIMES.includes(mime);
  const ascii = name.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
};

const _span = (header: string | null, size: number): Span | null | false => {
  if (!header) return null;
  const match = RANGE.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return false;

  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;

  return start <= end && start < size ? { start, end } : false;
};

const _stream = (filePath: string, span?: Span): ReadableStream =>
  Readable.toWeb(createReadStream(filePath, span)) as ReadableStream;

export const sendFile = async (
  request: NextRequest,
  filePath: string,
  name: string,
  cache: CachePolicies,
): Promise<NextResponse> => {
  let stats;
  try {
    stats = await fs.lstat(filePath);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!stats.isFile()) return new NextResponse("Not found", { status: 404 });

  const mime = mimeOf(name);
  const etag = `"${stats.ino.toString(36)}-${stats.size.toString(36)}-${Math.floor(stats.mtimeMs).toString(36)}"`;
  const headers = new Headers({
    "Content-Type": mime,
    "Content-Disposition": _disposition(name, mime),
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": cache,
    "Accept-Ranges": "bytes",
    ETag: etag,
    "Last-Modified": stats.mtime.toUTCString(),
  });
  if (mime === SVG_MIME) headers.set("Content-Security-Policy", SVG_POLICY);

  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers });
  }

  const span = _span(request.headers.get("range"), stats.size);
  if (span === false) {
    headers.set("Content-Range", `bytes */${stats.size}`);
    return new NextResponse("Range Not Satisfiable", { status: 416, headers });
  }

  if (!span) {
    headers.set("Content-Length", String(stats.size));
    return new NextResponse(_stream(filePath), { status: 200, headers });
  }

  headers.set("Content-Range", `bytes ${span.start}-${span.end}/${stats.size}`);
  headers.set("Content-Length", String(span.end - span.start + 1));
  return new NextResponse(_stream(filePath, span), { status: 206, headers });
};
