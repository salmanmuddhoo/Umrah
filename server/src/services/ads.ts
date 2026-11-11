import "server-only";
import { db } from "@/lib/db";
import { AD_THEMES } from "@/lib/constants";
import { badRequest, notFound } from "@/lib/errors";
import { bool, parseDay, str, type Input } from "@/lib/validate";

/**
 * Ads the app should show right now: switched on and inside their date window.
 * An ad whose listing has since been hidden or whose provider is no longer
 * approved still shows, but without a link, so a tap never leads to a dead end.
 */
export async function activeAds(now = new Date()) {
  const visible = { select: { active: true, provider: { select: { status: true } } } };
  const ads = await db.ad.findMany({
    where: {
      active: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { package: visible, service: visible },
  });
  const live = (l: { active: boolean; provider: { status: string } } | null) => !!l && l.active && l.provider.status === "APPROVED";
  return ads.map((ad) => ({
    id: ad.id,
    advertiser: ad.advertiser,
    headline: ad.headline,
    body: ad.body,
    cta: ad.cta,
    theme: ad.theme,
    packageId: live(ad.package) ? ad.packageId : null,
    serviceId: live(ad.service) ? ad.serviceId : null,
  }));
}

/** Counts a tap on an ad, so advertisers can be shown what they paid for. */
export async function recordClick(id: string) {
  const res = await db.ad.updateMany({ where: { id }, data: { clicks: { increment: 1 } } });
  if (res.count === 0) throw notFound("This ad no longer exists.");
  return { ok: true };
}

/** Validates the admin console's ad form. Exported for unit tests. */
export function readAd(input: Input) {
  // The form sends one "target" field: "package:<id>", "service:<id>" or "".
  const [kind, targetId] = str(input, "target", 80).split(":");
  const startsRaw = str(input, "startsAt", 10);
  const endsRaw = str(input, "endsAt", 10);
  const startsAt = startsRaw ? parseDay(startsRaw) : null;
  const endDay = endsRaw ? parseDay(endsRaw) : null;
  const data = {
    advertiser: str(input, "advertiser", 80),
    headline: str(input, "headline", 80),
    body: str(input, "body", 160),
    cta: str(input, "cta", 24) || "View",
    theme: str(input, "theme", 10) || "green",
    packageId: kind === "package" && targetId ? targetId : null,
    serviceId: kind === "service" && targetId ? targetId : null,
    active: bool(input, "active"),
    startsAt,
    // An end date means "through the end of that day".
    endsAt: endDay ? new Date(endDay.getTime() + 86_400_000 - 1) : null,
  };
  let error: string | null = null;
  if (data.advertiser.length < 2) error = "Enter the advertiser's name.";
  else if (data.headline.length < 5) error = "Write a headline of at least 5 characters.";
  else if (!(AD_THEMES as readonly string[]).includes(data.theme)) error = "Choose a colour.";
  else if ((startsRaw && !startsAt) || (endsRaw && !endDay)) error = "Dates must be valid calendar days.";
  else if (data.startsAt && data.endsAt && data.endsAt < data.startsAt) error = "The end date is before the start date.";
  return { data, error };
}

export async function createAd(input: Input) {
  const { data, error } = readAd(input);
  if (error) throw badRequest(error);
  if (data.packageId && !(await db.package.findUnique({ where: { id: data.packageId }, select: { id: true } }))) {
    throw badRequest("The chosen package no longer exists.");
  }
  if (data.serviceId && !(await db.transportService.findUnique({ where: { id: data.serviceId }, select: { id: true } }))) {
    throw badRequest("The chosen transport service no longer exists.");
  }
  return db.ad.create({ data });
}
