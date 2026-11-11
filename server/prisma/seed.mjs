// Demo data for local development: `npm run db:seed`. Wipes existing rows first.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const PASSWORD = "password123"; // admin web console only
const PIN = "1234"; // every demo account in the app
const inDays = (n) => new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + n));
const fee = (total, pct) => Math.round((total * pct) / 100);

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed a production database.");

  for (const model of ["planItem", "plan", "ad", "verificationCode", "vote", "comment", "post", "packageBooking", "transportBooking", "package", "transportService", "provider", "user", "setting"]) {
    await db[model].deleteMany();
  }
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const pinHash = await bcrypt.hash(PIN, 10);
  // `contact` is an email address or an E.164 phone number, just like at sign-up.
  const user = (name, contact, role, provider) =>
    db.user.create({
      data: {
        name,
        ...(contact.includes("@") ? { email: contact } : { phone: contact }),
        role,
        pinHash,
        passwordHash: role === "ADMIN" ? passwordHash : null,
        provider: provider && { create: provider },
      },
      include: { provider: true },
    });

  await db.setting.createMany({
    data: [
      { key: "commission_package_pct", value: "8" },
      { key: "commission_transport_pct", value: "10" },
    ],
  });

  await user("Platform Admin", "admin@example.com", "ADMIN");
  const aisha = await user("Aisha Rahman", "pilgrim@example.com", "PILGRIM");
  const yusuf = await user("Yusuf Ali", "+447700900456", "PILGRIM"); // signed up by phone
  const noor = await user("Omar Siddiqui", "provider@example.com", "PROVIDER", {
    type: "UMRAH",
    companyName: "Noor Travel",
    description: "Family-run Umrah specialists since 2008. Every group travels with an experienced guide and a scholar.",
    city: "London",
    country: "United Kingdom",
    phone: "+44 20 7946 0000",
    licenseNo: "ATOL-00000",
    status: "APPROVED",
  });
  const safa = await user("Fatima Hassan", "safa@example.com", "PROVIDER", {
    type: "UMRAH",
    companyName: "Safa Journeys",
    description: "Affordable group Umrah departures from North America with direct flights.",
    city: "Toronto",
    country: "Canada",
    phone: "+1 416 555 0100",
    status: "APPROVED",
  });
  await user("Bilal Khan", "newprovider@example.com", "PROVIDER", {
    type: "UMRAH",
    companyName: "Zamzam Tours",
    city: "Kuala Lumpur",
    country: "Malaysia",
    status: "PENDING",
  });
  const haramain = await user("Khalid Al-Harbi", "transport@example.com", "TRANSPORT", {
    type: "TRANSPORT",
    companyName: "Haramain Rides",
    description: "Licensed private transfers across Jeddah, Makkah and Madinah. English, Arabic and Urdu-speaking drivers.",
    city: "Jeddah",
    country: "Saudi Arabia",
    phone: "+966 12 555 0000",
    status: "APPROVED",
  });

  const pkg = (providerId, data) => db.package.create({ data: { providerId, ...data } });
  const economy = await pkg(noor.provider.id, {
    title: "10-day Economy Umrah",
    description:
      "A well-paced group Umrah for first-timers. Guided Umrah on arrival, daily reminders after Fajr, and a full day of ziyarah in Madinah.\n\nMakkah hotel is a 10-minute walk from the Haram, with a shuttle at prayer times.",
    departureCity: "London",
    departureDate: inDays(35),
    durationDays: 10,
    makkahHotel: "Al Kiswah Towers",
    makkahNights: 5,
    madinahHotel: "Dar Al Eiman Al Haram",
    madinahNights: 4,
    hotelStars: 3,
    priceCents: 145000,
    seatsTotal: 40,
    incFlights: true,
    incVisa: true,
    incTransport: true,
    incZiyarah: true,
  });
  const premium = await pkg(noor.provider.id, {
    title: "14-day Premium Umrah, Clock Tower stay",
    description:
      "Stay steps from the Haram with half-board dining and private transfers throughout. Limited to a small group with a dedicated guide.",
    departureCity: "Manchester",
    departureDate: inDays(60),
    durationDays: 14,
    makkahHotel: "Swissôtel Makkah",
    makkahNights: 7,
    madinahHotel: "Anwar Al Madinah Mövenpick",
    madinahNights: 6,
    hotelStars: 5,
    priceCents: 389000,
    seatsTotal: 20,
    incFlights: true,
    incVisa: true,
    incMeals: true,
    incTransport: true,
    incZiyarah: true,
  });
  const family = await pkg(safa.provider.id, {
    title: "School holiday family Umrah",
    description:
      "Timed for the school break, with family rooms and a children's programme in Madinah. Direct flights to Jeddah and high-speed train between the two cities.",
    departureCity: "Toronto",
    departureDate: inDays(48),
    durationDays: 12,
    makkahHotel: "Makkah Towers",
    makkahNights: 6,
    madinahHotel: "Pullman Zamzam Madina",
    madinahNights: 5,
    hotelStars: 4,
    priceCents: 265000,
    seatsTotal: 30,
    incFlights: true,
    incVisa: true,
    incTransport: true,
  });
  await pkg(safa.provider.id, {
    title: "7-day Makkah only — land package",
    description: "Hotel and ground services only, for pilgrims arranging their own flights. Airport pickup from Jeddah included.",
    departureCity: "Jeddah",
    departureDate: inDays(21),
    durationDays: 7,
    makkahHotel: "Le Méridien Towers Makkah",
    makkahNights: 6,
    hotelStars: 4,
    priceCents: 69000,
    seatsTotal: 6,
    incVisa: true,
    incTransport: true,
  });

  const svc = (data) => db.transportService.create({ data: { providerId: haramain.provider.id, ...data } });
  const airport = await svc({
    title: "Jeddah Airport to Makkah hotel — private sedan",
    description: "Meet and greet in the arrivals hall. 60 minutes of free waiting time after your flight lands.",
    vehicleType: "SEDAN",
    capacity: 4,
    fromPlace: "Jeddah Airport (JED)",
    toPlace: "Makkah",
    priceCents: 7500,
  });
  const suv = await svc({
    title: "Makkah to Madinah — family SUV",
    description: "Door-to-door GMC Yukon with room for luggage. Stops on request.",
    vehicleType: "SUV",
    capacity: 7,
    fromPlace: "Makkah",
    toPlace: "Madinah",
    priceCents: 21000,
  });
  await svc({
    title: "Madinah ziyarah half-day tour — minibus",
    description: "Quba Mosque, Masjid al-Qiblatayn and Uhud, with an English-speaking driver. About four hours.",
    vehicleType: "VAN",
    capacity: 12,
    fromPlace: "Madinah hotel",
    toPlace: "Quba, Qiblatayn, Uhud",
    priceCents: 12000,
  });
  await svc({
    title: "Group coach: Jeddah Airport to Makkah",
    description: "50-seat air-conditioned coach for groups.",
    vehicleType: "BUS",
    capacity: 50,
    fromPlace: "Jeddah Airport (JED)",
    toPlace: "Makkah",
    priceCents: 42000,
  });

  await db.ad.createMany({
    data: [
      { advertiser: "Noor Travel", headline: "Stay steps from the Haram", body: "14 days, 5★ hotels, half-board. Small group with a dedicated guide.", cta: "See package", packageId: premium.id, theme: "brand" },
      { advertiser: "Haramain Rides", headline: "Makkah ⇄ Madinah, door to door", body: "Private family SUV with room for all your luggage.", cta: "Book a ride", serviceId: suv.id, theme: "night" },
      { advertiser: "Safa Journeys", headline: "School holiday family Umrah", body: "Family rooms and a children's programme in Madinah.", cta: "See package", packageId: family.id, theme: "gold" },
    ],
  });

  await db.packageBooking.create({
    data: { packageId: economy.id, userId: aisha.id, travellers: 2, contactPhone: "+44 7700 900123", totalCents: 290000, commissionCents: fee(290000, 8), status: "CONFIRMED" },
  });
  await db.packageBooking.create({
    data: { packageId: economy.id, userId: yusuf.id, travellers: 1, contactPhone: "+44 7700 900456", notes: "Travelling with my elderly father — ground-floor room if possible.", totalCents: 145000, commissionCents: fee(145000, 8) },
  });
  await db.packageBooking.create({
    data: { packageId: family.id, userId: yusuf.id, travellers: 4, contactPhone: "+1 647 555 0199", totalCents: 1060000, commissionCents: fee(1060000, 8), status: "CONFIRMED" },
  });
  await db.transportBooking.create({
    data: { serviceId: airport.id, userId: aisha.id, pickupAt: inDays(35), pickupLocation: "JED Terminal 1 arrivals", passengers: 2, contactPhone: "+44 7700 900123", notes: "Flight SV112", totalCents: 7500, commissionCents: fee(7500, 10), status: "CONFIRMED" },
  });

  const post = async (author, topic, title, body, comments = []) => {
    const p = await db.post.create({ data: { authorId: author.id, topic, title, body, score: 1, votes: { create: { userId: author.id, value: 1 } } } });
    for (const [commenter, text, reply] of comments) {
      const c = await db.comment.create({ data: { postId: p.id, authorId: commenter.id, body: text } });
      if (reply) await db.comment.create({ data: { postId: p.id, authorId: author.id, parentId: c.id, body: reply } });
    }
    return p;
  };
  const p1 = await post(
    aisha,
    "first-timers",
    "First Umrah next month — what do you wish you had known?",
    "I am travelling with my husband and my mother. Any advice on timing tawaf to avoid the biggest crowds, and what to pack that is not on the usual lists?",
    [
      [yusuf, "Go for tawaf mid-morning, a couple of hours after Fajr. It was noticeably quieter for us than after Maghrib or Isha.", "That is really helpful, thank you!"],
      [noor, "Bring a small drawstring bag for your shoes and keep it with you — it saves a lot of searching afterwards."],
    ],
  );
  await db.vote.create({ data: { userId: yusuf.id, postId: p1.id, value: 1 } });
  await db.post.update({ where: { id: p1.id }, data: { score: 2 } });
  await post(yusuf, "travel", "Haramain train or private car from Makkah to Madinah?", "We are a family of five with a fair amount of luggage. Is the train worth it, or is a private car simpler door to door?", [
    [aisha, "With five people and luggage a car worked out about the same price for us, and there is no transfer to and from the stations."],
  ]);
  await post(aisha, "rituals", "Lost count during tawaf — what should I do?", "I was not sure whether I had done five or six rounds. What is the correct thing to do in that situation?");

  console.log(`Seeded.

Mobile app — sign in with one of these, then PIN ${PIN}.
(No email/WhatsApp provider is configured in development, so the app shows the verification code.)
  pilgrim@example.com    pilgrim
  +447700900456          pilgrim who signed up by phone
  provider@example.com   Umrah provider (Noor Travel)
  transport@example.com  transport provider (Haramain Rides)

Web admin console (/admin): admin@example.com / ${PASSWORD}`);
}

main().finally(() => db.$disconnect());
