import "server-only";
import { db } from "./db";
import { DEFAULT_COMMISSION } from "./constants";
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
