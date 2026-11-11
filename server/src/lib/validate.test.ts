import { describe, expect, it } from "vitest";
import { between, bool, cents, fromFormData, int, isEmail, isPhone, parseDay, parseSaudiDateTime, str } from "./validate";

describe("str", () => {
  it("trims and caps length", () => {
    expect(str({ a: "  hello  " }, "a")).toBe("hello");
    expect(str({ a: "abcdef" }, "a", 3)).toBe("abc");
  });
  it("stringifies numbers and ignores everything else", () => {
    expect(str({ a: 12 }, "a")).toBe("12");
    expect(str({ a: null }, "a")).toBe("");
    expect(str({ a: { x: 1 } }, "a")).toBe("");
    expect(str({}, "a")).toBe("");
  });
});

describe("int", () => {
  it("parses whole numbers from strings or numbers", () => {
    expect(int({ n: "42" }, "n")).toBe(42);
    expect(int({ n: 7 }, "n")).toBe(7);
    expect(int({ n: "-3" }, "n")).toBe(-3);
  });
  it("returns NaN for decimals, text and missing values", () => {
    expect(int({ n: "4.5" }, "n")).toBeNaN();
    expect(int({ n: "12abc" }, "n")).toBeNaN();
    expect(int({}, "n")).toBeNaN();
  });
});

describe("cents", () => {
  it("converts currency amounts to cents without float drift", () => {
    expect(cents({ p: "1450" }, "p")).toBe(145_000);
    expect(cents({ p: "999.5" }, "p")).toBe(99_950);
    expect(cents({ p: "19.99" }, "p")).toBe(1_999);
    expect(cents({ p: 75 }, "p")).toBe(7_500);
  });
  it("rejects negatives, extra decimals and text", () => {
    expect(cents({ p: "-5" }, "p")).toBeNaN();
    expect(cents({ p: "1.999" }, "p")).toBeNaN();
    expect(cents({ p: "free" }, "p")).toBeNaN();
    expect(cents({}, "p")).toBeNaN();
  });
});

describe("bool", () => {
  it("accepts JSON true and HTML checkbox values only", () => {
    expect(bool({ a: true }, "a")).toBe(true);
    expect(bool({ a: "on" }, "a")).toBe(true);
    expect(bool({ a: "true" }, "a")).toBe(true);
    expect(bool({ a: false }, "a")).toBe(false);
    expect(bool({ a: 1 }, "a")).toBe(false);
    expect(bool({}, "a")).toBe(false);
  });
});

describe("between", () => {
  it("requires an integer inside the range", () => {
    expect(between(1, 1, 5)).toBe(true);
    expect(between(5, 1, 5)).toBe(true);
    expect(between(0, 1, 5)).toBe(false);
    expect(between(2.5, 1, 5)).toBe(false);
    expect(between(NaN, 1, 5)).toBe(false);
  });
});

describe("isEmail / isPhone", () => {
  it("recognises plausible emails", () => {
    expect(isEmail("a@b.co")).toBe(true);
    expect(isEmail("a@b")).toBe(false);
    expect(isEmail("a b@c.com")).toBe(false);
  });
  it("recognises international phone numbers", () => {
    expect(isPhone("+44 7700 900123")).toBe(true);
    expect(isPhone("(020) 7946-0000")).toBe(false); // must start with + or a digit
    expect(isPhone("0207 946 0000")).toBe(true);
    expect(isPhone("12345")).toBe(false);
    expect(isPhone("call me")).toBe(false);
  });
});

describe("parseDay", () => {
  it("parses a calendar day as midnight UTC", () => {
    expect(parseDay("2031-03-01")?.toISOString()).toBe("2031-03-01T00:00:00.000Z");
  });
  it("rejects malformed and impossible dates", () => {
    expect(parseDay("01/03/2031")).toBeNull();
    expect(parseDay("2031-02-31")).toBeNull();
    expect(parseDay("2031-13-01")).toBeNull();
    expect(parseDay("")).toBeNull();
  });
});

describe("parseSaudiDateTime", () => {
  it("reads the value as Saudi local time (UTC+3)", () => {
    expect(parseSaudiDateTime("2030-01-05T14:30")?.toISOString()).toBe("2030-01-05T11:30:00.000Z");
  });
  it("crosses the date line correctly for early-morning pickups", () => {
    expect(parseSaudiDateTime("2030-01-05T01:00")?.toISOString()).toBe("2030-01-04T22:00:00.000Z");
  });
  it("rejects malformed values", () => {
    expect(parseSaudiDateTime("2030-01-05 14:30")).toBeNull();
    expect(parseSaudiDateTime("2030-02-30T10:00")).toBeNull();
    expect(parseSaudiDateTime("2030-01-05T25:00")).toBeNull();
    expect(parseSaudiDateTime("")).toBeNull();
  });
});

describe("fromFormData", () => {
  it("keeps string fields and drops files", () => {
    const fd = new FormData();
    fd.set("name", "Aisha");
    fd.set("file", new Blob(["x"]));
    expect(fromFormData(fd)).toEqual({ name: "Aisha" });
  });
});
