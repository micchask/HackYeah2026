// Kategorie miejsc i dostępność - jedno źródło dla mapy, legendy, listy i chipów warstw (#81, #90).
// Mapowanie tagów jest zwykłą tabelą, żeby dało się je przenieść do backendu (#59).
import type { Institution, Place } from '../api/client'
import type { LayerId } from '../app/state'

export type PlaceGroup =
  'food' | 'culture' | 'health' | 'toilets' | 'services' | 'shopping' | 'transport' | 'other'

export const GROUP_LABEL: Record<PlaceGroup, string> = {
  food: 'jedzenie',
  culture: 'kultura i zwiedzanie',
  health: 'zdrowie',
  toilets: 'toaleta',
  services: 'urzędy i usługi',
  shopping: 'zakupy',
  transport: 'przystanek',
  other: 'inne',
}

const GROUP_TAGS: Record<Exclude<PlaceGroup, 'other'>, string[]> = {
  food: [
    'restaurant',
    'cafe',
    'fast_food',
    'pub',
    'bar',
    'pastry',
    'bakery',
    'ice_cream',
    'food_court',
    'biergarten',
  ],
  culture: [
    'museum',
    'theatre',
    'cinema',
    'gallery',
    'arts_centre',
    'place_of_worship',
    'attraction',
    'artwork',
    'viewpoint',
    'monument',
    'castle',
  ],
  health: ['pharmacy', 'doctors', 'clinic', 'hospital', 'dentist', 'chemist', 'optician'],
  toilets: ['toilets'],
  services: [
    'townhall',
    'post_office',
    'bank',
    'atm',
    'library',
    'police',
    'courthouse',
    'community_centre',
    'public_building',
  ],
  shopping: [
    'convenience',
    'supermarket',
    'clothes',
    'books',
    'gift',
    'shoes',
    'department_store',
    'mall',
    'marketplace',
    'kiosk',
    'jewelry',
    'alcohol',
    'beauty',
    'hairdresser',
  ],
  transport: ['platform', 'bus_stop', 'tram_stop', 'stop_position', 'station', 'taxi'],
}

const TAG_GROUP = new Map<string, PlaceGroup>(
  Object.entries(GROUP_TAGS).flatMap(([group, tags]) =>
    tags.map((tag) => [tag, group as PlaceGroup] as const),
  ),
)

export function placeGroup(place: Pick<Place, 'category'>): PlaceGroup {
  return (place.category && TAG_GROUP.get(place.category)) || 'other'
}

