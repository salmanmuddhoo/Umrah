import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { inDays, makePackage, makeProvider, makeService, makeUser, resetDb } from "../../test/factories";
import * as catalog from "./catalog";

const q = (s = "") => new URLSearchParams(s);

describe("listPackages", () => {
  beforeEach(resetDb);

  it("shows only open, upcoming packages from approved providers", async () => {
    const approved = await makeProvider("UMRAH");
    await makePackage(approved, { title: "Visible" });
    await makePackage(approved, { title: "Hidden", active: false });
    await makePackage(approved, { title: "Departed", departureDate: inDays(-2) });
    await makePackage(await makeProvider("UMRAH", "PENDING"), { title: "Unapproved" });
    await makePackage(await makeProvider("UMRAH", "SUSPENDED"), { title: "Suspended" });

    expect((await catalog.listPackages(q())).map((p) => p.title)).toEqual(["Visible"]);
  });

  it("filters by search text, price and hotel rating", async () => {
    const owner = await makeProvider("UMRAH");
    await makePackage(owner, { title: "Budget", departureCity: "Toronto", priceCents: 90_000, hotelStars: 3 });
    await makePackage(owner, { title: "Premium", departureCity: "London", priceCents: 400_000, hotelStars: 5 });

    expect((await catalog.listPackages(q("q=Toronto"))).map((p) => p.title)).toEqual(["Budget"]);
    expect((await catalog.listPackages(q("max=1000"))).map((p) => p.title)).toEqual(["Budget"]);
    expect((await catalog.listPackages(q("stars=5"))).map((p) => p.title)).toEqual(["Premium"]);
    expect((await catalog.listPackages(q("sort=price-desc"))).map((p) => p.title)).toEqual(["Premium", "Budget"]);
  });

  it("reports seats left, ignoring cancelled bookings", async () => {
    const pkg = await makePackage(await makeProvider("UMRAH"), { seatsTotal: 10 });
    const pilgrim = await makeUser();
    const booking = (travellers: number, status: string) =>
      db.packageBooking.create({ data: { packageId: pkg.id, userId: pilgrim.id, travellers, contactPhone: "+1 555 0100", totalCents: 1, commissionCents: 0, status } });
    await booking(3, "CONFIRMED");
    await booking(2, "PENDING");
    await booking(4, "CANCELLED");
    expect((await catalog.listPackages(q()))[0].seatsLeft).toBe(5);
  });

  it("never leaks the provider's private contact details", async () => {
    await makePackage(await makeProvider("UMRAH"));
    const [pkg] = await catalog.listPackages(q());
    expect(pkg.provider).not.toHaveProperty("phone");
    expect(pkg.provider).not.toHaveProperty("userId");
  });
});

describe("getPackage", () => {
  beforeEach(resetDb);

  it("lets the owner and admins preview a hidden package, but nobody else", async () => {
    const owner = await makeProvider("UMRAH", "PENDING");
    const pkg = await makePackage(owner);
    expect((await catalog.getPackage(pkg.id, owner)).isPublic).toBe(false);
    expect((await catalog.getPackage(pkg.id, await makeUser("ADMIN"))).isPublic).toBe(false);
    await expect(catalog.getPackage(pkg.id, null)).rejects.toMatchObject({ status: 404 });
    await expect(catalog.getPackage(pkg.id, await makeProvider("UMRAH"))).rejects.toMatchObject({ status: 404 });
  });

  it("flags packages that have already departed", async () => {
    const owner = await makeProvider("UMRAH");
    const past = await makePackage(owner, { departureDate: inDays(-1) });
    const future = await makePackage(owner);
    expect((await catalog.getPackage(past.id, null)).departed).toBe(true);
    expect((await catalog.getPackage(future.id, null)).departed).toBe(false);
  });

  it("returns 404 for unknown ids", async () => {
    await expect(catalog.getPackage("missing", null)).rejects.toMatchObject({ status: 404 });
  });
});

describe("listServices", () => {
  beforeEach(resetDb);

  it("filters by vehicle type and passenger count, cheapest first", async () => {
    const owner = await makeProvider("TRANSPORT");
    await makeService(owner, { title: "Sedan", vehicleType: "SEDAN", capacity: 4, priceCents: 7_500 });
    await makeService(owner, { title: "Coach", vehicleType: "BUS", capacity: 50, priceCents: 42_000 });
    await makeService(owner, { title: "SUV", vehicleType: "SUV", capacity: 7, priceCents: 21_000 });

    expect((await catalog.listServices(q())).map((s) => s.title)).toEqual(["Sedan", "SUV", "Coach"]);
    expect((await catalog.listServices(q("type=BUS"))).map((s) => s.title)).toEqual(["Coach"]);
    expect((await catalog.listServices(q("pax=6"))).map((s) => s.title)).toEqual(["SUV", "Coach"]);
  });

  it("hides services from unapproved providers", async () => {
    await makeService(await makeProvider("TRANSPORT", "PENDING"));
    expect(await catalog.listServices(q())).toEqual([]);
  });
});
