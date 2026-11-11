import type {
  Ad,
  CodeConfirmed,
  CodeSent,
  Comment,
  Meta,
  MyBookings,
  MyPackage,
  MyService,
  Package,
  Post,
  PostDetail,
  Provider,
  ProviderBooking,
  ProviderDashboard,
  Service,
  Session,
  User,
} from './types';

/** An error whose message is safe to show to the user. `status` is 0 when the server could not be reached. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Config = {
  baseUrl: string;
  getToken: () => string | null;
  /** Called when the server rejects our token, so the app can sign the user out. */
  onUnauthorized?: () => void;
  fetch?: typeof fetch;
};

type Body = Record<string, unknown>;

/** Builds "?a=1&b=2" from the filters that are actually set. */
export function queryString(params: Record<string, string | number | undefined | null>) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export function createApi(config: Config) {
  const doFetch = config.fetch ?? fetch;
  const base = config.baseUrl.replace(/\/+$/, '') + '/api/v1';

  async function request<T>(method: string, path: string, body?: Body): Promise<T> {
    const token = config.getToken();
    let res: Response;
    try {
      res = await doFetch(base + path, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body && { 'Content-Type': 'application/json' }),
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError(0, 'Could not reach My Ummah. Check your internet connection and try again.');
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      // Only a rejected token signs the user out; a failed sign-in attempt is also a 401.
      if (res.status === 401 && token) config.onUnauthorized?.();
      throw new ApiError(res.status, (data && typeof data.error === 'string' && data.error) || 'Something went wrong. Please try again.');
    }
    return data as T;
  }

  const get = <T>(path: string) => request<T>('GET', path);
  const post = <T>(path: string, body: Body = {}) => request<T>('POST', path, body);
  const put = <T>(path: string, body: Body) => request<T>('PUT', path, body);
  const del = <T>(path: string) => request<T>('DELETE', path);
  const id = encodeURIComponent;

  return {
    // Sign-in: code by email or WhatsApp → verification token → PIN.
    startVerification: (identifier: string) => post<CodeSent>('/auth/start', { identifier }),
    confirmCode: (identifier: string, code: string) => post<CodeConfirmed>('/auth/verify', { identifier, code }),
    register: (body: Body & { verificationToken: string; pin: string }) => post<Session>('/auth/register', body),
    login: (verificationToken: string, pin: string) => post<Session>('/auth/login', { verificationToken, pin }),
    resetPin: (verificationToken: string, pin: string) => post<Session>('/auth/reset-pin', { verificationToken, pin }),
    verifyPin: (pin: string) => post<{ ok: boolean }>('/auth/pin/verify', { pin }),
    me: () => get<{ user: User }>('/me'),
    meta: () => get<Meta>('/meta'),

    ads: () => get<Ad[]>('/ads'),
    adClick: (adId: string) => post<{ ok: boolean }>(`/ads/${id(adId)}/click`),

    packages: (filters: { q?: string; max?: string; stars?: string; sort?: string } = {}) => get<Package[]>(`/packages${queryString(filters)}`),
    package: (pkgId: string) => get<Package>(`/packages/${id(pkgId)}`),
    bookPackage: (pkgId: string, body: Body) => post<{ id: string }>(`/packages/${id(pkgId)}/book`, body),

    services: (filters: { q?: string; type?: string; pax?: string } = {}) => get<Service[]>(`/transport${queryString(filters)}`),
    service: (serviceId: string) => get<Service>(`/transport/${id(serviceId)}`),
    bookTransport: (serviceId: string, body: Body) => post<{ id: string }>(`/transport/${id(serviceId)}/book`, body),

    myBookings: () => get<MyBookings>('/bookings'),
    setBookingStatus: (kind: 'package' | 'transport', bookingId: string, to: string) =>
      post<{ id: string; status: string }>(`/bookings/${kind}/${id(bookingId)}/status`, { to }),

    posts: (filters: { topic?: string; sort?: string } = {}) => get<Post[]>(`/posts${queryString(filters)}`),
    post: (postId: string) => get<PostDetail>(`/posts/${id(postId)}`),
    createPost: (body: { title: string; body: string; topic: string }) => post<{ id: string }>('/posts', body),
    deletePost: (postId: string) => del<{ deleted: boolean }>(`/posts/${id(postId)}`),
    addComment: (postId: string, body: { body: string; parentId?: string | null }) => post<Comment>(`/posts/${id(postId)}/comments`, body),
    deleteComment: (commentId: string) => del<{ deleted: boolean }>(`/comments/${id(commentId)}`),
    vote: (postId: string, value: 1 | -1) => post<{ score: number; myVote: number }>(`/posts/${id(postId)}/vote`, { value }),

    providerDashboard: () => get<ProviderDashboard>('/provider'),
    updateProfile: (body: Body) => put<Provider>('/provider', body),
    providerBookings: () => get<ProviderBooking[]>('/provider/bookings'),
    myPackages: () => get<MyPackage[]>('/provider/packages'),
    savePackage: (pkgId: string | null, body: Body) =>
      pkgId ? put<MyPackage>(`/provider/packages/${id(pkgId)}`, body) : post<MyPackage>('/provider/packages', body),
    deletePackage: (pkgId: string) => del<{ deleted: boolean; hidden: boolean }>(`/provider/packages/${id(pkgId)}`),
    myServices: () => get<MyService[]>('/provider/services'),
    saveService: (serviceId: string | null, body: Body) =>
      serviceId ? put<MyService>(`/provider/services/${id(serviceId)}`, body) : post<MyService>('/provider/services', body),
    deleteService: (serviceId: string) => del<{ deleted: boolean; hidden: boolean }>(`/provider/services/${id(serviceId)}`),
  };
}

export type Api = ReturnType<typeof createApi>;

/** Turns anything thrown into a sentence for the screen. */
export function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
}