/** Konkretny rodzaj miejsca po polsku - tag OSM (amenity/shop/tourism...) → etykieta. */
export const CATEGORY_LABEL: Record<string, string> = {
  // jedzenie i picie
  restaurant: 'restauracja',
  fast_food: 'fast food',
  cafe: 'kawiarnia',
  bar: 'bar',
  pub: 'pub',
  biergarten: 'ogródek piwny',
  food_court: 'strefa gastronomiczna',
  ice_cream: 'lodziarnia',
  bakery: 'piekarnia',
  pastry: 'cukiernia',
  confectionery: 'sklep ze słodyczami',
  nightclub: 'klub nocny',
  // zakupy
  convenience: 'sklep spożywczy',
  supermarket: 'supermarket',
  department_store: 'dom towarowy',
  mall: 'centrum handlowe',
  marketplace: 'targowisko',
  kiosk: 'kiosk',
  greengrocer: 'warzywniak',
  butcher: 'sklep mięsny',
  alcohol: 'sklep monopolowy',
  clothes: 'sklep odzieżowy',
  shoes: 'sklep obuwniczy',
  books: 'księgarnia',
  gift: 'sklep z pamiątkami',
  jewelry: 'jubiler',
  florist: 'kwiaciarnia',
  cosmetics: 'drogeria / kosmetyki',
  chemist: 'drogeria',
  mobile_phone: 'sklep z telefonami',
  furniture: 'sklep meblowy',
  stationery: 'sklep papierniczy',
  antiques: 'antykwariat',
  pet: 'sklep zoologiczny',
  bicycle: 'sklep rowerowy',
  medical_supply: 'sklep medyczny',
  hearing_aids: 'aparaty słuchowe',
  lottery: 'kolektura lotto',
  vending_machine: 'automat',
  // usługi
  hairdresser: 'fryzjer',
  beauty: 'salon kosmetyczny',
  massage: 'masaż',
  tattoo: 'studio tatuażu',
  tailor: 'krawiec',
  laundry: 'pralnia',
  copyshop: 'punkt ksero',
  travel_agency: 'biuro podróży',
  bureau_de_change: 'kantor',
  bank: 'bank',
  atm: 'bankomat',
  post_office: 'poczta',
  parcel_locker: 'paczkomat',
  car_repair: 'warsztat samochodowy',
  car_wash: 'myjnia',
  fuel: 'stacja paliw',
  parking: 'parking',
  // urzędy, edukacja
  townhall: 'urząd',
  courthouse: 'sąd',
  police: 'policja',
  library: 'biblioteka',
  community_centre: 'dom kultury',
  social_facility: 'pomoc społeczna',
  public_building: 'budynek publiczny',
  school: 'szkoła',
  kindergarten: 'przedszkole',
  university: 'uczelnia',
  // zdrowie
  pharmacy: 'apteka',
  doctors: 'przychodnia / lekarz',
  clinic: 'przychodnia',
  hospital: 'szpital',
  dentist: 'dentysta',
  optician: 'optyk',
  toilets: 'toaleta',
  drinking_water: 'woda pitna',
  // kultura i turystyka
  museum: 'muzeum',
  theatre: 'teatr',
  cinema: 'kino',
  gallery: 'galeria',
  arts_centre: 'centrum sztuki',
  place_of_worship: 'kościół / miejsce kultu',
  attraction: 'atrakcja turystyczna',
  artwork: 'dzieło sztuki',
  viewpoint: 'punkt widokowy',
  monument: 'pomnik',
  castle: 'zamek',
  crypt: 'krypta',
  information: 'informacja',
  hotel: 'hotel',
  hostel: 'hostel',
  apartment: 'apartament',
  // transport
  platform: 'przystanek',
  bus_stop: 'przystanek autobusowy',
  tram_stop: 'przystanek tramwajowy',
  stop_position: 'przystanek',
  station: 'stacja',
  bus_station: 'dworzec autobusowy',
  taxi: 'postój taxi',
}

/** Rodzaj do pokazania przy miejscu: konkretny typ, a gdy go nie znamy - nazwa grupy. */
export function placeKindLabel(place: Pick<Place, 'category'>): string {
  return (place.category && CATEGORY_LABEL[place.category]) || GROUP_LABEL[placeGroup(place)]
}

/** Pod którym chipem warstwy są miejsca z grupy; null = na razie bez warstwy (ukryte). */
export const GROUP_LAYER: Record<PlaceGroup, LayerId | null> = {
  food: 'places',
  culture: 'places',
  health: 'health',
  toilets: 'health',
  services: 'institutions',
  shopping: null,
  transport: null,
  other: null,
}

export function placeLayer(place: Pick<Place, 'category'>): LayerId | null {
  return GROUP_LAYER[placeGroup(place)]
}

// --- dostępność -----------------------------------------------------------------------------

export type Access = 'yes' | 'limited' | 'no' | 'unknown'
export const ACCESS_LEVELS: Access[] = ['yes', 'limited', 'no', 'unknown']

/** Z atrybutu `wheelchair`; brak danych to `unknown`, nigdy „dostępne”. */
export function accessibilityOf(place: Pick<Place, 'attributes'>): Access {
  const value = place.attributes?.find((a) => a.key === 'wheelchair')?.value
  if (value === 'yes' || value === 'designated' || value === true) return 'yes'
  if (value === 'limited') return 'limited'
  if (value === 'no' || value === false) return 'no'
  return 'unknown'
}

