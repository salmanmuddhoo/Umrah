import { getApiUser } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import type { Input } from "@/lib/validate";
import { findRoute } from "@/api/router";
import { routes } from "@/api/routes";

// The API authenticates with Bearer tokens, never cookies, so allowing any origin is safe.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

const json = (status: number, data: unknown) => Response.json(data, { status, headers: CORS });

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/** Every /api/v1/* request lands here and is dispatched through the route table in src/api/routes.ts. */
async function dispatch(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const path = "/" + (await params).path.join("/");
  const { route, params: pathParams, pathKnown } = findRoute(routes, req.method, path);
  if (!route) return json(pathKnown ? 405 : 404, { error: pathKnown ? "Method not allowed." : "Not found." });

  try {
    const user = await getApiUser(req);
    if (route.auth && !user) return json(401, { error: "Please sign in to continue." });

    let body: Input = {};
    if (req.method !== "GET" && req.method !== "DELETE") {
      const parsed = await req.json().catch(() => null);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        return json(400, { error: "The request body must be a JSON object." });
      }
      body = parsed as Input;
    }

    const data = await route.handler({ user, params: pathParams, query: new URL(req.url).searchParams, body });
    return json(200, data);
  } catch (err) {
    if (err instanceof ApiError) return json(err.status, { error: err.message });
    console.error(`API ${req.method} ${path} failed`, err);
    return json(500, { error: "Something went wrong. Please try again." });
  }
}

export { dispatch as GET, dispatch as POST, dispatch as PUT, dispatch as DELETE };
