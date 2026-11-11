import "server-only";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { badRequest, forbidden, notFound } from "@/lib/errors";
import { canMove, commissionOn } from "@/lib/rules";
import { getCommissionRates } from "@/lib/settings";
import { between, int, isPhone, parseSaudiDateTime, str, type Input } from "@/lib/validate";

export async function bookPackage(user: SessionUser, packageId: string, input: Input) {
  const travellers = int(input, "travellers");
  const contactPhone = str(input, "contactPhone", 40);
  if (!between(travellers, 1, 50)) throw badRequest("Enter the number of travellers (1–50).");
  if (!isPhone(contactPhone)) throw badRequest("Enter a phone number the provider can reach you on.");

  const rates = await getCommissionRates();

  // Seats are counted and the booking created in one transaction so a package cannot be oversold.
  return db.$transaction(async (tx) => {
    const pkg = await tx.package.findUnique({ where: { id: packageId }, include: { provider: { select: { status: true } } } });
    if (!pkg || !pkg.active || pkg.provider.status !== "APPROVED") throw badRequest("This package is no longer available.");
    if (pkg.departureDate < new Date()) throw badRequest("This package has already departed.");

    const booked = await tx.packageBooking.aggregate({
      where: { packageId, status: { not: "CANCELLED" } },
      _sum: { travellers: true },
    });
    const left = pkg.seatsTotal - (booked._sum.travellers ?? 0);
    if (travellers > left) {
      throw badRequest(left > 0 ? `Only ${left} seat${left === 1 ? "" : "s"} left on this package.` : "This package is fully booked.");
    }

    const totalCents = pkg.priceCents * travellers;
    return tx.packageBooking.create({
      data: {
        packageId,
        userId: user.id,
        travellers,
        contactPhone,
        notes: str(input, "notes", 1000),
        totalCents,
        commissionCents: commissionOn(totalCents, rates.package),
      },
    });
  });
}

export async function bookTransport(user: SessionUser, serviceId: string, input: Input) {
  const passengers = int(input, "passengers");
  const contactPhone = str(input, "contactPhone", 40);
  const pickupLocation = str(input, "pickupLocation", 200);
  const pickupAt = parseSaudiDateTime(str(input, "pickupAt", 20));

  if (!pickupAt) throw badRequest("Enter the pickup date and time as YYYY-MM-DD and HH:MM.");
  if (pickupAt < new Date()) throw badRequest("The pickup time must be in the future.");
  if (pickupLocation.length < 3) throw badRequest("Tell the driver where to pick you up.");
  if (!isPhone(contactPhone)) throw badRequest("Enter a phone number the driver can reach you on.");

  const service = await db.transportService.findUnique({ where: { id: serviceId }, include: { provider: { select: { status: true } } } });
  if (!service || !service.active || service.provider.status !== "APPROVED") throw badRequest("This service is no longer available.");
  if (!between(passengers, 1, service.capacity)) throw badRequest(`This vehicle carries up to ${service.capacity} passengers.`);

  const rates = await getCommissionRates();
  return db.transportBooking.create({
    data: {
      serviceId,
      userId: user.id,
      pickupAt,
      pickupLocation,
      passengers,
      contactPhone,
      notes: str(input, "notes", 1000),
      totalCents: service.priceCents,
      commissionCents: commissionOn(service.priceCents, rates.transport),
    },
  });
}

/** The provider's phone number is only shared once they have accepted the booking. */
const phoneFor = (status: string, phone: string) => (status === "CONFIRMED" || status === "COMPLETED" ? phone : "");

export async function myBookings(user: SessionUser) {
  const provider = { select: { companyName: true, phone: true } };
  const [packages, transport] = await Promise.all([
    db.packageBooking.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { package: { select: { title: true, departureDate: true, provider } } },
    }),
    db.transportBooking.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { service: { select: { title: true, fromPlace: true, toPlace: true, provider } } },
    }),
  ]);
  return {
    packages: packages.map(({ commissionCents: _c, package: p, ...b }) => ({
      ...b,
      title: p.title,
      departureDate: p.departureDate,
      providerName: p.provider.companyName,
      providerPhone: phoneFor(b.status, p.provider.phone),
    })),
    transport: transport.map(({ commissionCents: _c, service: s, ...b }) => ({
      ...b,
      title: s.title,
      fromPlace: s.fromPlace,
      toPlace: s.toPlace,
      providerName: s.provider.companyName,
      providerPhone: phoneFor(b.status, s.provider.phone),
    })),
  };
}

export async function setBookingStatus(user: SessionUser, kind: string, bookingId: string, to: string) {
  if (kind !== "package" && kind !== "transport") throw notFound();

  const booking =
    kind === "package"
      ? await db.packageBooking
          .findUnique({ where: { id: bookingId }, select: { status: true, userId: true, package: { select: { providerId: true } } } })
          .then((b) => b && { status: b.status, userId: b.userId, providerId: b.package.providerId })
      : await db.transportBooking
          .findUnique({ where: { id: bookingId }, select: { status: true, userId: true, service: { select: { providerId: true } } } })
          .then((b) => b && { status: b.status, userId: b.userId, providerId: b.service.providerId });
  if (!booking) throw notFound("This booking does not exist.");

  const isProvider = !!user.provider && user.provider.id === booking.providerId;
  const isCustomer = booking.userId === user.id;
  if (!isProvider && !isCustomer) throw notFound("This booking does not exist.");

  const allowed =
    (isProvider && canMove(booking.status, to, "provider")) || (isCustomer && canMove(booking.status, to, "customer"));
  if (!allowed) throw forbidden("This booking cannot be changed that way.");

  // Guard on the previous status so two simultaneous updates cannot both apply.
  const where = { id: bookingId, status: booking.status };
  const res =
    kind === "package"
      ? await db.packageBooking.updateMany({ where, data: { status: to } })
      : await db.transportBooking.updateMany({ where, data: { status: to } });
  if (res.count === 0) throw badRequest("This booking was just updated by someone else. Please refresh.");
  return { id: bookingId, status: to };
}
