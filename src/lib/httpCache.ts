import { NextResponse } from "next/server";

export const CACHE_CONTROL = {
  NO_STORE: "no-store",
  PUBLIC_FEED: "public, s-maxage=120, stale-while-revalidate=600",
  PUBLIC_LIST: "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
  PUBLIC_SETTINGS: "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
} as const;

function setVaryAcceptEncoding(headers: Headers) {
  const current = headers.get("Vary");
  if (!current) {
    headers.set("Vary", "Accept-Encoding");
    return;
  }

  const values = current
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (!values.includes("accept-encoding")) {
    headers.set("Vary", `${current}, Accept-Encoding`);
  }
}

export function withCacheControl(
  init: ResponseInit | undefined,
  cacheControl: string,
  varyAcceptEncoding = false
): ResponseInit {
  const headers = new Headers(init?.headers);
  headers.set("cache-control", cacheControl);

  if (varyAcceptEncoding) {
    setVaryAcceptEncoding(headers);
  }

  return {
    ...init,
    headers,
  };
}

export function noStoreJson<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, withCacheControl(init, CACHE_CONTROL.NO_STORE));
}

export function publicCachedJson<T>(body: T, cacheControl: string, init?: ResponseInit) {
  return NextResponse.json(body, withCacheControl(init, cacheControl, true));
}

export function applyCacheControl(
  response: NextResponse,
  cacheControl: string,
  varyAcceptEncoding = false
) {
  response.headers.set("cache-control", cacheControl);
  if (varyAcceptEncoding) {
    setVaryAcceptEncoding(response.headers);
  }
  return response;
}
