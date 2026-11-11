/**
 * Checks run on the phone before a form is sent, so people get instant feedback.
 * The server validates everything again; these only need to catch honest mistakes.
 * Each returns an error message, or null when the form is fine.
 */

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
export const isPhone = (v: string) => /^[+\d][\d\s()-]{5,30}$/.test(v.trim());
const isWhole = (v: string) => /^\d+$/.test(v.trim());
const isPrice = (v: string) => /^\d+(\.\d{1,2})?$/.test(v.trim()) && Number(v) > 0;

export function isDay(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v);
}

export function isTime(v: string) {
  const m = /^(\d{2}):(\d{2})$/.exec(v);
  return !!m && Number(m[1]) < 24 && Number(m[2]) < 60;
}

export function validateSignUp(f: { name: string; as: string; companyName: string }) {
  if (f.name.trim().length < 2) return 'Please enter your name.';
  if (f.as !== 'pilgrim' && f.companyName.trim().length < 2) return 'Please enter your company name.';
  return null;
}

export function validatePackageBooking(f: { travellers: string; contactPhone: string }, seatsLeft: number) {
  if (!isWhole(f.travellers) || Number(f.travellers) < 1) return 'Enter the number of travellers.';
  if (Number(f.travellers) > seatsLeft) return seatsLeft === 1 ? 'Only 1 seat is left on this package.' : `Only ${seatsLeft} seats are left on this package.`;
  if (!isPhone(f.contactPhone)) return 'Enter a phone number with your country code.';
  return null;
}

export function validateTransportBooking(
  f: { date: string; time: string; pickupLocation: string; passengers: string; contactPhone: string },
  capacity: number,
) {
  if (!isDay(f.date)) return 'Enter the pickup date as YYYY-MM-DD.';
  if (!isTime(f.time)) return 'Enter the pickup time as HH:MM (24-hour).';
  if (f.pickupLocation.trim().length < 3) return 'Tell the driver where to pick you up.';
  if (!isWhole(f.passengers) || Number(f.passengers) < 1) return 'Enter the number of passengers.';
  if (Number(f.passengers) > capacity) return `This vehicle carries up to ${capacity} passengers.`;
  if (!isPhone(f.contactPhone)) return 'Enter a phone number with your country code.';
  return null;
}

export type PackageForm = {
  title: string;
  description: string;
  departureCity: string;
  departureDate: string;
  durationDays: string;
  makkahHotel: string;
  makkahNights: string;
  madinahHotel: string;
  madinahNights: string;
  hotelStars: string;
  price: string;
  seatsTotal: string;
};

export function validatePackage(f: PackageForm) {
  if (f.title.trim().length < 5) return 'Give the package a title of at least 5 characters.';
  if (f.description.trim().length < 20) return 'Describe the package in at least 20 characters.';
  if (!f.departureCity.trim()) return 'Departure city is required.';
  if (!isDay(f.departureDate)) return 'Enter the departure date as YYYY-MM-DD.';
  if (!isWhole(f.durationDays) || Number(f.durationDays) < 1 || Number(f.durationDays) > 90) return 'Duration must be between 1 and 90 days.';
  if (!f.makkahHotel.trim()) return 'Makkah hotel is required.';
  if (!isWhole(f.makkahNights) || Number(f.makkahNights) < 1) return 'Enter the number of nights in Makkah.';
  const madinahNights = f.madinahNights.trim() === '' ? 0 : isWhole(f.madinahNights) ? Number(f.madinahNights) : NaN;
  if (Number.isNaN(madinahNights)) return 'Nights in Madinah must be a whole number.';
  if (madinahNights > 0 && !f.madinahHotel.trim()) return 'Enter the Madinah hotel.';
  if (Number(f.makkahNights) + madinahNights > Number(f.durationDays)) return 'Hotel nights cannot exceed the trip duration.';
  if (!isWhole(f.hotelStars) || Number(f.hotelStars) < 1 || Number(f.hotelStars) > 5) return 'Hotel rating must be 1 to 5 stars.';
  if (!isPrice(f.price)) return 'Enter a price per person.';
  if (!isWhole(f.seatsTotal) || Number(f.seatsTotal) < 1) return 'Enter how many seats are available.';
  return null;
}

export type ServiceForm = { title: string; vehicleType: string; capacity: string; fromPlace: string; toPlace: string; price: string };

export function validateService(f: ServiceForm) {
  if (f.title.trim().length < 5) return 'Give the service a title of at least 5 characters.';
  if (!f.vehicleType) return 'Choose a vehicle type.';
  if (!isWhole(f.capacity) || Number(f.capacity) < 1 || Number(f.capacity) > 80) return 'Capacity must be between 1 and 80 passengers.';
  if (!f.fromPlace.trim() || !f.toPlace.trim()) return 'Enter where the route starts and ends.';
  if (!isPrice(f.price)) return 'Enter a price per trip.';
  return null;
}

export function validatePost(f: { title: string; body: string; topic: string }) {
  if (f.title.trim().length < 5) return 'Give your post a title of at least 5 characters.';
  if (f.body.trim().length < 10) return 'Write at least a sentence or two.';
  if (!f.topic) return 'Choose a topic.';
  return null;
}
