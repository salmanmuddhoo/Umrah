import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { makePackage, makeProvider, makeService, makeUser, packageForm, resetDb, serviceForm } from "../../test/factories";
import * as provider from "./provider";

describe("readPackage", () => {
  it("accepts a valid form and converts the price to cents", () => {
    const { data, error } = provider.readPackage(packageForm);
    expect(error).toBeNull();
    expect(data.priceCents).toBe(145_000);
    expect(data.departureDate?.toISOString()).toBe("2031-03-01T00:00:00.000Z");
    expect(data.incVisa).toBe(true);
    expect(data.incFlights).toBe(false);
  });
  it("treats a blank Madinah stay as zero nights", () => {
    const { data, error } = provider.readPackage({ ...packageForm, madinahHotel: "", madinahNights: "" });
    expect(error).toBeNull();
    expect(data.madinahNights).toBe(0);
  });
  it.each([
    [{ title: "Hi" }, /title/],
    [{ description: "too short" }, /Describe/],
    [{ departureDate: "next week" }, /departure date/],
    [{ durationDays: "0" }, /Duration/],
    [{ makkahNights: "8", madinahNights: "4" }, /cannot exceed/],
    [{ madinahHotel: "" }, /Madinah hotel/],
    [{ hotelStars: "6" }, /stars/],
    [{ price: "0" }, /price/],
    [{ price: "abc" }, /price/],
    [{ seatsTotal: "0" }, /seats/],
  ])("rejects %j", (patch, message) => {
    expect(provider.readPackage({ ...packageForm, ...patch }).error).toMatch(message);
  });
});

describe("readService", () => {
  it("accepts a valid form", () => {
    const { data, error } = provider.readService(serviceForm);
    expect(error).toBeNull();
    expect(data.priceCents).toBe(7_550);
  });
  it.each([
    [{ title: "Cab" }, /title/],
    [{ vehicleType: "HELICOPTER" }, /vehicle type/],
    [{ capacity: "0" }, /Capacity/],
    [{ toPlace: "" }, /starts and ends/],
    [{ price: "" }, /price/],
  ])("rejects %j", (patch, message) => {
    expect(provider.readService({ ...serviceForm, ...patch }).error).toMatch(message);
  });
});

describe("provider back office", () => {
  beforeEach(resetDb);

  it("refuses non-providers", async () => {
    const pilgrim = await makeUser();
    await expect(provider.dashboard(pilgrim)).rejects.toMatchObject({ status: 403 });
  });

  it("keeps Umrah and transport providers out of each other's listings", async () => {
    const umrah = await makeProvider("UMRAH");
    const transport = await makeProvider("TRANSPORT");
    await expect(provider.saveService(umrah, null, serviceForm)).rejects.toMatchObject({ status: 403 });
    await expect(provider.savePackage(transport, null, packageForm)).rejects.toMatchObject({ status: 403 });
  });

  it("creates and updates a package", async () => {
    const owner = await makeProvider("UMRAH");
    const created = await provider.savePackage(owner, null, packageForm);
    const updated = await provider.savePackage(owner, created.id, { ...packageForm, price: "1200" });
    expect(updated.priceCents).toBe(120_000);
    expect(await provider.myPackages(owner)).toHaveLength(1);
  });

  it("returns validation errors as 400s", async () => {
    const owner = await makeProvider("UMRAH");
    const err = await provider.savePackage(owner, null, { ...packageForm, price: "-1" }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
  });

  it("does not let one provider edit or delete another's package", async () => {
    const owner = await makeProvider("UMRAH");
    const rival = await makeProvider("UMRAH");
    const pkg = await makePackage(owner);
    await expect(provider.savePackage(rival, pkg.id, packageForm)).rejects.toMatchObject({ status: 404 });
    await expect(provider.deletePackage(rival, pkg.id)).rejects.toMatchObject({ status: 404 });
    expect((await db.package.findUnique({ where: { id: pkg.id } }))?.title).toBe("Test package");
  });

  it("hides rather than deletes a package that has open bookings", async () => {
    const owner = await makeProvider("UMRAH");
    const pilgrim = await makeUser();
    const pkg = await makePackage(owner);
    await db.packageBooking.create({
      data: { packageId: pkg.id, userId: pilgrim.id, travellers: 1, contactPhone: "+1 555 0100", totalCents: 100_000, commissionCents: 8_000 },
    });
    expect(await provider.deletePackage(owner, pkg.id)).toEqual({ deleted: false, hidden: true });
    expect((await db.package.findUnique({ where: { id: pkg.id } }))?.active).toBe(false);
  });

  it("deletes a package with no open bookings", async () => {
    const owner = await makeProvider("UMRAH");
    const pkg = await makePackage(owner);
    expect(await provider.deletePackage(owner, pkg.id)).toEqual({ deleted: true, hidden: false });
    expect(await db.package.findUnique({ where: { id: pkg.id } })).toBeNull();
  });

  it("reports earnings net of commission, counting only confirmed and completed bookings", async () => {
    const owner = await makeProvider("UMRAH");
    const pilgrim = await makeUser();
    const pkg = await makePackage(owner);
    const booking = (status: string) =>
      db.packageBooking.create({
        data: { packageId: pkg.id, userId: pilgrim.id, travellers: 1, contactPhone: "+1 555 0100", totalCents: 100_000, commissionCents: 8_000, status },
      });
    await Promise.all([booking("CONFIRMED"), booking("COMPLETED"), booking("PENDING"), booking("CANCELLED")]);

    const { stats, commissionRate } = await provider.dashboard(owner);
    expect(commissionRate).toBe(8);
    expect(stats).toEqual({ listings: 1, pending: 1, confirmed: 2, grossCents: 200_000, commissionCents: 16_000, netCents: 184_000 });
  });

  it("lists bookings for transport providers with the customer's contact details", async () => {
    const owner = await makeProvider("TRANSPORT");
    const pilgrim = await makeUser();
    const service = await makeService(owner);
    await db.transportBooking.create({
      data: { serviceId: service.id, userId: pilgrim.id, pickupAt: new Date("2031-01-01T10:00:00Z"), pickupLocation: "Terminal 1", passengers: 2, contactPhone: "+1 555 0100", totalCents: 8_000, commissionCents: 800 },
    });
    const rows = await provider.providerBookings(owner);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "transport", title: "Test transfer", customerContact: pilgrim.email, pickupLocation: "Terminal 1" });
  });
});
