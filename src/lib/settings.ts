import "server-only";
import { db } from "./db";
import { DEFAULT_COMMISSION } from "./constants";

/** Commission percentages the platform takes on each booking type. */
export async function getCommissionRates() {
  const rows = await db.setting.findMany({
    where: { key: { in: ["commission_package_pct", "commission_transport_pct"] } },
  });
  const read = (key: string, fallback: number) => {
    const n = Number(rows.find((r) => r.key === key)?.value);
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : fallback;
  };
  return {
    package: read("commission_package_pct", DEFAULT_COMMISSION.package),
    transport: read("commission_transport_pct", DEFAULT_COMMISSION.transport),
  };
}

export function commissionOn(totalCents: number, pct: number) {
  return Math.round((totalCents * pct) / 100);
}
