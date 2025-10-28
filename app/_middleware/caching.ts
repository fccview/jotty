import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function setCacheHeaders(
  response: NextResponse,
  isPublicResource: boolean = false
) {
  if (isPublicResource) {
    response.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );
  } else {
    response.headers.set(
      "Cache-Control",
      "private, max-age=3600, must-revalidate"
    );
  }
  return response;
}

export function withCacheControl(
  handler: Function,
  isPublicResource: boolean = false
) {
  return async (request: NextRequest, ...args: any[]) => {
    const response = await handler(request, ...args);
    return setCacheHeaders(response, isPublicResource);
  };
}
