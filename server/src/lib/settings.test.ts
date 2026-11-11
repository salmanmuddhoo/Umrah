import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { GUIDE_PRICES } from "@/lib/constants";
import { resetDb } from "../../test/factories";
import { getGuidePrices } from "./settings";

describe("getGuidePrices", () => {
  beforeEach(resetDb);

  it("returns the built-in prices until the admin changes them", async () => {
    const prices = await getGuidePrices();
    expect(Object.keys(prices).sort()).toEqual(GUIDE_PRICES.map((p) => p.key).sort());
    expect(prices.zamzam).toBe("SAR 12.50 for one 5-litre bottle");
  });

  it("uses the admin's text once saved, and ignores a blank one", async () => {
    await db.setting.createMany({
      data: [
        { key: "price.zamzam", value: "SAR 14 for one 5-litre bottle" },
        { key: "price.visa.tourist", value: "   " },
      ],
    });
    const prices = await getGuidePrices();
    expect(prices.zamzam).toBe("SAR 14 for one 5-litre bottle");
    expect(prices["visa.tourist"]).toMatch(/SAR 535/);
  });
});
