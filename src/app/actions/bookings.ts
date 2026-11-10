"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getUser, requireUser } from "@/lib/auth";
import { commissionOn, getCommissionRates } from "@/lib/settings";
import { between, int, str, type FormState } from "@/lib/form";

const PHONE = /^[+\d][\d\s()-]{5,30}$/;

export async function bookPackage(packageId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/packages/${packageId}`)}`);

  const travellers = int(fd, "travellers");
  const contactPhone = str(fd, "contactPhone", 40);
  if (!between(travellers, 1, 50)) return { error: "Enter the number of travellers (1–50)." };
  if (!PHONE.test(contactPhone)) return { error: "Enter a phone number the provider can reach you on." };

  const rates = await getCommissionRates();

  const error = await db.$transaction(async (tx) => {
    const pkg = await tx.package.findUnique({
      where: { id: packageId },
      include: { provider: { select: { status: true } } },
    });
    if (!pkg || !pkg.active || pkg.provider.status !== "APPROVED") return "This package is no longer available.";
    if (pkg.departureDate < new Date()) return "This package has already departed.";

    const booked = await tx.packageBooking.aggregate({
      where: { packageId, status: { not: "CANCELLED" } },
      _sum: { travellers: true },
    });
    const left = pkg.seatsTotal - (booked._sum.travellers ?? 0);
    if (travellers > left) return left > 0 ? `Only ${left} seat${left === 1 ? "" : "s"} left on this package.` : "This package is fully booked.";

    const totalCents = pkg.priceCents * travellers;
    await tx.packageBooking.create({
      data: {
        packageId,
        userId: user.id,
        travellers,
        contactPhone,
        notes: str(fd, "notes", 1000),
        totalCents,
        commissionCents: commissionOn(totalCents, rates.package),
      },
    });
    return null;
  });

  if (error) return { error };
  redirect("/bookings?booked=1");
}

export async function bookTransport(serviceId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/transport/${serviceId}`)}`);

  const passengers = int(fd, "passengers");
  const contactPhone = str(fd, "contactPhone", 40);
  const pickupLocation = str(fd, "pickupLocation", 200);
  // <input type="datetime-local"> has no zone; pickup times are treated as Saudi local time (UTC+3).
  const raw = str(fd, "pickupAt", 20);
  const pickupAt = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw) ? new Date(`${raw}:00+03:00`) : new Date(NaN);

  if (Number.isNaN(pickupAt.getTime())) return { error: "Choose a pickup date and time." };
  if (pickupAt < new Date()) return { error: "The pickup time must be in the future." };
  if (pickupLocation.length < 3) return { error: "Tell the driver where to pick you up." };
  if (!PHONE.test(contactPhone)) return { error: "Enter a phone number the driver can reach you on." };

  const service = await db.transportService.findUnique({
    where: { id: serviceId },
    include: { provider: { select: { status: true } } },
  });
  if (!service || !service.active || service.provider.status !== "APPROVED") {
    return { error: "This service is no longer available." };
  }
  if (!between(passengers, 1, service.capacity)) {
    return { error: `This vehicle carries up to ${service.capacity} passengers.` };
  }

  const rates = await getCommissionRates();
  await db.transportBooking.create({
    data: {
      serviceId,
      userId: user.id,
      pickupAt,
      pickupLocation,
      passengers,
      contactPhone,
      notes: str(fd, "notes", 1000),
      totalCents: service.priceCents,
      commissionCents: commissionOn(service.priceCents, rates.transport),
    },
  });
  redirect("/bookings?booked=1");
}

/** Allowed status moves: the customer may only cancel; the provider runs the rest. */
function canMove(from: string, to: string, actor: "customer" | "provider") {
  if (actor === "customer") return to === "CANCELLED" && (from === "PENDING" || from === "CONFIRMED");
  if (from === "PENDING") return to === "CONFIRMED" || to === "CANCELLED";
  if (from === "CONFIRMED") return to === "COMPLETED" || to === "CANCELLED";
  return false;
}

export async function setBookingStatus(kind: "package" | "transport", bookingId: string, to: string) {
  const user = await requireUser();

  const booking =
    kind === "package"
      ? await db.packageBooking.findUnique({
          where: { id: bookingId },
          select: { status: true, userId: true, package: { select: { providerId: true } } },
        }).then((b) => b && { status: b.status, userId: b.userId, providerId: b.package.providerId })
      : await db.transportBooking.findUnique({
          where: { id: bookingId },
          select: { status: true, userId: true, service: { select: { providerId: true } } },
        }).then((b) => b && { status: b.status, userId: b.userId, providerId: b.service.providerId });
  if (!booking) return;

  const isProvider = !!user.provider && user.provider.id === booking.providerId;
  const isCustomer = booking.userId === user.id;
  const allowed =
    (isProvider && canMove(booking.status, to, "provider")) || (isCustomer && canMove(booking.status, to, "customer"));
  if (!allowed) return;

  // Guard on the previous status so two simultaneous updates cannot both apply.
  const where = { id: bookingId, status: booking.status };
  if (kind === "package") await db.packageBooking.updateMany({ where, data: { status: to } });
  else await db.transportBooking.updateMany({ where, data: { status: to } });

  revalidatePath("/bookings");
  revalidatePath("/dashboard", "layout");
}
