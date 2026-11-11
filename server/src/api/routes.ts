import "server-only";
import { signToken, type SessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TOPICS, VEHICLE_LABELS, VEHICLE_TYPES } from "@/lib/constants";
import { getCommissionRates } from "@/lib/settings";
import type { Input } from "@/lib/validate";
import { checkCredentials, registerUser } from "@/services/auth";
import * as bookings from "@/services/bookings";
import * as catalog from "@/services/catalog";
import * as community from "@/services/community";
import * as provider from "@/services/provider";
import type { Method, Route } from "./router";

export type Ctx = { user: SessionUser | null; params: Record<string, string>; query: URLSearchParams; body: Input };
type AuthedCtx = Ctx & { user: SessionUser };
type Handler = (ctx: Ctx) => Promise<unknown>;

const routes: Route<Handler>[] = [];
/** A route anyone may call; `ctx.user` is set when a valid token was sent. */
const open = (method: Method, pattern: string, handler: Handler) => routes.push({ method, pattern, handler, auth: false });
/** A route that needs a signed-in user. The dispatcher answers 401 before the handler runs. */
const authed = (method: Method, pattern: string, handler: (ctx: AuthedCtx) => Promise<unknown>) =>
  routes.push({ method, pattern, handler: handler as Handler, auth: true });

const USER = { id: true, name: true, email: true, role: true, provider: true } as const;
async function session(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: USER });
  return { token: await signToken(userId), user };
}

// Accounts
open("POST", "/auth/register", async ({ body }) => session(await registerUser(body)));
open("POST", "/auth/login", async ({ body }) => session((await checkCredentials(body)).id));
authed("GET", "/me", async ({ user }) => ({ user }));

open("GET", "/meta", async () => ({
  commission: await getCommissionRates(),
  topics: TOPICS,
  vehicleTypes: VEHICLE_TYPES.map((value) => ({ value, label: VEHICLE_LABELS[value] })),
}));

// Catalogue
open("GET", "/packages", ({ query }) => catalog.listPackages(query));
open("GET", "/packages/:id", ({ params, user }) => catalog.getPackage(params.id, user));
open("GET", "/transport", ({ query }) => catalog.listServices(query));
open("GET", "/transport/:id", ({ params, user }) => catalog.getService(params.id, user));

// Bookings
authed("POST", "/packages/:id/book", ({ user, params, body }) => bookings.bookPackage(user, params.id, body));
authed("POST", "/transport/:id/book", ({ user, params, body }) => bookings.bookTransport(user, params.id, body));
authed("GET", "/bookings", ({ user }) => bookings.myBookings(user));
authed("POST", "/bookings/:kind/:id/status", ({ user, params, body }) =>
  bookings.setBookingStatus(user, params.kind, params.id, String(body.to ?? "")),
);

// Community
open("GET", "/posts", ({ user, query }) => community.listPosts(user, query));
open("GET", "/posts/:id", ({ user, params }) => community.getPost(user, params.id));
authed("POST", "/posts", ({ user, body }) => community.createPost(user, body));
authed("DELETE", "/posts/:id", ({ user, params }) => community.deletePost(user, params.id));
authed("POST", "/posts/:id/comments", ({ user, params, body }) => community.addComment(user, params.id, body));
authed("POST", "/posts/:id/vote", ({ user, params, body }) => community.vote(user, params.id, Number(body.value)));
authed("DELETE", "/comments/:id", ({ user, params }) => community.deleteComment(user, params.id));

// Provider back office
authed("GET", "/provider", ({ user }) => provider.dashboard(user));
authed("PUT", "/provider", ({ user, body }) => provider.updateProfile(user, body));
authed("GET", "/provider/bookings", ({ user }) => provider.providerBookings(user));
authed("GET", "/provider/packages", ({ user }) => provider.myPackages(user));
authed("POST", "/provider/packages", ({ user, body }) => provider.savePackage(user, null, body));
authed("PUT", "/provider/packages/:id", ({ user, params, body }) => provider.savePackage(user, params.id, body));
authed("DELETE", "/provider/packages/:id", ({ user, params }) => provider.deletePackage(user, params.id));
authed("GET", "/provider/services", ({ user }) => provider.myServices(user));
authed("POST", "/provider/services", ({ user, body }) => provider.saveService(user, null, body));
authed("PUT", "/provider/services/:id", ({ user, params, body }) => provider.saveService(user, params.id, body));
authed("DELETE", "/provider/services/:id", ({ user, params }) => provider.deleteService(user, params.id));

export { routes };
