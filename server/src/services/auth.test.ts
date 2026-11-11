import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { resetDb } from "../../test/factories";
import { checkCredentials, registerUser } from "./auth";

const pilgrim = { name: "Aisha", email: "Aisha@Example.com", password: "password123" };

describe("registerUser", () => {
  beforeEach(resetDb);

  it("creates a pilgrim with a hashed password and a lower-cased email", async () => {
    const id = await registerUser(pilgrim);
    const user = await db.user.findUniqueOrThrow({ where: { id }, include: { provider: true } });
    expect(user).toMatchObject({ email: "aisha@example.com", role: "PILGRIM", provider: null });
    expect(user.passwordHash).not.toContain("password123");
  });

  it("creates providers awaiting approval", async () => {
    const id = await registerUser({ ...pilgrim, as: "transport", companyName: "Haramain Rides", city: "Jeddah" });
    const user = await db.user.findUniqueOrThrow({ where: { id }, include: { provider: true } });
    expect(user.role).toBe("TRANSPORT");
    expect(user.provider).toMatchObject({ type: "TRANSPORT", companyName: "Haramain Rides", status: "PENDING" });
  });

  it("cannot be used to create an admin", async () => {
    const id = await registerUser({ ...pilgrim, as: "admin", role: "ADMIN" });
    expect((await db.user.findUniqueOrThrow({ where: { id } })).role).toBe("PILGRIM");
  });

  it("requires a company name for providers", async () => {
    await expect(registerUser({ ...pilgrim, as: "umrah" })).rejects.toThrow("company name");
  });

  it("rejects weak passwords, bad emails and duplicate accounts", async () => {
    await expect(registerUser({ ...pilgrim, password: "short" })).rejects.toMatchObject({ status: 400 });
    await expect(registerUser({ ...pilgrim, email: "not-an-email" })).rejects.toMatchObject({ status: 400 });
    await registerUser(pilgrim);
    await expect(registerUser({ ...pilgrim, email: "AISHA@example.com" })).rejects.toMatchObject({ status: 409 });
  });
});

describe("checkCredentials", () => {
  beforeEach(resetDb);

  it("accepts the right password, whatever the email's case", async () => {
    const id = await registerUser(pilgrim);
    expect(await checkCredentials({ email: "AISHA@EXAMPLE.COM", password: "password123" })).toEqual({ id, role: "PILGRIM" });
  });

  it("gives the same error for a wrong password and an unknown account", async () => {
    await registerUser(pilgrim);
    const wrong = await checkCredentials({ email: pilgrim.email, password: "wrong-password" }).catch((e) => e);
    const unknown = await checkCredentials({ email: "nobody@example.com", password: "password123" }).catch((e) => e);
    expect(wrong.status).toBe(401);
    expect(unknown.message).toBe(wrong.message);
  });
});
