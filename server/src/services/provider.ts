import "server-only";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { EARNING_STATUSES, VEHICLE_TYPES } from "@/lib/constants";
import { badRequest, forbidden, notFound } from "@/lib/errors";
import { getCommissionRates } from "@/lib/settings";
import { between, bool, cents, int, parseDay, str, type Input } from "@/lib/validate";
import { seatsBooked } from "./catalog";

/** The caller's provider profile, optionally required to be of one type. */
function providerOf(user: SessionUser, type?: "UMRAH" | "TRANSPORT") {
  if (!user.provider) throw forbidden("This is only available to provider accounts.");
  if (type && user.provider.type !== type) {
    throw forbidden(type === "UMRAH" ? "Only Umrah providers can manage packages." : "Only transport providers can manage services.");
  }
  return user.provider;
}

export async function dashboard(user: SessionUser) {
  const provider = providerOf(user);
  const earning = { status: { in: EARNING_STATUSES } };
  const sum = { _sum: { totalCents: true, commissionCents: true }, _count: true } as const;
  const rates = await getCommissionRates();

  let listings: number, pending: number, sums: { _sum: { totalCents: number | null; commissionCents: number | null }; _count: number };
  if (provider.type === "UMRAH") {
    const scope = { package: { providerId: provider.id } };
    [listings, pending, sums] = await Promise.all([
      db.package.count({ where: { providerId: provider.id, active: true } }),
      db.packageBooking.count({ where: { ...scope, status: "PENDING" } }),
      db.packageBooking.aggregate({ where: { ...scope, ...earning }, ...sum }),
    ]);
  } else {
    const scope = { service: { providerId: provider.id } };
    [listings, pending, sums] = await Promise.all([
      db.transportService.count({ where: { providerId: provider.id, active: true } }),
      db.transportBooking.count({ where: { ...scope, status: "PENDING" } }),
      db.transportBooking.aggregate({ where: { ...scope, ...earning }, ...sum }),
    ]);
  }
  const grossCents = sums._sum.totalCents ?? 0;
  const commissionCents = sums._sum.commissionCents ?? 0;
  return {
    provider,
    commissionRate: provider.type === "UMRAH" ? rates.package : rates.transport,
    stats: { listings, pending, confirmed: sums._count, grossCents, commissionCents, netCents: grossCents - commissionCents },
  };
}

export async function updateProfile(user: SessionUser, input: Input) {
  const provider = providerOf(user);
  const companyName = str(input, "companyName", 120);
  if (companyName.length < 2) throw badRequest("Company name is required.");
  return db.provider.update({
    where: { id: provider.id },
    data: {
      companyName,
      description: str(input, "description", 2000),
      country: str(input, "country", 80),
      city: str(input, "city", 80),
      phone: str(input, "phone", 40),
      licenseNo: str(input, "licenseNo", 80),
    },
  });
}

/** Validates a package form. Exported for unit tests. */
export function readPackage(input: Input) {
  const data = {
    title: str(input, "title", 120),
    description: str(input, "description", 4000),
    departureCity: str(input, "departureCity", 80),
    departureDate: parseDay(str(input, "departureDate", 10)),
    durationDays: int(input, "durationDays"),
    makkahHotel: str(input, "makkahHotel", 120),
    makkahNights: int(input, "makkahNights"),
    madinahHotel: str(input, "madinahHotel", 120),
    madinahNights: str(input, "madinahNights") === "" ? 0 : int(input, "madinahNights"),
    hotelStars: int(input, "hotelStars"),
    priceCents: cents(input, "price"),
    seatsTotal: int(input, "seatsTotal"),
    incFlights: bool(input, "incFlights"),
    incVisa: bool(input, "incVisa"),
    incMeals: bool(input, "incMeals"),
    incTransport: bool(input, "incTransport"),
    incZiyarah: bool(input, "incZiyarah"),
    active: bool(input, "active"),
  };
  let error: string | null = null;
  if (data.title.length < 5) error = "Give the package a title of at least 5 characters.";
  else if (data.description.length < 20) error = "Describe the package in at least 20 characters.";
  else if (!data.departureCity) error = "Departure city is required.";
  else if (!data.departureDate) error = "Enter the departure date as YYYY-MM-DD.";
  else if (!between(data.durationDays, 1, 90)) error = "Duration must be between 1 and 90 days.";
  else if (!data.makkahHotel) error = "Makkah hotel is required.";
  else if (!between(data.makkahNights, 1, 90)) error = "Enter the number of nights in Makkah.";
  else if (!between(data.madinahNights, 0, 90)) error = "Nights in Madinah must be 0 or more.";
  else if (data.madinahNights > 0 && !data.madinahHotel) error = "Enter the Madinah hotel.";
  else if (data.makkahNights + data.madinahNights > data.durationDays) error = "Hotel nights cannot exceed the trip duration.";
  else if (!between(data.hotelStars, 1, 5)) error = "Hotel rating must be 1 to 5 stars.";
  else if (!between(data.priceCents, 100, 10_000_000)) error = "Enter a price per person.";
  else if (!between(data.seatsTotal, 1, 5000)) error = "Enter how many seats are available.";
  return { data, error };
}