export const ACCESS_LABEL: Record<Access, string> = {
  yes: 'dostępne dla wózka',
  limited: 'częściowo dostępne',
  no: 'niedostępne dla wózka',
  unknown: 'brak danych o dostępności',
}

// Tło ikon: biały piktogram ma na nich kontrast min. 4.5:1, a ikona do podkładu min. 3:1
export const ACCESS_COLOR: Record<Access, string> = {
  yes: '#1a7f37',
  limited: '#a35200',
  no: '#c4122f',
  unknown: '#55606d',
}

/** Każdy status ma inny piktogram - kolor nie jest jedynym nośnikiem (WCAG 1.4.1). */
const ACCESS_GLYPH: Record<Access, string> = {
  yes: '<path d="M6.5 12.5l3.5 3.5 7.5-8"/>',
  limited: '<path d="M12 6.5v7"/><path d="M12 17.5h.01"/>',
  no: '<path d="M7.5 7.5l9 9"/><path d="M16.5 7.5l-9 9"/>',
  unknown:
    '<path d="M9.3 9.2a2.8 2.8 0 1 1 3.9 2.6c-.7.3-1.2 1-1.2 1.8v.6"/><path d="M12 17.6h.01"/>',
}

/** Ikona miejsca: zaokrąglony kwadrat (bariery są kółkami) z piktogramem dostępności. */
export function accessIconSvg(access: Access, size = 28): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-3 -3 30 30">` +
    `<rect x="-1.5" y="-1.5" width="27" height="27" rx="7" fill="${ACCESS_COLOR[access]}" stroke="#fff" stroke-width="2"/>` +
    `<g fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">` +
    `${ACCESS_GLYPH[access]}</g></svg>`
  )
}

// --- ikona rodzaju miejsca ------------------------------------------------------------------

/** Rodzaj ikony na mapie - drobniejszy niż grupa, żeby kawiarnia różniła się od restauracji. */
export type PlaceKind =
  | 'cafe'
  | 'restaurant'
  | 'fast_food'
  | 'bar'
  | 'sweets'
  | 'museum'
  | 'monument'
  | 'church'
  | 'theatre'
  | 'gallery'
  | 'viewpoint'
  | 'information'
  | 'hotel'
  | 'office'
  | 'post'
  | 'bank'
  | 'library'
  | 'police'
  | 'pharmacy'
  | 'medical'
  | 'toilets'
  | 'water'
  | 'shop'
  | 'transport'
  | 'parking'
  | 'other'

const KIND_TAGS: Partial<Record<PlaceKind, string[]>> = {
  cafe: ['cafe'],
  restaurant: ['restaurant', 'food_court', 'biergarten'],
  fast_food: ['fast_food'],
  bar: ['bar', 'pub', 'nightclub', 'alcohol'],
  sweets: ['ice_cream', 'bakery', 'pastry', 'confectionery'],
  museum: ['museum'],
  monument: ['attraction', 'monument', 'castle', 'memorial', 'ruins', 'crypt'],
  church: ['place_of_worship'],
  theatre: ['theatre', 'cinema'],
  gallery: ['gallery', 'arts_centre', 'artwork'],
  viewpoint: ['viewpoint'],
  information: ['information'],
  hotel: ['hotel', 'hostel', 'guest_house', 'apartment', 'motel'],
  office: [
    'townhall',
    'courthouse',
    'public_building',
    'community_centre',
    'social_facility',
    'school',
    'kindergarten',
    'university',
  ],
  post: ['post_office', 'parcel_locker'],
  bank: ['bank', 'atm', 'bureau_de_change'],
  library: ['library', 'books'],
  police: ['police'],
  pharmacy: ['pharmacy', 'chemist'],
  medical: ['doctors', 'clinic', 'hospital', 'dentist', 'optician'],
  toilets: ['toilets'],
  water: ['drinking_water'],
  transport: [
    'platform',
    'bus_stop',
    'tram_stop',
    'stop_position',
    'station',
    'bus_station',
    'taxi',
  ],
  parking: ['parking'],
}

