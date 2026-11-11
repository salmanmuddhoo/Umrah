/** A tiny path router for the JSON API. No I/O here, so matching is unit-tested directly. */
export type Method = "GET" | "POST" | "PUT" | "DELETE";

export type Route<H> = { method: Method; pattern: string; handler: H; auth: boolean };

/** Matches "/packages/:id" against "/packages/abc" and returns { id: "abc" }, or null. */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const want = pattern.split("/").filter(Boolean);
  const got = path.split("/").filter(Boolean);
  if (want.length !== got.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < want.length; i++) {
    if (want[i].startsWith(":")) params[want[i].slice(1)] = decodeURIComponent(got[i]);
    else if (want[i] !== got[i]) return null;
  }
  return params;
}

/**
 * Finds the route for a request. `pathKnown` tells the caller whether to answer
 * 405 (path exists, wrong method) or 404.
 */
export function findRoute<H>(routes: Route<H>[], method: string, path: string) {
  let pathKnown = false;
  for (const route of routes) {
    const params = matchPath(route.pattern, path);
    if (!params) continue;
    pathKnown = true;
    if (route.method === method) return { route, params, pathKnown };
  }
  return { route: null, params: {}, pathKnown };
}
