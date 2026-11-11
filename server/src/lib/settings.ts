import "server-only";
import { db } from "./db";
import { DEFAULT_COMMISSION, GUIDE_PRICES } from "./constants";
import { validRate } from "./rules";

/** Commission percentages the platform takes on each booking type. */
export async function getCommissionRates() {
  const rows = await db.setting.findMany({
    where: { key: { in: ["commission_package_pct", "commission_transport_pct"] } },
  });
  const read = (key: string, fallback: number) => {
    const raw = rows.find((r) => r.key === key)?.value;
    const n = raw === undefined ? NaN : Number(raw);
    return validRate(n) ? n : fallback;
  };
  return {
    package: read("commission_package_pct", DEFAULT_COMMISSION.package),
    transport: read("commission_transport_pct", DEFAULT_COMMISSION.transport),
  };
}

/** The prices shown in the app's guides, as `{ "zamzam": "...", "visa.tourist": "...", ... }`. */
export async function getGuidePrices() {
  const rows = await db.setting.findMany({ where: { key: { startsWith: "price." } } });
  const saved = new Map(rows.map((r) => [r.key.slice("price.".length), r.value]));
  return Object.fromEntries(GUIDE_PRICES.map((p) => [p.key, saved.get(p.key)?.trim() || p.fallback])) as Record<
    (typeof GUIDE_PRICES)[number]["key"],
    string
  >;
}
