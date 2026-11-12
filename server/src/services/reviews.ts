import "server-only";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { badRequest, forbidden, notFound } from "@/lib/errors";
import { between, int, str, type Input } from "@/lib/validate";

export type ReviewKind = "package" | "transport";

/** Bookings in these states mean the reviewer actually travelled with the provider. */
const TRAVELLED = ["CONFIRMED", "COMPLETED"];

function kindOf(raw: string): ReviewKind {
  if (raw !== "package" && raw !== "transport") throw notFound();
  return raw;
}

/** The listing a review is about, as Prisma `where` fields. */
const target = (kind: ReviewKind, listingId: string) => (kind === "package" ? { packageId: listingId } : { serviceId: listingId });

/** The listing's provider, or a 404 when the listing does not exist or is not public. */
async function listingProvider(kind: ReviewKind, listingId: string) {
  const select = { active: true, providerId: true, provider: { select: { status: true } } } as const;
  const listing =
    kind === "package"
      ? await db.package.findUnique({ where: { id: listingId }, select })
      : await db.transportService.findUnique({ where: { id: listingId }, select });
  if (!listing || !listing.active || listing.provider.status !== "APPROVED") throw notFound("This listing is not available.");
  return listing.providerId;
}

/** Whether the person booked this listing and the provider accepted it. */
async function hasTravelled(kind: ReviewKind, listingId: string, userId: string) {
  const where = { userId, status: { in: TRAVELLED } };
  const count =
    kind === "package"
      ? await db.packageBooking.count({ where: { ...where, packageId: listingId } })
      : await db.transportBooking.count({ where: { ...where, serviceId: listingId } });
  return count > 0;
}

/** Average rating (to one decimal) and number of reviews for many listings at once. */
export async function ratingsFor(kind: ReviewKind, listingIds: string[]) {
  const result = new Map<string, { ratingAverage: number | null; ratingCount: number }>();
  if (listingIds.length === 0) return result;
  const field = kind === "package" ? "packageId" : "serviceId";
  const rows = await db.review.groupBy({
    by: [field],
    where: { [field]: { in: listingIds } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  for (const row of rows) {
    const id = (row as Record<string, unknown>)[field] as string;
    const avg = row._avg.rating;
    result.set(id, { ratingAverage: avg === null ? null : Math.round(avg * 10) / 10, ratingCount: row._count._all });
  }
  return result;
}

export const NO_RATING = { ratingAverage: null, ratingCount: 0 } as const;

/** Reviews for one listing, newest first, with a summary. `mine` marks the caller's own review. */
export async function listReviews(rawKind: string, listingId: string, user: SessionUser | null) {
  const kind = kindOf(rawKind);
  const reviews = await db.review.findMany({
    where: target(kind, listingId),
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true } } },
  });

  // "Verified" means the reviewer had a booking the provider accepted.
  const bookings =
    kind === "package"
      ? await db.packageBooking.findMany({ where: { packageId: listingId, status: { in: TRAVELLED } }, select: { userId: true } })
      : await db.transportBooking.findMany({ where: { serviceId: listingId, status: { in: TRAVELLED } }, select: { userId: true } });
  const travelled = new Set(bookings.map((b) => b.userId));

  const summary = (await ratingsFor(kind, [listingId])).get(listingId) ?? NO_RATING;
  return {
    ...summary,
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      // Only the first name is shown, to protect reviewers' privacy.
      authorName: r.user.name.split(" ")[0],
      verified: travelled.has(r.userId),
      mine: r.userId === user?.id,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  };
}

/** Validates a review form. Exported for unit tests. */
export function readReview(input: Input) {
  const rating = int(input, "rating");
  const comment = str(input, "comment", 2000);
  if (!between(rating, 1, 5)) return { error: "Choose a rating from 1 to 5 stars." } as const;
  if (comment.length > 0 && comment.length < 3) return { error: "Write a few more words, or leave the comment empty." } as const;
  return { data: { rating, comment } } as const;
}

/** Adds the caller's review of a listing, or updates it if they already left one. */
export async function saveReview(user: SessionUser, rawKind: string, listingId: string, input: Input) {
  const kind = kindOf(rawKind);
  const parsed = readReview(input);
  if ("error" in parsed) throw badRequest(parsed.error!);

  const providerId = await listingProvider(kind, listingId);
  if (user.provider?.id === providerId) throw forbidden("You cannot review your own listing.");

  const where = kind === "package" ? { userId_packageId: { userId: user.id, packageId: listingId } } : { userId_serviceId: { userId: user.id, serviceId: listingId } };
  const review = await db.review.upsert({
    where,
    create: { userId: user.id, ...target(kind, listingId), ...parsed.data },
    update: parsed.data,
  });
  return { ...review, verified: await hasTravelled(kind, listingId, user.id) };
}

/** Removes a review. Its author or a platform admin may do this. */
export async function deleteReview(user: SessionUser, reviewId: string) {
  const review = await db.review.findUnique({ where: { id: reviewId }, select: { userId: true } });
  if (!review) throw notFound("This review does not exist.");
  if (review.userId !== user.id && user.role !== "ADMIN") throw forbidden("You can only delete your own reviews.");
  await db.review.delete({ where: { id: reviewId } });
  return { deleted: true };
}
