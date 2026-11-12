/** Shapes returned by the One Ummah API (server/src/api/routes.ts). Dates arrive as ISO strings. */

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
/** 'UMRAH', 'TRANSPORT', or any other kind of service listed in PROVIDER_TYPES. */
export type ProviderType = string;

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
/** Average star rating (to one decimal, null when unrated) and how many reviews it is based on. */
export type Rating = { ratingAverage: number | null; ratingCount: number };
export type Package = PackageBase & Rating & { provider: PublicProvider; seatsLeft: number; isPublic?: boolean; departed?: boolean };
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
export type Service = ServiceBase & Rating & { provider: PublicProvider; isPublic?: boolean };
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
  prices: Record<string, string>;
  providerTypes: { value: string; label: string; description: string; listings: string | null }[];
  planStages: { value: string; label: string }[];
  topics: { slug: string; label: string }[];
  vehicleTypes: { value: string; label: string }[];
};

export type Ad = {
  id: string;
  advertiser: string;
  headline: string;
  body: string;
  cta: string;
  theme: string;
  /** The listing a tap opens; both null for a display-only ad. */
  packageId: string | null;
  serviceId: string | null;
};

export type PlanItem = { id: string; planId: string; stage: string; text: string; done: boolean; position: number };
type PlanBase = { id: string; title: string; departDate: string | null; returnDate: string | null; travellers: number; notes: string };
export type PlanSummary = PlanBase & { itemCount: number; doneCount: number };
export type Plan = PlanBase & { items: PlanItem[] };

export type ReviewKind = 'package' | 'transport';
export type Review = {
  id: string;
  rating: number;
  comment: string;
  /** First name only. */
  authorName: string;
  /** The reviewer had a booking the provider accepted. */
  verified: boolean;
  /** Written by the person viewing. */
  mine: boolean;
  createdAt: string;
};
export type ReviewList = Rating & { reviews: Review[] };
