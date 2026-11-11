import { db } from "@/lib/db";
import { USER_SELECT as SELECT, type SessionUser } from "@/lib/auth";

let n = 0;

export async function resetDb() {
  await db.planItem.deleteMany();
  await db.plan.deleteMany();
  await db.ad.deleteMany();
  await db.verificationCode.deleteMany();
  await db.vote.deleteMany();
  await db.comment.deleteMany();
  await db.post.deleteMany();
  await db.packageBooking.deleteMany();
  await db.transportBooking.deleteMany();
  await db.package.deleteMany();
  await db.transportService.deleteMany();
  await db.provider.deleteMany();
  await db.user.deleteMany();
  await db.setting.deleteMany();
}

export function makeUser(role = "PILGRIM"): Promise<SessionUser> {
  n++;
  return db.user.create({ data: { name: `User ${n}`, email: `user${n}@test.dev`, role }, select: SELECT });
}

export function makeProvider(type: string, status = "APPROVED"): Promise<SessionUser> {
  n++;
  return db.user.create({
    data: {
      name: `Provider ${n}`,
      email: `provider${n}@test.dev`,
      role: type === "UMRAH" ? "PROVIDER" : "TRANSPORT",
      provider: { create: { type, companyName: `Company ${n}`, phone: "+966 500 000 000", status } },
    },
    select: SELECT,
  });
}

export const inDays = (days: number) => new Date(Date.now() + days * 86_400_000);

export function makePackage(owner: SessionUser, overrides: Record<string, unknown> = {}) {
  return db.package.create({
    data: {
      providerId: owner.provider!.id,
      title: "Test package",
      description: "A package used in tests.",
      departureCity: "London",
      departureDate: inDays(30),
      durationDays: 10,
      makkahHotel: "Hotel",
      makkahNights: 5,
      priceCents: 100_000,
      seatsTotal: 10,
      ...overrides,
    },
  });
}

export function makeService(owner: SessionUser, overrides: Record<string, unknown> = {}) {
  return db.transportService.create({
    data: {
      providerId: owner.provider!.id,
      title: "Test transfer",
      description: "",
      vehicleType: "SEDAN",
      capacity: 4,
      fromPlace: "Jeddah Airport",
      toPlace: "Makkah",
      priceCents: 8_000,
      ...overrides,
    },
  });
}

/** A valid package form, as the mobile app would send it. */
export const packageForm = {
  title: "10-day Umrah",
  description: "Flights, hotels and guided rites.",
  departureCity: "London",
  departureDate: "2031-03-01",
  durationDays: "10",
  makkahHotel: "Hotel A",
  makkahNights: "5",
  madinahHotel: "Hotel B",
  madinahNights: "4",
  hotelStars: "4",
  price: "1450",
  seatsTotal: "40",
  incVisa: true,
  active: true,
};

export const serviceForm = {
  title: "Airport transfer",
  vehicleType: "SUV",
  capacity: "7",
  fromPlace: "Jeddah Airport",
  toPlace: "Makkah",
  price: "75.50",
  active: true,
};
