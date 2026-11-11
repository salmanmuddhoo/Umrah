import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { inDays, makePackage, makeProvider, makeService, makeUser, resetDb } from "../../test/factories";
import * as bookings from "./bookings";

const PHONE = "+44 7700 900123";

describe("bookPackage", () => {
  beforeEach(resetDb);

  it("prices the booking per traveller and fixes the commission at the current rate", async () => {
    const pkg = await makePackage(await makeProvider("UMRAH"), { priceCents: 145_000 });
    const booking = await bookings.bookPackage(await makeUser(), pkg.id, { travellers: 2, contactPhone: PHONE });
    expect(booking).toMatchObject({ status: "PENDING", travellers: 2, totalCents: 290_000, commissionCents: 23_200 });
  });

  it("uses the admin's commission rate, and later changes do not touch existing bookings", async () => {
    const pkg = await makePackage(await makeProvider("UMRAH"));
    const pilgrim = await makeUser();
    await db.setting.create({ data: { key: "commission_package_pct", value: "12" } });
    const first = await bookings.bookPackage(pilgrim, pkg.id, { travellers: 1, contactPhone: PHONE });
    await db.setting.update({ where: { key: "commission_package_pct" }, data: { value: "5" } });
    const second = await bookings.bookPackage(pilgrim, pkg.id, { travellers: 1, contactPhone: PHONE });

    expect(first.commissionCents).toBe(12_000);
    expect(second.commissionCents).toBe(5_000);
    expect((await db.packageBooking.findUnique({ where: { id: first.id } }))?.commissionCents).toBe(12_000);
  });

  it("refuses to oversell, and says how many seats remain", async () => {
    const pkg = await makePackage(await makeProvider("UMRAH"), { seatsTotal: 3 });
    const pilgrim = await makeUser();
    await bookings.bookPackage(pilgrim, pkg.id, { travellers: 2, contactPhone: PHONE });
    await expect(bookings.bookPackage(pilgrim, pkg.id, { travellers: 2, contactPhone: PHONE })).rejects.toThrow("Only 1 seat left");
    await bookings.bookPackage(pilgrim, pkg.id, { travellers: 1, contactPhone: PHONE });
    await expect(bookings.bookPackage(pilgrim, pkg.id, { travellers: 1, contactPhone: PHONE })).rejects.toThrow("fully booked");
  });

  it("frees seats when a booking is cancelled", async () => {
    const pkg = await makePackage(await makeProvider("UMRAH"), { seatsTotal: 2 });
    const pilgrim = await makeUser();
    const first = await bookings.bookPackage(pilgrim, pkg.id, { travellers: 2, contactPhone: PHONE });
    await bookings.setBookingStatus(pilgrim, "package", first.id, "CANCELLED");
    await expect(bookings.bookPackage(pilgrim, pkg.id, { travellers: 2, contactPhone: PHONE })).resolves.toBeTruthy();
  });

  it("rejects bad input", async () => {
    const pkg = await makePackage(await makeProvider("UMRAH"));
    const pilgrim = await makeUser();
    await expect(bookings.bookPackage(pilgrim, pkg.id, { travellers: 0, contactPhone: PHONE })).rejects.toMatchObject({ status: 400 });
    await expect(bookings.bookPackage(pilgrim, pkg.id, { travellers: 1, contactPhone: "nope" })).rejects.toMatchObject({ status: 400 });
  });

  it.each([
    ["hidden by the provider", { active: false }, "APPROVED"],
    ["from an unapproved provider", {}, "PENDING"],
    ["from a suspended provider", {}, "SUSPENDED"],
    ["already departed", { departureDate: inDays(-1) }, "APPROVED"],
  ])("refuses a package that is %s", async (_label, overrides, status) => {
    const pkg = await makePackage(await makeProvider("UMRAH", status), overrides);
    await expect(bookings.bookPackage(await makeUser(), pkg.id, { travellers: 1, contactPhone: PHONE })).rejects.toMatchObject({ status: 400 });
    expect(await db.packageBooking.count()).toBe(0);
  });
});

