"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireProvider } from "@/lib/auth";
import { VEHICLE_TYPES } from "@/lib/constants";
import { between, cents, int, str, type FormState } from "@/lib/form";

export async function updateProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const { provider } = await requireProvider();
  const companyName = str(fd, "companyName", 120);
  if (companyName.length < 2) return { error: "Company name is required." };
  await db.provider.update({
    where: { id: provider.id },
    data: {
      companyName,
      description: str(fd, "description", 2000),
      country: str(fd, "country", 80),
      city: str(fd, "city", 80),
      phone: str(fd, "phone", 40),
      licenseNo: str(fd, "licenseNo", 80),
    },
  });
  revalidatePath("/dashboard", "layout");
  return { ok: "Profile saved." };
}

function readPackage(fd: FormData) {
  const raw = str(fd, "departureDate", 10);
  const data = {
    title: str(fd, "title", 120),
    description: str(fd, "description", 4000),
    departureCity: str(fd, "departureCity", 80),
    departureDate: /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00Z`) : new Date(NaN),
    durationDays: int(fd, "durationDays"),
    makkahHotel: str(fd, "makkahHotel", 120),
    makkahNights: int(fd, "makkahNights"),
    madinahHotel: str(fd, "madinahHotel", 120),
    madinahNights: int(fd, "madinahNights") || 0,
    hotelStars: int(fd, "hotelStars"),
    priceCents: cents(fd, "price"),
    seatsTotal: int(fd, "seatsTotal"),
    incFlights: fd.get("incFlights") === "on",
    incVisa: fd.get("incVisa") === "on",
    incMeals: fd.get("incMeals") === "on",
    incTransport: fd.get("incTransport") === "on",
    incZiyarah: fd.get("incZiyarah") === "on",
    active: fd.get("active") === "on",
  };
  let error: string | null = null;
  if (data.title.length < 5) error = "Give the package a title of at least 5 characters.";
  else if (data.description.length < 20) error = "Describe the package in at least 20 characters.";
  else if (!data.departureCity) error = "Departure city is required.";
  else if (Number.isNaN(data.departureDate.getTime())) error = "Choose a departure date.";
  else if (!between(data.durationDays, 1, 90)) error = "Duration must be between 1 and 90 days.";
  else if (!data.makkahHotel) error = "Makkah hotel is required.";
  else if (!between(data.makkahNights, 1, 90)) error = "Enter the number of nights in Makkah.";
  else if (!between(data.madinahNights, 0, 90)) error = "Nights in Madinah must be 0 or more.";
  else if (data.makkahNights + data.madinahNights > data.durationDays) error = "Hotel nights cannot exceed the trip duration.";
  else if (!between(data.hotelStars, 1, 5)) error = "Hotel rating must be 1 to 5 stars.";
  else if (!between(data.priceCents, 100, 10_000_000)) error = "Enter a price per person.";
  else if (!between(data.seatsTotal, 1, 5000)) error = "Enter how many seats are available.";
  return { data, error };
}

export async function savePackage(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  const { provider } = await requireProvider("UMRAH");
  const { data, error } = readPackage(fd);
  if (error) return { error };

  if (id) {
    // updateMany scopes the write to this provider's own package.
    const res = await db.package.updateMany({ where: { id, providerId: provider.id }, data });
    if (res.count === 0) return { error: "Package not found." };
  } else {
    await db.package.create({ data: { ...data, providerId: provider.id } });
  }
  revalidatePath("/packages");
  redirect("/dashboard/packages");
}

export async function deletePackage(id: string) {
  const { provider } = await requireProvider("UMRAH");
  const live = await db.packageBooking.count({
    where: { packageId: id, package: { providerId: provider.id }, status: { in: ["PENDING", "CONFIRMED"] } },
  });
  // Packages with open bookings are hidden rather than deleted so pilgrims keep their record.
  if (live > 0) await db.package.updateMany({ where: { id, providerId: provider.id }, data: { active: false } });
  else await db.package.deleteMany({ where: { id, providerId: provider.id } });
  revalidatePath("/dashboard/packages");
  revalidatePath("/packages");
}

export async function saveService(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  const { provider } = await requireProvider("TRANSPORT");
  const data = {
    title: str(fd, "title", 120),
    description: str(fd, "description", 2000),
    vehicleType: str(fd, "vehicleType", 10),
    capacity: int(fd, "capacity"),
    fromPlace: str(fd, "fromPlace", 120),
    toPlace: str(fd, "toPlace", 120),
    priceCents: cents(fd, "price"),
    active: fd.get("active") === "on",
  };
  if (data.title.length < 5) return { error: "Give the service a title of at least 5 characters." };
  if (!(VEHICLE_TYPES as readonly string[]).includes(data.vehicleType)) return { error: "Choose a vehicle type." };
  if (!between(data.capacity, 1, 80)) return { error: "Capacity must be between 1 and 80 passengers." };
  if (!data.fromPlace || !data.toPlace) return { error: "Enter where the route starts and ends." };
  if (!between(data.priceCents, 100, 1_000_000)) return { error: "Enter a price per trip." };

  if (id) {
    const res = await db.transportService.updateMany({ where: { id, providerId: provider.id }, data });
    if (res.count === 0) return { error: "Service not found." };
  } else {
    await db.transportService.create({ data: { ...data, providerId: provider.id } });
  }
  revalidatePath("/transport");
  redirect("/dashboard/services");
}

export async function deleteService(id: string) {
  const { provider } = await requireProvider("TRANSPORT");
  const live = await db.transportBooking.count({
    where: { serviceId: id, service: { providerId: provider.id }, status: { in: ["PENDING", "CONFIRMED"] } },
  });
  if (live > 0) await db.transportService.updateMany({ where: { id, providerId: provider.id }, data: { active: false } });
  else await db.transportService.deleteMany({ where: { id, providerId: provider.id } });
  revalidatePath("/dashboard/services");
  revalidatePath("/transport");
}
