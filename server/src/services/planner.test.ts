import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { PLAN_STAGES, PLAN_TEMPLATE } from "@/lib/constants";
import { makeUser, resetDb } from "../../test/factories";
import * as planner from "./planner";

const trip = { title: "Family Umrah", departDate: "2031-03-01", returnDate: "2031-03-12", travellers: "4", notes: "Mum needs a wheelchair." };

describe("readPlan", () => {
  it("accepts trip details and parses the dates", () => {
    const { data, error } = planner.readPlan(trip);
    expect(error).toBeNull();
    expect(data).toMatchObject({ title: "Family Umrah", travellers: 4, notes: "Mum needs a wheelchair." });
    expect(data.departDate?.toISOString()).toBe("2031-03-01T00:00:00.000Z");
  });

  it("lets someone start a plan before they know their dates", () => {
    const { data, error } = planner.readPlan({ title: "Umrah one day" });
    expect(error).toBeNull();
    expect(data).toMatchObject({ departDate: null, returnDate: null, travellers: 1 });
  });

  it.each([
    [{ title: "" }, /name/],
    [{ departDate: "March" }, /YYYY-MM-DD/],
    [{ returnDate: "2031-02-01" }, /before the departure/],
    [{ travellers: "0" }, /between 1 and 50/],
    [{ travellers: "many" }, /between 1 and 50/],
  ])("rejects %j", (patch, message) => {
    expect(planner.readPlan({ ...trip, ...patch }).error).toMatch(message);
  });
});

describe("the checklist template", () => {
  it("only uses known stages and has no duplicates", () => {
    const stages = PLAN_STAGES.map((s) => s.value) as string[];
    for (const [stage] of PLAN_TEMPLATE) expect(stages).toContain(stage);
    expect(new Set(PLAN_TEMPLATE.map(([, text]) => text)).size).toBe(PLAN_TEMPLATE.length);
  });

  it("follows the order of the trip", () => {
    const order = PLAN_TEMPLATE.map(([stage]) => PLAN_STAGES.findIndex((s) => s.value === stage));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});

describe("planner", () => {
  beforeEach(resetDb);

  it("creates a plan pre-filled with the standard checklist, nothing ticked", async () => {
    const plan = await planner.createPlan(await makeUser(), trip);
    expect(plan.items).toHaveLength(PLAN_TEMPLATE.length);
    expect(plan.items.map((i) => i.text)).toEqual(PLAN_TEMPLATE.map(([, text]) => text));
    expect(plan.items.every((i) => !i.done)).toBe(true);
    expect(plan).not.toHaveProperty("userId");
  });

  it("lists my plans with progress, newest first", async () => {
    const user = await makeUser();
    const first = await planner.createPlan(user, trip);
    await db.plan.update({ where: { id: first.id }, data: { createdAt: new Date(Date.now() - 60_000) } });
    await planner.createPlan(user, { title: "Ramadan Umrah" });
    await planner.updateItem(user, first.items[0].id, { done: true });
    await planner.updateItem(user, first.items[1].id, { done: true });

    const list = await planner.listPlans(user);
    expect(list.map((p) => [p.title, p.doneCount, p.itemCount])).toEqual([
      ["Ramadan Umrah", 0, PLAN_TEMPLATE.length],
      ["Family Umrah", 2, PLAN_TEMPLATE.length],
    ]);
  });

  it("ticks, unticks and rewords an item", async () => {
    const user = await makeUser();
    const { items } = await planner.createPlan(user, trip);
    expect((await planner.updateItem(user, items[0].id, { done: true })).done).toBe(true);
    expect((await planner.updateItem(user, items[0].id, { done: false })).done).toBe(false);
    expect(await planner.updateItem(user, items[0].id, { text: "Renew my passport" })).toMatchObject({ text: "Renew my passport", done: false });
    await expect(planner.updateItem(user, items[0].id, {})).rejects.toMatchObject({ status: 400 });
    await expect(planner.updateItem(user, items[0].id, { text: " " })).rejects.toMatchObject({ status: 400 });
  });

  it("adds my own items at the end and removes them", async () => {
    const user = await makeUser();
    const plan = await planner.createPlan(user, trip);
    const item = await planner.addItem(user, plan.id, { text: "Buy gifts for the family", stage: "MADINAH" });
    const after = await planner.getPlan(user, plan.id);
    expect(after.items.at(-1)).toMatchObject({ id: item.id, text: "Buy gifts for the family", stage: "MADINAH" });

    await planner.deleteItem(user, item.id);
    expect((await planner.getPlan(user, plan.id)).items).toHaveLength(PLAN_TEMPLATE.length);
  });

  it("rejects an item with no text or an unknown stage", async () => {
    const user = await makeUser();
    const plan = await planner.createPlan(user, trip);
    await expect(planner.addItem(user, plan.id, { text: "", stage: "MAKKAH" })).rejects.toMatchObject({ status: 400 });
    await expect(planner.addItem(user, plan.id, { text: "Go shopping", stage: "DUBAI" })).rejects.toMatchObject({ status: 400 });
  });

  it("updates trip details and deletes a plan with its items", async () => {
    const user = await makeUser();
    const plan = await planner.createPlan(user, trip);
    expect(await planner.updatePlan(user, plan.id, { ...trip, title: "Umrah with Mum", travellers: "2" })).toMatchObject({ title: "Umrah with Mum", travellers: 2 });
    await expect(planner.updatePlan(user, plan.id, { ...trip, title: "" })).rejects.toMatchObject({ status: 400 });

    await planner.deletePlan(user, plan.id);
    expect(await db.plan.count()).toBe(0);
    expect(await db.planItem.count()).toBe(0);
  });

  it("keeps plans private: nobody else can read or change them", async () => {
    const owner = await makeUser();
    const stranger = await makeUser();
    const plan = await planner.createPlan(owner, trip);
    const itemId = plan.items[0].id;

    expect(await planner.listPlans(stranger)).toEqual([]);
    await expect(planner.getPlan(stranger, plan.id)).rejects.toMatchObject({ status: 404 });
    await expect(planner.updatePlan(stranger, plan.id, trip)).rejects.toMatchObject({ status: 404 });
    await expect(planner.deletePlan(stranger, plan.id)).rejects.toMatchObject({ status: 404 });
    await expect(planner.addItem(stranger, plan.id, { text: "Sneaky", stage: "MAKKAH" })).rejects.toMatchObject({ status: 404 });
    await expect(planner.updateItem(stranger, itemId, { done: true })).rejects.toMatchObject({ status: 404 });
    await expect(planner.deleteItem(stranger, itemId)).rejects.toMatchObject({ status: 404 });
    expect((await planner.getPlan(owner, plan.id)).items[0].done).toBe(false);
  });

  it("limits how many plans one person can keep", async () => {
    const user = await makeUser();
    for (let i = 0; i < planner.MAX_PLANS; i++) await planner.createPlan(user, { title: `Plan ${i}` });
    await expect(planner.createPlan(user, { title: "One too many" })).rejects.toThrow("up to 10 plans");
  });
});