const TAG_KIND = new Map<string, PlaceKind>(
  Object.entries(KIND_TAGS).flatMap(([kind, tags]) =>
    tags.map((tag) => [tag, kind as PlaceKind] as const),
  ),
)

/** Gdy tagu nie ma w tabeli, ikona wynika z grupy. */
const GROUP_KIND: Record<PlaceGroup, PlaceKind> = {
  food: 'restaurant',
  culture: 'monument',
  health: 'medical',
  toilets: 'toilets',
  services: 'office',
  shopping: 'shop',
  transport: 'transport',
  other: 'other',
}

export function placeKind(place: Pick<Place, 'category'>): PlaceKind {
  return (place.category && TAG_KIND.get(place.category)) || GROUP_KIND[placeGroup(place)]
}

// Instytucje mają rodzaj po polsku (poiType z deklaracji dostępności), np. 'urząd', 'muzeum'
const INSTITUTION_KIND: [RegExp, PlaceKind][] = [
  [/muzeum|skansen/, 'museum'],
  [/teatr|kino|filharmonia|opera/, 'theatre'],
  [/galeria|sztuk/, 'gallery'],
  [/bibliotek/, 'library'],
  [/poczt/, 'post'],
  [/polic|straż/, 'police'],
  [/szpital|przychodni|lekar|zdrow/, 'medical'],
  [/aptek/, 'pharmacy'],
  [/przystan|dworzec|stacja/, 'transport'],
  [/kości|parafi/, 'church'],
  [/zabyt|zamek|pomnik/, 'monument'],
]

/** Ikona instytucji; urząd i każdy nieznany rodzaj dostają ikonę urzędu. */
export function institutionKind(inst: Pick<Institution, 'kind'>): PlaceKind {
  const kind = inst.kind.toLowerCase()
  return INSTITUTION_KIND.find(([pattern]) => pattern.test(kind))?.[1] ?? 'office'
}

/**
 * Dostępność instytucji dla wózka. Opisy z deklaracji to wolny tekst, więc nie zgadujemy z nich
 * „dostępne / niedostępne” - kwadracik i karta pokazują „brak danych”.
 */
export function institutionAccess(_inst: Pick<Institution, 'attributes'>): Access {
  return 'unknown'
}

/** Podpis rodzaju ikony - do legendy. */
export const KIND_LABEL: Record<PlaceKind, string> = {
  cafe: 'kawiarnia',
  restaurant: 'restauracja',
  fast_food: 'fast food',
  bar: 'bar / pub',
  sweets: 'lody / cukiernia',
  museum: 'muzeum',
  monument: 'zabytek',
  church: 'kościół',
  theatre: 'teatr / kino',
  gallery: 'galeria',
  viewpoint: 'punkt widokowy',
  information: 'informacja',
  hotel: 'nocleg',
  office: 'urząd',
  post: 'poczta',
  bank: 'bank',
  library: 'biblioteka',
  police: 'policja',
  pharmacy: 'apteka',
  medical: 'lekarz',
  toilets: 'toaleta',
  water: 'woda pitna',
  shop: 'sklep',
  transport: 'przystanek',
  parking: 'parking',
  other: 'inne miejsce',
}

/** Rodzaje z warstw widocznych na mapie, w kolejności legendy. */
export const LEGEND_KINDS: PlaceKind[] = [
  'cafe',
  'restaurant',
  'fast_food',
  'bar',
  'sweets',
  'museum',
  'monument',
  'church',
  'theatre',
  'gallery',
  'office',
  'post',
  'bank',
  'library',
  'pharmacy',
  'medical',
  'toilets',
  'other',
]

/** Wszystkie rodzaje - mapa wczytuje ich ikony z góry. */
export const PLACE_KINDS = Object.keys(KIND_LABEL) as PlaceKind[]