export async function myPackages(user: SessionUser) {
  const provider = providerOf(user, "UMRAH");
  const packages = await db.package.findMany({ where: { providerId: provider.id }, orderBy: { departureDate: "asc" } });
  const booked = await seatsBooked(packages.map((p) => p.id));
  return packages.map((p) => ({ ...p, seatsBooked: booked.get(p.id) ?? 0 }));
}

export async function savePackage(user: SessionUser, id: string | null, input: Input) {
  const provider = providerOf(user, "UMRAH");
  const { data, error } = readPackage(input);
  if (error || !data.departureDate) throw badRequest(error ?? "Invalid package.");
  const values = { ...data, departureDate: data.departureDate };

  if (!id) return db.package.create({ data: { ...values, providerId: provider.id } });
  // updateMany scopes the write to this provider's own package.
  const res = await db.package.updateMany({ where: { id, providerId: provider.id }, data: values });
  if (res.count === 0) throw notFound("Package not found.");
  return db.package.findUniqueOrThrow({ where: { id } });
}

/** Packages with open bookings are hidden rather than deleted so pilgrims keep their record. */
export async function deletePackage(user: SessionUser, id: string) {
  const provider = providerOf(user, "UMRAH");
  const own = { id, providerId: provider.id };
  if (!(await db.package.findFirst({ where: own, select: { id: true } }))) throw notFound("Package not found.");
  const live = await db.packageBooking.count({ where: { packageId: id, status: { in: ["PENDING", "CONFIRMED"] } } });
  if (live > 0) {
    await db.package.updateMany({ where: own, data: { active: false } });
    return { deleted: false, hidden: true };
  }
  await db.package.deleteMany({ where: own });
  return { deleted: true, hidden: false };
}

/** Validates a transport service form. Exported for unit tests. */
export function readService(input: Input) {
  const data = {
    title: str(input, "title", 120),
    description: str(input, "description", 2000),
    vehicleType: str(input, "vehicleType", 10),
    capacity: int(input, "capacity"),
    fromPlace: str(input, "fromPlace", 120),
    toPlace: str(input, "toPlace", 120),
    priceCents: cents(input, "price"),
    active: bool(input, "active"),
  };
  let error: string | null = null;
  if (data.title.length < 5) error = "Give the service a title of at least 5 characters.";
  else if (!(VEHICLE_TYPES as readonly string[]).includes(data.vehicleType)) error = "Choose a vehicle type.";
  else if (!between(data.capacity, 1, 80)) error = "Capacity must be between 1 and 80 passengers.";
  else if (!data.fromPlace || !data.toPlace) error = "Enter where the route starts and ends.";
  else if (!between(data.priceCents, 100, 1_000_000)) error = "Enter a price per trip.";
  return { data, error };
}

export async function myServices(user: SessionUser) {
  const provider = providerOf(user, "TRANSPORT");
  const services = await db.transportService.findMany({
    where: { providerId: provider.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { bookings: true } } },
  });
  return services.map(({ _count, ...s }) => ({ ...s, bookingCount: _count.bookings }));
}

export async function saveService(user: SessionUser, id: string | null, input: Input) {
  const provider = providerOf(user, "TRANSPORT");
  const { data, error } = readService(input);
  if (error) throw badRequest(error);

  if (!id) return db.transportService.create({ data: { ...data, providerId: provider.id } });
  const res = await db.transportService.updateMany({ where: { id, providerId: provider.id }, data });
  if (res.count === 0) throw notFound("Service not found.");
  return db.transportService.findUniqueOrThrow({ where: { id } });
}

export async function deleteService(user: SessionUser, id: string) {
  const provider = providerOf(user, "TRANSPORT");
  const own = { id, providerId: provider.id };
  if (!(await db.transportService.findFirst({ where: own, select: { id: true } }))) throw notFound("Service not found.");
  const live = await db.transportBooking.count({ where: { serviceId: id, status: { in: ["PENDING", "CONFIRMED"] } } });
  if (live > 0) {
    await db.transportService.updateMany({ where: own, data: { active: false } });
    return { deleted: false, hidden: true };
  }
  await db.transportService.deleteMany({ where: own });
  return { deleted: true, hidden: false };
}

/** Every booking on this provider's listings, newest first, in one shape for both provider types. */
export async function providerBookings(user: SessionUser) {
  const provider = providerOf(user);
  const customer = { select: { name: true, email: true, phone: true } };

  if (provider.type === "UMRAH") {
    const rows = await db.packageBooking.findMany({
      where: { package: { providerId: provider.id } },
      orderBy: { createdAt: "desc" },
      include: { package: { select: { title: true, departureDate: true } }, user: customer },
    });
    return rows.map(({ package: p, user: u, ...b }) => ({
      ...b,
      kind: "package" as const,
      title: p.title,
      departureDate: p.departureDate,
      customerName: u.name,
      customerContact: u.email ?? u.phone ?? "",
    }));
  }
  const rows = await db.transportBooking.findMany({
    where: { service: { providerId: provider.id } },
    orderBy: { createdAt: "desc" },
    include: { service: { select: { title: true } }, user: customer },
  });
  return rows.map(({ service: s, user: u, ...b }) => ({
    ...b,
    kind: "transport" as const,
    title: s.title,
    customerName: u.name,
    customerContact: u.email ?? u.phone ?? "",
  }));
}
