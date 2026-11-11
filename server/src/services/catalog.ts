import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { VEHICLE_TYPES } from "@/lib/constants";
import { notFound } from "@/lib/errors";
import { seatsLeft } from "@/lib/rules";

/** Filter that limits listings to ones the public may see. */
export const PUBLIC_LISTING = { active: true, provider: { status: "APPROVED" } } as const;

/** Provider fields that are safe to show to anyone. */
export const PUBLIC_PROVIDER = {
  select: { id: true, companyName: true, description: true, city: true, country: true, licenseNo: true },
} as const;

/** Seats already taken on each package (cancelled bookings free their seats). */
export async function seatsBooked(packageIds: string[]) {
  if (packageIds.length === 0) return new Map<string, number>();
  const rows = await db.packageBooking.groupBy({
    by: ["packageId"],
    where: { packageId: { in: packageIds }, status: { not: "CANCELLED" } },
    _sum: { travellers: true },
  });
  return new Map(rows.map((r) => [r.packageId, r._sum.travellers ?? 0]));
}

const PACKAGE_SORTS: Record<string, Prisma.PackageOrderByWithRelationInput> = {
  date: { departureDate: "asc" },
  price: { priceCents: "asc" },
  "price-desc": { priceCents: "desc" },
  duration: { durationDays: "asc" },
};

export async function listPackages(query: URLSearchParams) {
  const q = (query.get("q") ?? "").trim();
  const maxPrice = Number(query.get("max"));
  const stars = Number(query.get("stars"));
  const sort = query.get("sort") ?? "";

  const packages = await db.package.findMany({
    where: {
      ...PUBLIC_LISTING,
      departureDate: { gte: new Date() },
      ...(q && {
        OR: [
          { title: { contains: q } },
          { departureCity: { contains: q } },
          { makkahHotel: { contains: q } },
          { madinahHotel: { contains: q } },
          { provider: { companyName: { contains: q } } },
        ],
      }),
      ...(maxPrice > 0 && { priceCents: { lte: Math.round(maxPrice * 100) } }),
      ...(stars >= 1 && stars <= 5 && { hotelStars: { gte: stars } }),
    },
    include: { provider: PUBLIC_PROVIDER },
    orderBy: PACKAGE_SORTS[sort] ?? PACKAGE_SORTS.date,
    take: 60,
  });
  const booked = await seatsBooked(packages.map((p) => p.id));
  return packages.map((p) => ({ ...p, seatsLeft: seatsLeft(p.seatsTotal, booked.get(p.id) ?? 0) }));
}

/** Hidden listings stay visible to their owner (for previewing) and to admins. */
function canSee(listing: { active: boolean; providerId: string; provider: { status: string } }, user: SessionUser | null) {
  const isPublic = listing.active && listing.provider.status === "APPROVED";
  return { isPublic, visible: isPublic || user?.role === "ADMIN" || user?.provider?.id === listing.providerId };
}

export async function getPackage(id: string, user: SessionUser | null) {
  const pkg = await db.package.findUnique({ where: { id }, include: { provider: { select: { ...PUBLIC_PROVIDER.select, status: true } } } });
  if (!pkg) throw notFound("This package does not exist.");
  const { isPublic, visible } = canSee(pkg, user);
  if (!visible) throw notFound("This package does not exist.");
  const booked = (await seatsBooked([id])).get(id) ?? 0;
  const { status: _status, ...provider } = pkg.provider;
  return { ...pkg, provider, isPublic, departed: pkg.departureDate < new Date(), seatsLeft: seatsLeft(pkg.seatsTotal, booked) };
}

export async function listServices(query: URLSearchParams) {
  const q = (query.get("q") ?? "").trim();
  const type = query.get("type") ?? "";
  const pax = Number(query.get("pax"));

  return db.transportService.findMany({
    where: {
      ...PUBLIC_LISTING,
      ...(q && {
        OR: [
          { title: { contains: q } },
          { fromPlace: { contains: q } },
          { toPlace: { contains: q } },
          { provider: { companyName: { contains: q } } },
        ],
      }),
      ...((VEHICLE_TYPES as readonly string[]).includes(type) && { vehicleType: type }),
      ...(pax > 0 && { capacity: { gte: Math.floor(pax) } }),
    },
    include: { provider: PUBLIC_PROVIDER },
    orderBy: { priceCents: "asc" },
    take: 60,
  });
}

export async function getService(id: string, user: SessionUser | null) {
  const service = await db.transportService.findUnique({
    where: { id },
    include: { provider: { select: { ...PUBLIC_PROVIDER.select, status: true } } },
  });
  if (!service) throw notFound("This service does not exist.");
  const { isPublic, visible } = canSee(service, user);
  if (!visible) throw notFound("This service does not exist.");
  const { status: _status, ...provider } = service.provider;
  return { ...service, provider, isPublic };
}