// Tło ikony wg grupy rodzaju. Biały piktogram ma kontrast min. 4.5:1, a kolory nie udają
// statusów dostępności (zielony, pomarańczowy, czerwony i szary należą do kwadracika).
const KIND_GROUP: Record<PlaceKind, PlaceGroup> = {
  cafe: 'food',
  restaurant: 'food',
  fast_food: 'food',
  bar: 'food',
  sweets: 'food',
  museum: 'culture',
  monument: 'culture',
  church: 'culture',
  theatre: 'culture',
  gallery: 'culture',
  viewpoint: 'culture',
  information: 'culture',
  hotel: 'other',
  office: 'services',
  post: 'services',
  bank: 'services',
  library: 'services',
  police: 'services',
  pharmacy: 'health',
  medical: 'health',
  toilets: 'toilets',
  water: 'toilets',
  shop: 'shopping',
  transport: 'transport',
  parking: 'transport',
  other: 'other',
}

export const GROUP_COLOR: Record<PlaceGroup, string> = {
  food: '#b0306a',
  culture: '#6439b0',
  health: '#0a62a8',
  toilets: '#0a62a8',
  services: '#00707a',
  shopping: '#3b47b8',
  transport: '#1f3a5f',
  other: '#2f3a4a',
}

export function kindColor(kind: PlaceKind): string {
  return GROUP_COLOR[KIND_GROUP[kind]]
}

/** Piktogramy na siatce 24×24, rysowane białą kreską. */
const KIND_GLYPH: Record<PlaceKind, string> = {
  cafe: '<path d="M16 9h1.5a3 3 0 0 1 0 6H16"/><path d="M4 9h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M8 3.5v2.5M12 3.5v2.5"/>',
  restaurant:
    '<path d="M4 3v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V3"/><path d="M7 3v18"/><path d="M19 15V3a4 4 0 0 0-4 4v6a2 2 0 0 0 2 2h2zm0 0v6"/>',
  fast_food: '<path d="M4 11a8 7 0 0 1 16 0z"/><path d="M3 15h18"/><path d="M5 19h14"/>',
  bar: '<path d="M8 21h8"/><path d="M12 14v7"/><path d="M5.5 3h13L18 8a6 6 0 0 1-12 0z"/>',
  sweets: '<path d="m7.5 12 4.5 9.5 4.5-9.5"/><path d="M6 12a6 6 0 1 1 12 0z"/>',
  museum:
    '<path d="M3 21h18"/><path d="M6 17v-6M10 17v-6M14 17v-6M18 17v-6"/><path d="M12 3l8 5H4z"/>',
  monument: '<path d="M4 21V9h3V6h2.5v3h5V6H17v3h3v12z"/><path d="M10 21v-3.5a2 2 0 0 1 4 0V21"/>',
  church:
    '<path d="M12 2v6"/><path d="M9.5 4.5h5"/><path d="M5 21V12l7-4 7 4v9z"/><path d="M10 21v-4h4v4"/>',
  theatre:
    '<path d="M4 4h16v7a8 8 0 0 1-16 0z"/><path d="M8.5 9h.01M15.5 9h.01"/><path d="M8.5 13.5a4.5 4.5 0 0 0 7 0"/>',
  gallery:
    '<path d="M12 21a9 9 0 1 1 9-9c0 2.5-2 3-3.5 3H16a2 2 0 0 0-1.4 3.4A1.6 1.6 0 0 1 12 21z"/><path d="M7.5 11h.01M11 7h.01M16 8.5h.01"/>',
  viewpoint:
    '<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  information:
    '<path d="M12 11v8"/><path d="M12 5.5h.01"/><path d="M9.5 11H12"/><path d="M9.5 19h5"/>',
  hotel:
    '<path d="M3 19V5"/><path d="M3 15h18v4"/><path d="M21 15v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11.5" r="1.8"/>',
  office:
    '<path d="M3 21h18"/><path d="M5 21V4h14v17"/><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01"/><path d="M10 21v-4h4v4"/>',
  post: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  bank: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  library:
    '<path d="M4 5a2 2 0 0 1 2-2h14v14H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 0 2 2h14v-4"/>',
  police: '<path d="M12 21.5s7.5-3.5 7.5-9.5V5.5L12 2.5l-7.5 3V12c0 6 7.5 9.5 7.5 9.5z"/>',
  pharmacy:
    '<path d="m10.5 20.5 10-10a5 5 0 1 0-7-7l-10 10a5 5 0 1 0 7 7z"/><path d="m8.5 8.5 7 7"/>',
  medical: '<path d="M12 5v14M5 12h14"/>',
  toilets: '<path d="M2.5 8l2 8 2-5.5 2 5.5 2-8"/><path d="M20.5 9.2a3.5 3.5 0 1 0 0 5.6"/>',
  water:
    '<path d="M12 21.5a6.5 6.5 0 0 0 6.5-6.5c0-1.9-1-3.6-2.8-5.1S12.4 6.2 12 3.5c-.4 2.7-1.9 4.9-3.7 6.4S5.5 13.1 5.5 15a6.5 6.5 0 0 0 6.5 6.5z"/>',
  shop: '<path d="M6 3 3.5 6.5V20a1.5 1.5 0 0 0 1.5 1.5h14a1.5 1.5 0 0 0 1.5-1.5V6.5L18 3z"/><path d="M3.5 6.5h17"/><path d="M15.5 10a3.5 3.5 0 0 1-7 0"/>',
  transport:
    '<rect x="4.5" y="3" width="15" height="15" rx="2"/><path d="M4.5 11h15"/><path d="M8.5 14.5h.01M15.5 14.5h.01"/><path d="M7.5 18v3M16.5 18v3"/>',
  parking: '<path d="M9 18V6h4.5a3.5 3.5 0 0 1 0 7H9"/>',
  other:
    '<path d="M19 10c0 5-7 11.5-7 11.5S5 15 5 10a7 7 0 0 1 14 0z"/><circle cx="12" cy="10" r="2.5"/>',
}

