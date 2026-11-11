import {
  isDay,
  isEmail,
  isPhone,
  isTime,
  validateLogin,
  validatePackage,
  validatePackageBooking,
  validatePost,
  validateRegister,
  validateService,
  validateTransportBooking,
  type PackageForm,
} from './validate';

describe('field checks', () => {
  it('isEmail', () => {
    expect(isEmail(' aisha@example.com ')).toBe(true);
    expect(isEmail('aisha@example')).toBe(false);
  });
  it('isPhone', () => {
    expect(isPhone('+44 7700 900123')).toBe(true);
    expect(isPhone('phone')).toBe(false);
    expect(isPhone('123')).toBe(false);
  });
  it('isDay rejects impossible dates', () => {
    expect(isDay('2031-03-01')).toBe(true);
    expect(isDay('2031-02-30')).toBe(false);
    expect(isDay('1/3/2031')).toBe(false);
  });
  it('isTime needs 24-hour HH:MM', () => {
    expect(isTime('14:30')).toBe(true);
    expect(isTime('00:00')).toBe(true);
    expect(isTime('24:00')).toBe(false);
    expect(isTime('9:30')).toBe(false);
    expect(isTime('12:60')).toBe(false);
  });
});

describe('validateLogin', () => {
  it('needs an email and a password', () => {
    expect(validateLogin({ email: 'a@b.co', password: 'x' })).toBeNull();
    expect(validateLogin({ email: 'nope', password: 'x' })).toMatch(/email/);
    expect(validateLogin({ email: 'a@b.co', password: '' })).toMatch(/password/);
  });
});

describe('validateRegister', () => {
  const base = { name: 'Aisha', email: 'a@b.co', password: 'password123', as: 'pilgrim', companyName: '' };
  it('accepts a pilgrim without a company', () => {
    expect(validateRegister(base)).toBeNull();
  });
  it('requires a company name for providers only', () => {
    expect(validateRegister({ ...base, as: 'umrah' })).toMatch(/company/);
    expect(validateRegister({ ...base, as: 'transport', companyName: 'Haramain Rides' })).toBeNull();
  });
  it('rejects short names and passwords', () => {
    expect(validateRegister({ ...base, name: 'A' })).toMatch(/name/);
    expect(validateRegister({ ...base, password: 'short' })).toMatch(/8 characters/);
  });
});

describe('validatePackageBooking', () => {
  const ok = { travellers: '2', contactPhone: '+44 7700 900123' };
  it('accepts a booking that fits', () => {
    expect(validatePackageBooking(ok, 5)).toBeNull();
    expect(validatePackageBooking({ ...ok, travellers: '5' }, 5)).toBeNull();
  });
  it('stops people booking more seats than are left', () => {
    expect(validatePackageBooking({ ...ok, travellers: '6' }, 5)).toBe('Only 5 seats are left on this package.');
    expect(validatePackageBooking({ ...ok, travellers: '2' }, 1)).toBe('Only 1 seat is left on this package.');
  });
  it('rejects zero, decimals and text', () => {
    for (const travellers of ['0', '1.5', 'two', '']) {
      expect(validatePackageBooking({ ...ok, travellers }, 5)).toMatch(/number of travellers/);
    }
  });
  it('needs a phone number', () => {
    expect(validatePackageBooking({ ...ok, contactPhone: '' }, 5)).toMatch(/phone/);
  });
});

describe('validateTransportBooking', () => {
  const ok = { date: '2031-01-05', time: '14:30', pickupLocation: 'JED Terminal 1', passengers: '3', contactPhone: '+44 7700 900123' };
  it('accepts a complete form', () => {
    expect(validateTransportBooking(ok, 4)).toBeNull();
  });
  it.each([
    [{ date: '05/01/2031' }, /YYYY-MM-DD/],
    [{ time: '2pm' }, /HH:MM/],
    [{ pickupLocation: 'x' }, /where to pick you up/],
    [{ passengers: '0' }, /number of passengers/],
    [{ passengers: '5' }, /up to 4 passengers/],
    [{ contactPhone: 'n/a' }, /phone/],
  ])('rejects %j', (patch, message) => {
    expect(validateTransportBooking({ ...ok, ...patch }, 4)).toMatch(message);
  });
});

describe('validatePackage', () => {
  const ok: PackageForm = {
    title: '10-day Umrah',
    description: 'Flights, hotels and guided rites.',
    departureCity: 'London',
    departureDate: '2031-03-01',
    durationDays: '10',
    makkahHotel: 'Hotel A',
    makkahNights: '5',
    madinahHotel: 'Hotel B',
    madinahNights: '4',
    hotelStars: '4',
    price: '1450',
    seatsTotal: '40',
  };
  it('accepts a complete form', () => {
    expect(validatePackage(ok)).toBeNull();
  });
  it('allows a Makkah-only trip', () => {
    expect(validatePackage({ ...ok, madinahHotel: '', madinahNights: '' })).toBeNull();
  });
  it.each([
    [{ title: 'Hi' }, /title/],
    [{ description: 'short' }, /Describe/],
    [{ departureDate: 'soon' }, /YYYY-MM-DD/],
    [{ durationDays: '0' }, /Duration/],
    [{ makkahNights: '' }, /nights in Makkah/],
    [{ madinahHotel: '' }, /Madinah hotel/],
    [{ makkahNights: '8' }, /cannot exceed/],
    [{ hotelStars: '6' }, /stars/],
    [{ price: '0' }, /price/],
    [{ price: '12.345' }, /price/],
    [{ seatsTotal: '' }, /seats/],
  ])('rejects %j', (patch, message) => {
    expect(validatePackage({ ...ok, ...patch })).toMatch(message);
  });
});

describe('validateService', () => {
  const ok = { title: 'Airport transfer', vehicleType: 'SUV', capacity: '7', fromPlace: 'Jeddah Airport', toPlace: 'Makkah', price: '75.50' };
  it('accepts a complete form', () => {
    expect(validateService(ok)).toBeNull();
  });
  it.each([
    [{ title: 'Cab' }, /title/],
    [{ vehicleType: '' }, /vehicle type/],
    [{ capacity: '81' }, /Capacity/],
    [{ toPlace: ' ' }, /starts and ends/],
    [{ price: 'free' }, /price/],
  ])('rejects %j', (patch, message) => {
    expect(validateService({ ...ok, ...patch })).toMatch(message);
  });
});

describe('validatePost', () => {
  it('needs a title, a body and a topic', () => {
    const ok = { title: 'A question', body: 'What should I pack?', topic: 'general' };
    expect(validatePost(ok)).toBeNull();
    expect(validatePost({ ...ok, title: 'Hi' })).toMatch(/title/);
    expect(validatePost({ ...ok, body: 'Short' })).toMatch(/sentence/);
    expect(validatePost({ ...ok, topic: '' })).toMatch(/topic/);
  });
});
