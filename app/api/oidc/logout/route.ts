import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL || request.nextUrl.origin;

  if (process.env.SSO_MODE && process.env.SSO_MODE?.toLowerCase() !== "oidc") {
    if (process.env.DEBUGGER) {
      console.log("SSO LOGOUT - ssoMode is not oidc");
    }

    return NextResponse.redirect(`${appUrl}/auth/login`);
  }

  const issuer = process.env.OIDC_ISSUER || "";
  if (!issuer) {
    if (process.env.DEBUGGER) {
      console.log("SSO LOGOUT - issuer is not set");
    }

    return NextResponse.redirect(`${appUrl}/auth/login`);
  }

  const discoveryUrl = issuer.endsWith("/")
    ? `${issuer}.well-known/openid-configuration`
    : `${issuer}/.well-known/openid-configuration`;
  const discoveryRes = await fetch(discoveryUrl, { cache: "no-store" });
  if (!discoveryRes.ok) {
    if (process.env.DEBUGGER) {
      console.log("SSO LOGOUT - discoveryUrl is not ok", discoveryRes);
    }

    return NextResponse.redirect(`${appUrl}/`);
  }
  const discovery = (await discoveryRes.json()) as {
    end_session_endpoint?: string;
  };
  const endSession = discovery.end_session_endpoint;
  const postLogoutRedirect = `${appUrl}/`;

  if (!endSession) {
    return NextResponse.redirect(`${appUrl}/`);
  }

  const url = new URL(endSession);
  url.searchParams.set("post_logout_redirect_uri", postLogoutRedirect);
  return NextResponse.redirect(url);
}
