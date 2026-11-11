import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { inDays, makePackage, makeProvider, makeService, resetDb } from "../../test/factories";
import * as ads from "./ads";

const form = { advertiser: "Noor Travel", headline: "Ramadan Umrah from $1,450", body: "Flights and visa included.", cta: "See package", theme: "gold", active: "on" };

describe("readAd", () => {
  it("accepts a valid form and defaults the button label", () => {
    const { data, error } = ads.readAd({ ...form, cta: "" });
    expect(error).toBeNull();
    expect(data).toMatchObject({ advertiser: "Noor Travel", cta: "View", theme: "gold", active: true, packageId: null, serviceId: null });
  });

  it("reads the link target", () => {
    expect(ads.readAd({ ...form, target: "package:abc" }).data).toMatchObject({ packageId: "abc", serviceId: null });
    expect(ads.readAd({ ...form, target: "service:xyz" }).data).toMatchObject({ packageId: null, serviceId: "xyz" });
    expect(ads.readAd({ ...form, target: "user:1" }).data).toMatchObject({ packageId: null, serviceId: null });
  });

  it("runs an ad through the end of its last day", () => {
    const { data } = ads.readAd({ ...form, startsAt: "2031-03-01", endsAt: "2031-03-01" });
    expect(data.startsAt?.toISOString()).toBe("2031-03-01T00:00:00.000Z");
    expect(data.endsAt?.toISOString()).toBe("2031-03-01T23:59:59.999Z");
  });

  it.each([
    [{ advertiser: "" }, /advertiser/],
    [{ headline: "Hi" }, /headline/],
    [{ theme: "pink" }, /colour/],
    [{ startsAt: "soon" }, /valid calendar days/],
    [{ startsAt: "2031-03-10", endsAt: "2031-03-01" }, /before the start/],
  ])("rejects %j", (patch, message) => {
    expect(ads.readAd({ ...form, ...patch }).error).toMatch(message);
  });
});

describe("activeAds", () => {
  beforeEach(resetDb);
  const ad = (overrides: Record<string, unknown> = {}) => db.ad.create({ data: { advertiser: "Noor Travel", headline: "An advert", ...overrides } });

  it("shows only ads that are switched on and inside their dates", async () => {
    await ad({ headline: "Running" });
    await ad({ headline: "Open-ended start", endsAt: inDays(3) });
    await ad({ headline: "Switched off", active: false });
    await ad({ headline: "Not started", startsAt: inDays(2) });
    await ad({ headline: "Finished", endsAt: inDays(-1) });
    expect((await ads.activeAds()).map((a) => a.headline).sort()).toEqual(["Open-ended start", "Running"]);
  });

  it("links to the advertised listing while it is public", async () => {
    const pkg = await makePackage(await makeProvider("UMRAH"));
    const service = await makeService(await makeProvider("TRANSPORT"));
    await ad({ headline: "Package ad", packageId: pkg.id });
    await ad({ headline: "Service ad", serviceId: service.id });
    const list = await ads.activeAds();
    expect(list.find((a) => a.headline === "Package ad")).toMatchObject({ packageId: pkg.id, serviceId: null });
    expect(list.find((a) => a.headline === "Service ad")).toMatchObject({ serviceId: service.id, packageId: null });
  });

  it("drops the link, but keeps the ad, when the listing is hidden or its provider is not approved", async () => {
    const hidden = await makePackage(await makeProvider("UMRAH"), { active: false });
    const suspended = await makePackage(await makeProvider("UMRAH", "SUSPENDED"));
    await ad({ packageId: hidden.id });
    await ad({ packageId: suspended.id });
    expect((await ads.activeAds()).map((a) => a.packageId)).toEqual([null, null]);
  });

  it("keeps the ad when its listing is deleted", async () => {
    const pkg = await makePackage(await makeProvider("UMRAH"));
    await ad({ packageId: pkg.id });
    await db.package.delete({ where: { id: pkg.id } });
    expect(await ads.activeAds()).toEqual([expect.objectContaining({ packageId: null })]);
  });

  it("does not expose click counts or scheduling to the app", async () => {
    await ad();
    const [shown] = await ads.activeAds();
    expect(Object.keys(shown).sort()).toEqual(["advertiser", "body", "cta", "headline", "id", "packageId", "serviceId", "theme"]);
  });
});

describe("recordClick / createAd", () => {
  beforeEach(resetDb);

  it("counts taps", async () => {
    const created = await ads.createAd(form);
    await ads.recordClick(created.id);
    await ads.recordClick(created.id);
    expect((await db.ad.findUniqueOrThrow({ where: { id: created.id } })).clicks).toBe(2);
    await expect(ads.recordClick("missing")).rejects.toMatchObject({ status: 404 });
  });

  it("refuses a link to a listing that does not exist", async () => {
    await expect(ads.createAd({ ...form, target: "package:missing" })).rejects.toMatchObject({ status: 400 });
    await expect(ads.createAd({ ...form, headline: "" })).rejects.toMatchObject({ status: 400 });
    expect(await db.ad.count()).toBe(0);
  });
});