describe("bookTransport", () => {
  beforeEach(resetDb);
  const valid = { pickupAt: "2031-01-05T14:30", pickupLocation: "JED Terminal 1", passengers: 3, contactPhone: PHONE };

  it("charges the per-trip price and stores the pickup as Saudi local time", async () => {
    const service = await makeService(await makeProvider("TRANSPORT"), { priceCents: 7_500 });
    const booking = await bookings.bookTransport(await makeUser(), service.id, valid);
    expect(booking).toMatchObject({ totalCents: 7_500, commissionCents: 750, passengers: 3 });
    expect(booking.pickupAt.toISOString()).toBe("2031-01-05T11:30:00.000Z");
  });

  it("rejects more passengers than the vehicle holds", async () => {
    const service = await makeService(await makeProvider("TRANSPORT"), { capacity: 4 });
    await expect(bookings.bookTransport(await makeUser(), service.id, { ...valid, passengers: 5 })).rejects.toThrow("up to 4 passengers");
  });

  it("rejects a pickup time in the past or in the wrong format", async () => {
    const service = await makeService(await makeProvider("TRANSPORT"));
    const pilgrim = await makeUser();
    await expect(bookings.bookTransport(pilgrim, service.id, { ...valid, pickupAt: "2020-01-01T10:00" })).rejects.toThrow("future");
    await expect(bookings.bookTransport(pilgrim, service.id, { ...valid, pickupAt: "tomorrow" })).rejects.toMatchObject({ status: 400 });
  });

  it("refuses a service from an unapproved provider", async () => {
    const service = await makeService(await makeProvider("TRANSPORT", "PENDING"));
    await expect(bookings.bookTransport(await makeUser(), service.id, valid)).rejects.toThrow("no longer available");
  });
});

describe("setBookingStatus", () => {
  beforeEach(resetDb);

  async function scenario() {
    const owner = await makeProvider("UMRAH");
    const pilgrim = await makeUser();
    const pkg = await makePackage(owner);
    const booking = await bookings.bookPackage(pilgrim, pkg.id, { travellers: 1, contactPhone: PHONE });
    return { owner, pilgrim, booking };
  }

  it("lets the provider confirm then complete a booking", async () => {
    const { owner, booking } = await scenario();
    await bookings.setBookingStatus(owner, "package", booking.id, "CONFIRMED");
    await bookings.setBookingStatus(owner, "package", booking.id, "COMPLETED");
    expect((await db.packageBooking.findUnique({ where: { id: booking.id } }))?.status).toBe("COMPLETED");
  });

  it("does not let the customer confirm their own booking", async () => {
    const { pilgrim, booking } = await scenario();
    await expect(bookings.setBookingStatus(pilgrim, "package", booking.id, "CONFIRMED")).rejects.toMatchObject({ status: 403 });
  });

  it("hides bookings from strangers and from other providers", async () => {
    const { booking } = await scenario();
    await expect(bookings.setBookingStatus(await makeUser(), "package", booking.id, "CANCELLED")).rejects.toMatchObject({ status: 404 });
    await expect(bookings.setBookingStatus(await makeProvider("UMRAH"), "package", booking.id, "CONFIRMED")).rejects.toMatchObject({ status: 404 });
  });

  it("does not reopen a cancelled booking", async () => {
    const { owner, pilgrim, booking } = await scenario();
    await bookings.setBookingStatus(pilgrim, "package", booking.id, "CANCELLED");
    await expect(bookings.setBookingStatus(owner, "package", booking.id, "CONFIRMED")).rejects.toMatchObject({ status: 403 });
  });

  it("rejects unknown booking kinds", async () => {
    const { owner, booking } = await scenario();
    await expect(bookings.setBookingStatus(owner, "hotel", booking.id, "CONFIRMED")).rejects.toMatchObject({ status: 404 });
  });
});

describe("myBookings", () => {
  beforeEach(resetDb);

  it("shares the provider's phone only after they confirm, and never exposes the commission", async () => {
    const owner = await makeProvider("UMRAH");
    const pilgrim = await makeUser();
    const pkg = await makePackage(owner);
    const booking = await bookings.bookPackage(pilgrim, pkg.id, { travellers: 1, contactPhone: PHONE });

    let mine = await bookings.myBookings(pilgrim);
    expect(mine.packages[0].providerPhone).toBe("");
    expect(mine.packages[0]).not.toHaveProperty("commissionCents");

    await bookings.setBookingStatus(owner, "package", booking.id, "CONFIRMED");
    mine = await bookings.myBookings(pilgrim);
    expect(mine.packages[0].providerPhone).toBe("+966 500 000 000");
  });

  it("only returns the caller's own bookings", async () => {
    const pkg = await makePackage(await makeProvider("UMRAH"));
    await bookings.bookPackage(await makeUser(), pkg.id, { travellers: 1, contactPhone: PHONE });
    const other = await bookings.myBookings(await makeUser());
    expect(other).toEqual({ packages: [], transport: [] });
  });
});
