import type { Comment, Package, Service, User } from '@/lib/types';

export const provider = { id: 'prov1', companyName: 'Noor Travel', description: '', city: 'London', country: 'UK', licenseNo: '' };

export const pkg: Package = {
  id: 'pkg1',
  title: '10-day Economy Umrah',
  description: 'A well-paced group Umrah.',
  departureCity: 'London',
  departureDate: '2026-12-15T00:00:00.000Z',
  durationDays: 10,
  makkahHotel: 'Al Kiswah Towers',
  makkahNights: 5,
  madinahHotel: 'Dar Al Eiman',
  madinahNights: 4,
  hotelStars: 3,
  priceCents: 145_000,
  seatsTotal: 40,
  incFlights: true,
  incVisa: true,
  incMeals: false,
  incTransport: false,
  incZiyarah: true,
  active: true,
  provider,
  seatsLeft: 37,
  ratingAverage: 4.5,
  ratingCount: 12,
};

export const service: Service = {
  id: 'svc1',
  title: 'Jeddah Airport to Makkah',
  description: '',
  vehicleType: 'SUV',
  capacity: 7,
  fromPlace: 'Jeddah Airport',
  toPlace: 'Makkah',
  priceCents: 7_550,
  active: true,
  provider,
  ratingAverage: null,
  ratingCount: 0,
};

export const user: User = { id: 'u1', name: 'Aisha Rahman', email: 'aisha@example.com', phone: null, role: 'PILGRIM', provider: null };

export const comment = (id: string, parentId: string | null = null): Comment => ({
  id,
  postId: 'post1',
  parentId,
  authorId: 'u1',
  authorName: 'Aisha',
  body: `Comment ${id}`,
  createdAt: '2026-11-01T10:00:00.000Z',
});
