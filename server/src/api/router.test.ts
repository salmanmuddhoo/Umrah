import { describe, expect, it } from "vitest";
import { findRoute, matchPath, type Route } from "./router";

describe("matchPath", () => {
  it("matches literal paths", () => {
    expect(matchPath("/packages", "/packages")).toEqual({});
    expect(matchPath("/packages", "/transport")).toBeNull();
  });
  it("captures named parameters", () => {
    expect(matchPath("/bookings/:kind/:id/status", "/bookings/package/abc/status")).toEqual({ kind: "package", id: "abc" });
  });
  it("decodes parameters", () => {
    expect(matchPath("/posts/:id", "/posts/a%20b")).toEqual({ id: "a b" });
  });
  it("requires the same number of segments", () => {
    expect(matchPath("/packages/:id", "/packages")).toBeNull();
    expect(matchPath("/packages/:id", "/packages/1/book")).toBeNull();
  });
  it("ignores trailing slashes", () => {
    expect(matchPath("/packages", "/packages/")).toEqual({});
  });
});

describe("findRoute", () => {
  const routes: Route<string>[] = [
    { method: "GET", pattern: "/provider/packages", handler: "list", auth: true },
    { method: "POST", pattern: "/provider/packages", handler: "create", auth: true },
    { method: "GET", pattern: "/packages/:id", handler: "show", auth: false },
  ];

  it("picks the route for the method and path", () => {
    expect(findRoute(routes, "POST", "/provider/packages").route?.handler).toBe("create");
    const found = findRoute(routes, "GET", "/packages/xyz");
    expect(found.route?.handler).toBe("show");
    expect(found.params).toEqual({ id: "xyz" });
  });
  it("reports a known path with the wrong method, so the API can answer 405", () => {
    expect(findRoute(routes, "DELETE", "/provider/packages")).toMatchObject({ route: null, pathKnown: true });
  });
  it("reports unknown paths, so the API can answer 404", () => {
    expect(findRoute(routes, "GET", "/nope")).toMatchObject({ route: null, pathKnown: false });
  });
});
