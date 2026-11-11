import { ApiError, createApi, errorMessage, queryString } from './api';

type Call = { url: string; init: RequestInit };

/** A fetch stand-in that records calls and replies with the given status and JSON. */
function fakeFetch(status: number, body: unknown) {
  const calls: Call[] = [];
  const fetch = jest.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls };
}

function setup(status = 200, body: unknown = {}, token: string | null = null) {
  const { fetch, calls } = fakeFetch(status, body);
  const onUnauthorized = jest.fn();
  const api = createApi({ baseUrl: 'https://api.test/', getToken: () => token, onUnauthorized, fetch });
  return { api, calls, onUnauthorized };
}

describe('queryString', () => {
  it('skips empty filters and encodes values', () => {
    expect(queryString({ q: 'Jeddah Airport', type: '', pax: undefined, sort: 'price' })).toBe('?q=Jeddah%20Airport&sort=price');
  });
  it('is empty when nothing is set', () => {
    expect(queryString({ q: '', max: null })).toBe('');
  });
});

describe('createApi', () => {
  it('calls the versioned API under the base URL, without doubling slashes', async () => {
    const { api, calls } = setup(200, []);
    await api.packages({ q: 'London', sort: 'price' });
    expect(calls[0].url).toBe('https://api.test/api/v1/packages?q=London&sort=price');
    expect(calls[0].init.method).toBe('GET');
  });

  it('sends the token as a Bearer header when signed in', async () => {
    const { api, calls } = setup(200, {}, 'abc123');
    await api.myBookings();
    expect(calls[0].init.headers).toMatchObject({ Authorization: 'Bearer abc123' });
  });

  it('sends no Authorization header when signed out', async () => {
    const { api, calls } = setup(200, []);
    await api.posts();
    expect(calls[0].init.headers).not.toHaveProperty('Authorization');
  });

  it('posts JSON bodies', async () => {
    const { api, calls } = setup(200, { id: 'b1' });
    await api.bookPackage('pkg 1', { travellers: '2', contactPhone: '+44 7700 900123' });
    expect(calls[0].url).toBe('https://api.test/api/v1/packages/pkg%201/book');
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ travellers: '2', contactPhone: '+44 7700 900123' });
  });

  it('creates with POST and updates with PUT', async () => {
    const { api, calls } = setup(200, {});
    await api.savePackage(null, { title: 'New' });
    await api.savePackage('p1', { title: 'Edited' });
    await api.saveService(null, { title: 'New' });
    await api.saveService('s1', { title: 'Edited' });
    expect(calls.map((c) => `${c.init.method} ${c.url.replace('https://api.test/api/v1', '')}`)).toEqual([
      'POST /provider/packages',
      'PUT /provider/packages/p1',
      'POST /provider/services',
      'PUT /provider/services/s1',
    ]);
  });

  it('routes booking status changes by kind', async () => {
    const { api, calls } = setup(200, {});
    await api.setBookingStatus('transport', 'b9', 'CANCELLED');
    expect(calls[0].url).toBe('https://api.test/api/v1/bookings/transport/b9/status');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ to: 'CANCELLED' });
  });

  it("throws the server's message on failure", async () => {
    const { api } = setup(400, { error: 'Only 1 seat left on this package.' });
    await expect(api.bookPackage('p1', {})).rejects.toMatchObject({ status: 400, message: 'Only 1 seat left on this package.' });
  });

  it('falls back to a generic message when the server sends none', async () => {
    const { api } = setup(500, null);
    await expect(api.meta()).rejects.toMatchObject({ status: 500, message: 'Something went wrong. Please try again.' });
  });

  it('signs the user out when their token is rejected', async () => {
    const { api, onUnauthorized } = setup(401, { error: 'Please sign in to continue.' }, 'expired');
    await expect(api.myBookings()).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not treat a failed sign-in as an expired session', async () => {
    const { api, onUnauthorized } = setup(401, { error: 'Incorrect email or password.' });
    await expect(api.login('verification-token', '0000')).rejects.toThrow('Incorrect email or password.');
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('walks the sign-in steps: code, confirmation, then PIN', async () => {
    const { api, calls } = setup(200, {});
    await api.startVerification('+447700900123');
    await api.confirmCode('+447700900123', '123456');
    await api.register({ verificationToken: 'vt', pin: '4821', name: 'Aisha', as: 'pilgrim' });
    await api.login('vt', '4821');
    await api.resetPin('vt', '7310');
    await api.verifyPin('4821');
    expect(calls.map((c) => [c.url.replace('https://api.test/api/v1', ''), JSON.parse(c.init.body as string)])).toEqual([
      ['/auth/start', { identifier: '+447700900123' }],
      ['/auth/verify', { identifier: '+447700900123', code: '123456' }],
      ['/auth/register', { verificationToken: 'vt', pin: '4821', name: 'Aisha', as: 'pilgrim' }],
      ['/auth/login', { verificationToken: 'vt', pin: '4821' }],
      ['/auth/reset-pin', { verificationToken: 'vt', pin: '7310' }],
      ['/auth/pin/verify', { pin: '4821' }],
    ]);
  });

  it('does not sign the user out for a wrong PIN on the lock screen', async () => {
    const { api, onUnauthorized } = setup(403, { error: 'Wrong PIN. 4 attempts left.' }, 'valid-token');
    await expect(api.verifyPin('0000')).rejects.toMatchObject({ status: 403, message: 'Wrong PIN. 4 attempts left.' });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('explains when the server cannot be reached', async () => {
    const fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed')) as unknown as typeof globalThis.fetch;
    const api = createApi({ baseUrl: 'https://api.test', getToken: () => null, fetch });
    await expect(api.packages()).rejects.toMatchObject({ status: 0, message: expect.stringContaining('internet connection') });
  });
});

describe('errorMessage', () => {
  it('shows API errors as they are and hides everything else', () => {
    expect(errorMessage(new ApiError(400, 'This package is fully booked.'))).toBe('This package is fully booked.');
    expect(errorMessage(new Error("Cannot read properties of undefined (reading 'x')"))).toBe('Something went wrong. Please try again.');
  });
});
