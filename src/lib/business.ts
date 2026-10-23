export const BUSINESS = {
  name: "Reno's Finest Details",
  legalName: "Reno's Finest Details LLC",
  owner: 'Juan',
  phoneDisplay: '(775) 857-0381',
  phoneHref: 'tel:+17758570381',
  smsNumber: '+17758570381',
  instagram: 'https://www.instagram.com/renosfinestdetails/',
  instagramHandle: '@renosfinestdetails',
  facebook: 'https://www.facebook.com/renosfinestdetails',
  facebookHandle: '@renosfinestdetails',
  linktree: 'https://linktr.ee/RENOSFINESTDETAILS',
  hours: '6:00 AM – 8:00 PM',
  hoursNote: 'Hours may vary seasonally.',
  serviceArea: 'Reno, Sparks, Carson City, Truckee & surrounding areas',
  deposit: 50,
};

/** Must match SERVICES in supabase/functions/submit-request/index.ts exactly. */
export const SERVICE_OPTIONS = [
  'Interior Only – Standard ($120)',
  'Interior Only – Premium ($190)',
  'Spot Cleaning ($115)',
  'Exterior & Interior – Standard ($165)',
  'Exterior & Interior – Premium ($240)',
  'One-Step Polish (from $400)',
  'Two-Step Polish (from $600)',
  'RV Wash Only ($7/ft)',
  'RV Wash & Wax ($9/ft)',
  'Boat Wash & Wax ($10/ft)',
  'Add-Ons Only',
  'Fleet / Commercial',
  'Other / Not Sure',
];

export const CONTACT_METHODS = ['Phone call', 'Text message', 'Email'];

/** Services customers can book and pay a deposit for online.
 *  Must match SERVICES in supabase/functions/create-booking/index.ts exactly. */
export const BOOKABLE_SERVICES = SERVICE_OPTIONS.slice(0, 10);

/** Start times offered on the booking page (business hours 6 AM – 8 PM).
 *  Must match TIMES in supabase/functions/create-booking/index.ts exactly. */
export const BOOKING_TIMES = [
  '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
];

/** Square Web Payments settings (public values; the access token stays server-side). */
export const SQUARE = {
  applicationId: (import.meta.env.VITE_SQUARE_APPLICATION_ID as string | undefined) ?? '',
  locationId: (import.meta.env.VITE_SQUARE_LOCATION_ID as string | undefined) ?? '',
  sandbox: ((import.meta.env.VITE_SQUARE_ENVIRONMENT as string | undefined) ?? 'production').toLowerCase() === 'sandbox',
};

export const ADD_ONS = [
  'Headlight restoration',
  'Black trim restoration',
  'Odor removal',
  'Glass sealant for windows',
  'Water spot removal',
  'Leather conditioning',
];

export const CLIENTS = ['Reno Rodeo', 'Sparks Marina RV Park', 'Pizzava', 'Cruz Construction', 'Local car clubs'];

export type Tier = { name: string; option: string; price: string; unit?: string; intro?: string; items: string[] };
export type ServiceGroup = { id: string; num: string; title: string; blurb: string; tiers: Tier[]; note?: string };

export const SERVICE_GROUPS: ServiceGroup[] = [
  {
    id: 'interior',
    num: '01',
    title: 'Interior Only',
    blurb: 'A clean, fresh cabin, from the floor mats to the air vents.',
    tiers: [
      {
        name: 'Standard Interior',
        option: SERVICE_OPTIONS[0],
        price: '$120',
        items: [
          'Thorough vacuuming',
          'All plastics and windows cleaned',
          'Cup holders and foot pedals',
          'Door panels and door jambs',
          'Air vents cleaned',
        ],
      },
      {
        name: 'Premium Interior',
        option: SERVICE_OPTIONS[1],
        price: '$190',
        intro: 'Everything in Standard, plus:',
        items: [
          'Shampoo with stain and pet hair removal',
          'UV protection on plastics',
          'Leather conditioning',
          'Air freshener',
        ],
      },
      {
        name: 'Spot Cleaning',
        option: SERVICE_OPTIONS[2],
        price: '$115',
        items: ['Stain removal on seats or carpets only'],
      },
    ],
  },
  {
    id: 'full',
    num: '02',
    title: 'Exterior & Interior',
    blurb: 'Inside and out. Our most popular way to bring a vehicle back.',
    tiers: [
      {
        name: 'Standard Package',
        option: SERVICE_OPTIONS[3],
        price: '$165',
        items: [
          'Hand wash and wax',
          'Rims, tires and wheel wells cleaned, plus tire shine',
          'Interior vacuumed',
          'All plastics, windows and air vents cleaned',
          'Hard-to-reach areas detailed',
        ],
      },
      {
        name: 'Premium Package',
        option: SERVICE_OPTIONS[4],
        price: '$240',
        intro: 'Everything in Standard, plus:',
        items: [
          'Shampoo with stain and pet hair removal',
          'Leather conditioning',
          'UV protection on plastics',
          'Air scent',
        ],
      },
    ],
    note: 'Trucks, SUVs and third-row vehicles: add $20.',
  },
  {
    id: 'paint',
    num: '03',
    title: 'Paint Enhancement',
    blurb: 'Restore gloss and remove defects from your clear coat.',
    tiers: [
      {
        name: 'One-Step Polish',
        option: SERVICE_OPTIONS[5],
        price: '$400',
        unit: 'starting at',
        items: [
          'Clay bar and decontamination',
          'Pad and polish combination in a single pass',
          'Removes light-to-moderate paint defects and restores gloss',
          'Finished with a wax',
        ],
      },
      {
        name: 'Two-Step Polish',
        option: SERVICE_OPTIONS[6],
        price: '$600',
        unit: 'starting at',
        items: [
          'Clay bar and decontamination',
          'Two phases: compounding, then polishing',
          'Removes heavy defects, scratches, swirl marks and oxidation',
        ],
      },
    ],
  },
  {
    id: 'rv-boat',
    num: '04',
    title: 'RV & Boat',
    blurb: 'Priced by the foot for motorhomes, trailers and boats.',
    tiers: [
      {
        name: 'RV Wash Only',
        option: SERVICE_OPTIONS[7],
        price: '$7',
        unit: 'per foot',
        items: [
          'Removes road grime, dust and bug residue',
          'Slide-outs, gutters, windows and vents cleaned',
          'Wheels and rims cleaned',
        ],
      },
      {
        name: 'RV Wash & Wax',
        option: SERVICE_OPTIONS[8],
        price: '$9',
        unit: 'per foot',
        intro: 'Everything in RV Wash, plus:',
        items: [
          'Wax that protects paint and fiberglass from the elements',
          'Add-ons: oxidation/scratch buffing, water spot removal',
        ],
      },
      {
        name: 'Boat Wash & Wax',
        option: SERVICE_OPTIONS[9],
        price: '$10',
        unit: 'per foot',
        items: [
          'Hull, topside and non-skid decks rinsed and hand-scrubbed',
          'Marine-grade wax or sealant to block UV and repel water',
          'Add-ons: oxidation/scratch buffing, water spot removal, vinyl conditioning, interior cabin cleaning',
        ],
      },
    ],
  },
];
