import { describe, expect, it } from "vitest";
import { canMove, commissionOn, roleForProviderType, safeNext, seatsLeft, validRate } from "./rules";

describe("commissionOn", () => {
  it("takes the given percentage of the total", () => {
    expect(commissionOn(145_000, 8)).toBe(11_600);
    expect(commissionOn(7_500, 10)).toBe(750);
  });
  it("rounds to the nearest cent", () => {
    expect(commissionOn(999, 8)).toBe(80); // 79.92
    expect(commissionOn(1_001, 12.5)).toBe(125); // 125.125
  });
  it("is zero at a 0% rate", () => {
    expect(commissionOn(500_000, 0)).toBe(0);
  });
});

describe("validRate", () => {
  it("accepts 0 to the maximum, inclusive", () => {
    expect(validRate(0)).toBe(true);
    expect(validRate(100)).toBe(true);
    expect(validRate(50, 50)).toBe(true);
  });
  it("rejects negatives, values over the maximum and non-numbers", () => {
    expect(validRate(-1)).toBe(false);
    expect(validRate(50.1, 50)).toBe(false);
    expect(validRate(NaN)).toBe(false);
    expect(validRate(Infinity)).toBe(false);
  });
});

describe("canMove", () => {
  it("lets a customer cancel a pending or confirmed booking, and nothing else", () => {
    expect(canMove("PENDING", "CANCELLED", "customer")).toBe(true);
    expect(canMove("CONFIRMED", "CANCELLED", "customer")).toBe(true);
    expect(canMove("PENDING", "CONFIRMED", "customer")).toBe(false);
    expect(canMove("CONFIRMED", "COMPLETED", "customer")).toBe(false);
  });
  it("lets a provider confirm or decline a request", () => {
    expect(canMove("PENDING", "CONFIRMED", "provider")).toBe(true);
    expect(canMove("PENDING", "CANCELLED", "provider")).toBe(true);
    expect(canMove("PENDING", "COMPLETED", "provider")).toBe(false);
  });
  it("lets a provider complete or cancel a confirmed booking", () => {
    expect(canMove("CONFIRMED", "COMPLETED", "provider")).toBe(true);
    expect(canMove("CONFIRMED", "CANCELLED", "provider")).toBe(true);
  });
  it("treats completed and cancelled as final for everyone", () => {
    for (const from of ["COMPLETED", "CANCELLED"]) {
      for (const to of ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]) {
        expect(canMove(from, to, "provider")).toBe(false);
        expect(canMove(from, to, "customer")).toBe(false);
      }
    }
  });
  it("rejects unknown target statuses", () => {
    expect(canMove("PENDING", "REFUNDED", "provider")).toBe(false);
  });
});

describe("seatsLeft", () => {
  it("subtracts booked seats and never goes below zero", () => {
    expect(seatsLeft(40, 3)).toBe(37);
    expect(seatsLeft(6, 6)).toBe(0);
    expect(seatsLeft(6, 9)).toBe(0);
  });
});

describe("safeNext", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/admin/providers", "/admin")).toBe("/admin/providers");
  });
  it("falls back for external or malformed targets", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "admin", ""]) {
      expect(safeNext(bad, "/admin")).toBe("/admin");
    }
  });
});

describe("roleForProviderType", () => {
  it("maps provider types to account roles", () => {
    expect(roleForProviderType("UMRAH")).toBe("PROVIDER");
    expect(roleForProviderType("TRANSPORT")).toBe("TRANSPORT");
    expect(roleForProviderType(null)).toBe("PILGRIM");
  });
});
