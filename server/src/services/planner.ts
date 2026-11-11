import "server-only";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { PLAN_STAGES, PLAN_TEMPLATE } from "@/lib/constants";
import { badRequest, notFound } from "@/lib/errors";
import { between, int, parseDay, str, type Input } from "@/lib/validate";

export const MAX_PLANS = 10;
export const MAX_ITEMS = 100;

const isStage = (v: string) => PLAN_STAGES.some((s) => s.value === v);

/** Validates the trip details of a plan. Exported for unit tests. */
export function readPlan(input: Input) {
  const departRaw = str(input, "departDate", 10);
  const returnRaw = str(input, "returnDate", 10);
  const data = {
    title: str(input, "title", 80),
    departDate: departRaw ? parseDay(departRaw) : null,
    returnDate: returnRaw ? parseDay(returnRaw) : null,
    travellers: str(input, "travellers") === "" ? 1 : int(input, "travellers"),
    notes: str(input, "notes", 2000),
  };
  let error: string | null = null;
  if (data.title.length < 2) error = "Give your plan a name.";
  else if ((departRaw && !data.departDate) || (returnRaw && !data.returnDate)) error = "Enter dates as YYYY-MM-DD.";
  else if (data.departDate && data.returnDate && data.returnDate < data.departDate) error = "The return date is before the departure date.";
  else if (!between(data.travellers, 1, 50)) error = "Travellers must be between 1 and 50.";
  return { data, error };
}

export async function listPlans(user: SessionUser) {
  const plans = await db.plan.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { select: { done: true } } },
  });
  return plans.map(({ items, userId: _userId, ...plan }) => ({ ...plan, itemCount: items.length, doneCount: items.filter((i) => i.done).length }));
}

/** Creates a plan pre-filled with the standard Umrah checklist. */
export async function createPlan(user: SessionUser, input: Input) {
  const { data, error } = readPlan(input);
  if (error) throw badRequest(error);
  if ((await db.plan.count({ where: { userId: user.id } })) >= MAX_PLANS) {
    throw badRequest(`You can keep up to ${MAX_PLANS} plans. Delete one you no longer need first.`);
  }
  const plan = await db.plan.create({
    data: { ...data, userId: user.id, items: { create: PLAN_TEMPLATE.map(([stage, text], position) => ({ stage, text, position })) } },
  });
  return getPlan(user, plan.id);
}

/** A plan with its checklist in display order. Other people's plans do not exist as far as the caller can tell. */
export async function getPlan(user: SessionUser, id: string) {
  const plan = await db.plan.findFirst({
    where: { id, userId: user.id },
    include: { items: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] } },
  });
  if (!plan) throw notFound("This plan does not exist.");
  const { userId: _userId, ...rest } = plan;
  return rest;
}

export async function updatePlan(user: SessionUser, id: string, input: Input) {
  const { data, error } = readPlan(input);
  if (error) throw badRequest(error);
  const res = await db.plan.updateMany({ where: { id, userId: user.id }, data });
  if (res.count === 0) throw notFound("This plan does not exist.");
  return getPlan(user, id);
}

export async function deletePlan(user: SessionUser, id: string) {
  const res = await db.plan.deleteMany({ where: { id, userId: user.id } });
  if (res.count === 0) throw notFound("This plan does not exist.");
  return { deleted: true };
}

export async function addItem(user: SessionUser, planId: string, input: Input) {
  const text = str(input, "text", 200);
  const stage = str(input, "stage", 20);
  if (text.length < 2) throw badRequest("Write what needs doing.");
  if (!isStage(stage)) throw badRequest("Choose which part of the trip this belongs to.");

  const plan = await db.plan.findFirst({ where: { id: planId, userId: user.id }, select: { _count: { select: { items: true } } } });
  if (!plan) throw notFound("This plan does not exist.");
  if (plan._count.items >= MAX_ITEMS) throw badRequest(`A plan can hold up to ${MAX_ITEMS} items.`);

  // New items go to the end of the list.
  const last = await db.planItem.aggregate({ where: { planId }, _max: { position: true } });
  return db.planItem.create({ data: { planId, stage, text, position: (last._max.position ?? -1) + 1 } });
}

/** Ticks or unticks an item, and/or rewords it. Only the fields sent are changed. */
export async function updateItem(user: SessionUser, itemId: string, input: Input) {
  const data: { done?: boolean; text?: string } = {};
  if (typeof input.done === "boolean") data.done = input.done;
  if (input.text !== undefined) {
    const text = str(input, "text", 200);
    if (text.length < 2) throw badRequest("Write what needs doing.");
    data.text = text;
  }
  if (Object.keys(data).length === 0) throw badRequest("Nothing to change.");

  const res = await db.planItem.updateMany({ where: { id: itemId, plan: { userId: user.id } }, data });
  if (res.count === 0) throw notFound("This item does not exist.");
  return db.planItem.findUniqueOrThrow({ where: { id: itemId } });
}

export async function deleteItem(user: SessionUser, itemId: string) {
  const res = await db.planItem.deleteMany({ where: { id: itemId, plan: { userId: user.id } } });
  if (res.count === 0) throw notFound("This item does not exist.");
  return { deleted: true };
}
