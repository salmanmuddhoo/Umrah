/**
 * Visa guidance for Umrah. Entry rules are set by the Saudi authorities and
 * change without notice, so this content describes the routes and the process,
 * avoids fees and exact deadlines, and always points to the official sources.
 */

export const VISA_REVIEWED = 'November 2026';

export type VisaRoute = { id: string; title: string; who: string; points: string[] };

export const VISA_ROUTES: VisaRoute[] = [
  {
    id: 'umrah',
    title: 'Umrah visa',
    who: 'For anyone travelling mainly to perform Umrah.',
    points: [
      'Arranged through a licensed Umrah agent or the official Nusuk platform.',
      'Usually part of a package: when a package on My Ummah lists “Visa” as included, the provider applies for you.',
      'Tied to your Umrah booking, so your accommodation and transport are normally confirmed before it is issued.',
    ],
  },
  {
    id: 'tourist',
    title: 'Tourist e-visa',
    who: 'For citizens of the countries on Saudi Arabia’s e-visa list.',
    points: [
      'Applied for online on the official Saudi e-visa portal; approval is often quick.',
      'Normally allows several visits and lets you perform Umrah as well as travel around the Kingdom.',
      'Does not allow Hajj, and Umrah on a tourist visa is not possible during the Hajj season.',
    ],
  },
  {
    id: 'arrival',
    title: 'Visa on arrival',
    who: 'For eligible nationalities, and some holders of UK, US or Schengen visas or residence.',
    points: [
      'Issued at the airport on landing to travellers who qualify.',
      'Eligibility depends on your passport, and for visa holders on the visa having been used before.',
      'Confirm with your airline before you fly: if you do not qualify you may be refused boarding.',
    ],
  },
  {
    id: 'transit',
    title: 'Stopover (transit) visa',
    who: 'For passengers on Saudi airlines with a stop in the Kingdom.',
    points: [
      'Requested while booking a ticket with a participating Saudi airline.',
      'Covers a short stay of a few days, which is enough time to perform Umrah.',
      'Check the permitted length of stay carefully and plan your onward flight around it.',
    ],
  },
  {
    id: 'gcc',
    title: 'GCC resident visa',
    who: 'For residents of Gulf Cooperation Council countries.',
    points: [
      'Residents of GCC countries can apply online for an e-visa, whatever their nationality.',
      'Your residence permit usually needs a minimum remaining validity when you apply.',
    ],
  },
];

export type VisaStep = { title: string; points: string[] };

export const VISA_STEPS: VisaStep[] = [
  {
    title: 'Work out which visa fits you',
    points: [
      'It depends on your nationality, where you live and how you are travelling.',
      'Booking a package with the visa included is the simplest route for a first Umrah.',
    ],
  },
  {
    title: 'Check your passport',
    points: [
      'It should be valid for at least six months from the day you arrive, with blank pages for stamps.',
      'The name on your booking and visa must match your passport exactly.',
    ],
  },
  {
    title: 'Gather your documents',
    points: [
      'A clear scan of your passport’s photo page.',
      'A recent passport-style photo on a plain white background.',
      'Your flight and accommodation details.',
      'Your vaccination certificate (see step 5).',
      'Residents of a country other than their own: proof of legal residence.',
    ],
  },
  {
    title: 'Apply through an official channel',
    points: [
      'With a package: send your documents to your provider, who submits the application.',
      'On your own: apply on the Nusuk platform or the official Saudi e-visa portal and pay the fee online.',
      'Use only official websites or licensed agents. Lookalike sites charge extra and may not deliver a visa at all.',
    ],
  },
  {
    title: 'Sort out health requirements',
    points: [
      'A meningococcal (ACWY) vaccination certificate is required for Umrah pilgrims. Have the vaccine at least ten days before you travel.',
      'Other vaccinations, such as polio or yellow fever, depend on the country you are travelling from.',
      'Medical insurance is normally included with the visa; check what yours covers.',
    ],
  },
  {
    title: 'Set up the Nusuk app',
    points: [
      'Install Nusuk and register with your passport and visa details once the visa is issued.',
      'Use it to book your Umrah permit and a time to pray in the Rawdah in Madinah. Slots fill up, so book early.',
    ],
  },
  {
    title: 'Travel, and leave on time',
    points: [
      'Carry a printed and a digital copy of your visa, bookings and vaccination certificate.',
      'Note the date you must leave by. Overstaying brings fines and can stop you returning.',
    ],
  },
];

export const VISA_GOOD_TO_KNOW = [
  'The Saudi authorities have said women may travel for Umrah without a mahram. Some agents and countries apply their own rules, so ask your provider.',
  'Children need their own visa. Check with your provider what age rules apply to visiting the Haram and the Rawdah.',
  'Around the Hajj season, Umrah visas stop being issued for a period and entry to Makkah is restricted. Plan your dates with this in mind.',
];

export const VISA_OFFICIAL_LINKS = [
  { label: 'Nusuk — official Umrah platform', url: 'https://www.nusuk.sa' },
  { label: 'Saudi e-visa portal', url: 'https://visa.visitsaudi.com' },
] as const;