const KIND_SQUARE =
  '<rect x="1" y="1" width="25" height="25" rx="6" fill="COLOR" stroke="#fff" stroke-width="2"/>' +
  '<g transform="translate(5.1 5.1) scale(0.7)" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">GLYPH</g>'

function kindSquare(kind: PlaceKind): string {
  return KIND_SQUARE.replace('COLOR', kindColor(kind)).replace('GLYPH', KIND_GLYPH[kind])
}

/**
 * Znacznik miejsca: kwadrat z piktogramem rodzaju i mały kwadracik dostępności w rogu.
 * Kwadracik ma kolor i znak ikony dostępności, więc kolor nie jest jedynym nośnikiem.
 */
export function placeIconSvg(kind: PlaceKind, access: Access, size = 34): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 34 34">` +
    kindSquare(kind) +
    `<rect x="19" y="19" width="14" height="14" rx="3.5" fill="${ACCESS_COLOR[access]}" stroke="#fff" stroke-width="1.8"/>` +
    `<g transform="translate(20 20) scale(0.5)" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">` +
    `${ACCESS_GLYPH[access]}</g></svg>`
  )
}

/** Sam kwadrat rodzaju, bez kwadracika dostępności - do legendy. */
export function kindIconSvg(kind: PlaceKind, size = 24): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 27 27">` +
    `${kindSquare(kind)}</svg>`
  )
}

/** Sam kwadracik dostępności - do legendy, w tej samej postaci co na znaczniku. */
export function accessBadgeSvg(access: Access, size = 14): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 15 15">` +
    `<rect x="0.5" y="0.5" width="14" height="14" rx="3.5" fill="${ACCESS_COLOR[access]}" stroke="#fff" stroke-width="1"/>` +
    `<g transform="translate(1.5 1.5) scale(0.5)" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">` +
    `${ACCESS_GLYPH[access]}</g></svg>`
  )
}
