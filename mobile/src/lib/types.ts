/** Shapes returned by the My Ummah API (server/src/api/routes.ts). Dates arrive as ISO strings. */

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type ProviderType = 'UMRAH' | 'TRANSPORT';

export type Provider = {
  id: string;
  type: ProviderType;
  companyName: string;
  description: string;
  country: string;
  city: string;
  phone: string;
  licenseNo: string;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED';
};

export type User = { id: string; name: string; email: string | null; phone: string | null; role: string; provider: Provider | null };
export type CodeSent = { channel: 'email' | 'whatsapp'; destination: string; devCode?: string };
export type CodeConfirmed = { verificationToken: string; accountExists: boolean };
export type Session = { token: string; user: User };

export type PublicProvider = Pick<Provider, 'id' | 'companyName' | 'description' | 'city' | 'country' | 'licenseNo'>;

export type PackageBase = {
  id: string;
  title: string;
  description: string;
  departureCity: string;
  departureDate: string;
  durationDays: number;
  makkahHotel: string;
  makkahNights: number;
  madinahHotel: string;
  madinahNights: number;
  hotelStars: number;
  priceCents: number;
  seatsTotal: number;
  incFlights: boolean;
  incVisa: boolean;
  incMeals: boolean;
  incTransport: boolean;
  incZiyarah: boolean;
  active: boolean;
};
export type Package = PackageBase & { provider: PublicProvider; seatsLeft: number; isPublic?: boolean; departed?: boolean };
export type MyPackage = PackageBase & { seatsBooked: number };

export type ServiceBase = {
  id: string;
  title: string;
  description: string;
  vehicleType: string;
  capacity: number;
  fromPlace: string;
  toPlace: string;
  priceCents: number;
  active: boolean;
};
export type Service = ServiceBase & { provider: PublicProvider; isPublic?: boolean };
export type MyService = ServiceBase & { bookingCount: number };

export type MyPackageBooking = {
  id: string;
  packageId: string;
  status: BookingStatus;
  travellers: number;
  totalCents: number;
  title: string;
  departureDate: string;
  providerName: string;
  providerPhone: string;
};
export type MyTransportBooking = {
  id: string;
  serviceId: string;
  status: BookingStatus;
  passengers: number;
  pickupAt: string;
  pickupLocation: string;
  totalCents: number;
  title: string;
  fromPlace: string;
  toPlace: string;
  providerName: string;
  providerPhone: string;
};
export type MyBookings = { packages: MyPackageBooking[]; transport: MyTransportBooking[] };

export type ProviderBooking = {
  id: string;
  kind: 'package' | 'transport';
  status: BookingStatus;
  createdAt: string;
  title: string;
  customerName: string;
  /** The customer's sign-in email or phone number. */
  customerContact: string;
  contactPhone: string;
  notes: string;
  totalCents: number;
  commissionCents: number;
  // package bookings
  travellers?: number;
  departureDate?: string;
  // transport bookings
  passengers?: number;
  pickupAt?: string;
  pickupLocation?: string;
};

export type ProviderDashboard = {
  provider: Provider;
  commissionRate: number;
  stats: { listings: number; pending: number; confirmed: number; grossCents: number; commissionCents: number; netCents: number };
};

export type Post = {
  id: string;
  authorId: string;
  authorName: string;
  topic: string;
  title: string;
  body: string;
  score: number;
  createdAt: string;
  commentCount: number;
  myVote: number;
};
export type Comment = { id: string; postId: string; parentId: string | null; authorId: string; authorName: string; body: string; createdAt: string };
export type PostDetail = Post & { comments: Comment[] };

export type Meta = {
  commission: { package: number; transport: number };
  topics: { slug: string; label: string }[];
  vehicleTypes: { value: string; label: string }[];
};
