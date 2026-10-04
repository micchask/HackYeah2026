// Kategorie miejsc i dostępność - jedno źródło dla mapy, legendy, listy i chipów warstw (#81, #90).
// Mapowanie tagów jest zwykłą tabelą, żeby dało się je przenieść do backendu (#59).
import type { Place } from '../api/client'
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
  information: 'informacja turystyczna',
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
