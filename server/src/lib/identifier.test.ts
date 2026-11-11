import { describe, expect, it } from "vitest";
import { isPin, maskIdentifier, parseIdentifier } from "./identifier";

describe("parseIdentifier", () => {
  it("recognises email addresses and lower-cases them", () => {
    expect(parseIdentifier("  Aisha@Example.com ")).toEqual({ kind: "email", value: "aisha@example.com" });
  });
  it("normalises phone numbers to E.164", () => {
    expect(parseIdentifier("+44 7700 900123")).toEqual({ kind: "phone", value: "+447700900123" });
    expect(parseIdentifier("+1 (416) 555-0100")).toEqual({ kind: "phone", value: "+14165550100" });
    expect(parseIdentifier("00966 50 123 4567")).toEqual({ kind: "phone", value: "+966501234567" });
  });
  it("rejects phone numbers without a country code", () => {
    expect(parseIdentifier("07700 900123")).toBeNull();
    expect(parseIdentifier("7700900123")).toBeNull();
  });
  it("rejects anything else", () => {
    for (const bad of ["", "aisha", "aisha@example", "a b@c.com", "+12", "+0123456789", "+44 7700 900123 ext 5", null, 42, {}]) {
      expect(parseIdentifier(bad)).toBeNull();
    }
  });
});

describe("maskIdentifier", () => {
  it("hides most of an email's name", () => {
    expect(maskIdentifier({ kind: "email", value: "aisha@example.com" })).toBe("a•••@example.com");
  });
  it("shows only the country code and last four digits of a phone", () => {
    expect(maskIdentifier({ kind: "phone", value: "+447700900123" })).toBe("+44••••••0123");
  });
});

describe("isPin", () => {
  it("accepts exactly four digits as a string", () => {
    expect(isPin("0412")).toBe(true);
    for (const bad of ["123", "12345", "12a4", " 1234", 1234, null, undefined]) expect(isPin(bad)).toBe(false);
  });
});
