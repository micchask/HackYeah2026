// Co jest zaznaczone na mapie / pokazane w karcie miejsca (plan §5.5, #93).
// Instytucję trzymamy po id, bo pełny obiekt przychodzi z /api/institutions (useAppData).
import type { Institution, InstitutionAttribute, LatLon, Place, SearchResult } from '../api/client'
import { isDemoData, type DemoPoi } from '../api/demo'
import { ATTRIBUTE_LABEL, SOURCE_LABEL, VALUE_LABEL } from '../components/attributes'
import { STATUS_LABEL } from '../components/dataStatus'
import { formatKm } from '../components/format'
import {
  accessibilityOf,
  GROUP_LABEL,
  placeGroup,
  type Access,
} from '../components/placeCategories'

export type SelectedPlace =
  | { kind: 'institution'; id: string }
  | { kind: 'search'; result: SearchResult }
  | { kind: 'place'; place: Place }
  /** Punkt z warstw ławek, przewijaków, parkingów (#89); `source: 'demo'` = dane przykładowe */
  | { kind: 'demo'; poi: DemoPoi }

export function fromSearchResult(result: SearchResult): SelectedPlace {
  return result.source === 'institution' && result.institution_id
    ? { kind: 'institution', id: result.institution_id }
    : { kind: 'search', result }
}

/** Miejsce kliknięte na mapie - jako wynik wyszukiwania, żeby pokazać to samo okienko (PlacePopup). */
export function fromPlace(place: Place, kind?: string): SelectedPlace {
  return {
    kind: 'search',
    result: {
      id: place.id,
      source: 'place',
      match: 'name',
      label: place.name ?? 'Miejsce bez nazwy',
      kind: kind ?? null,
      point: place.location,
      place,
    },
  }
}

// --- karta miejsca: jeden kształt dla wszystkich źródeł -------------------------------------

export interface CardAttribute {
  key: string
  label: string
  value: string
  /** Nazwa źródła po polsku */
  source: string
  /** ISO - kiedy informację ostatnio potwierdzono; null = nie wiadomo */
  date: string | null
  confidence: number | null
  status: { label: string; badge: string }
  /** Inne wartości z innych źródeł - konflikt pokazujemy wprost */
  alternatives: { value: string; source: string }[]
  note?: string | null
}

export interface PlaceCard {
  id: string
  title: string
  /** Rodzaj po polsku, np. „jedzenie”, „muzeum”, „ławka” */
  kind: string | null
  subtitle: string | null
  point: LatLon | null
  access: Access
  /** Dopowiedzenie do statusu, np. dla instytucji: ocena jest w deklaracji */
  accessNote: string | null
  attributes: CardAttribute[]
  /** Dane przykładowe - etykieta „dane przykładowe” */
  demo: boolean
  /** Np. punkt przybliżony (adres bez numeru budynku) */
  locationNote?: string | null
}

const INSTITUTION_STATUS: Record<InstitutionAttribute['status'], CardAttribute['status']> = {
  confirmed: { label: 'potwierdzone', badge: 'badge-verified' },
  confirmed_no_date: { label: 'bez daty weryfikacji', badge: 'badge-outdated' },
  unknown: { label: 'brak informacji', badge: 'badge-unverified' },
}

const DEMO_STATUS: CardAttribute['status'] = { label: 'dane przykładowe', badge: 'badge-demo-data' }

const POI_KIND_LABEL: Record<DemoPoi['kind'], string> = {
  bench: 'ławka',
  changing_table: 'przewijak',
  parking_disabled: 'miejsce parkingowe dla OzN',
}

const DETAIL_LABEL: Record<string, string> = {
  spaces: 'liczba miejsc',
  fee: 'opłata',
  surface: 'nawierzchnia',
  backrest: 'oparcie',
  armrest: 'podłokietniki',
  material: 'materiał',
  covered: 'zadaszenie',
  location: 'gdzie',
  access: 'dostęp',
  opening_hours: 'godziny otwarcia',
}

function text(value: unknown): string {
  return VALUE_LABEL[String(value)] ?? String(value)
}

function sourceLabel(source: string): string {
  return SOURCE_LABEL[source] ?? source
}

function placeAttributes(place: Place): CardAttribute[] {
  return (place.attributes ?? []).map((a) => {
    const status = a.status ?? 'unverified'
    return {
      key: a.key,
      label: ATTRIBUTE_LABEL[a.key] ?? a.key,
      value: text(a.value),
      source: sourceLabel(a.provenance.source),
      date: a.provenance.last_verified ?? null,
      confidence: a.confidence,
      status: { label: STATUS_LABEL[status], badge: `badge-${status}` },
      alternatives: (a.alternatives ?? []).map((alt) => ({
        value: text(alt.value),
        source: sourceLabel(alt.provenance.source),
      })),
    }
  })
}

function placeCardOf(place: Place, extra: Partial<PlaceCard> = {}): PlaceCard {
  return {
    id: place.id,
    title: place.name ?? 'Miejsce bez nazwy',
    kind: GROUP_LABEL[placeGroup(place)],
    subtitle: null,
    point: place.location,
    access: accessibilityOf(place),
    accessNote: null,
    attributes: placeAttributes(place),
    demo: false,
    ...extra,
  }
}

function institutionCard(inst: Institution): PlaceCard {
  return {
    id: `institution:${inst.id}`,
    title: inst.name,
    kind: inst.kind,
    subtitle: inst.address,
    point: inst.location?.point ?? null,
    // Opisy z deklaracji to wolny tekst - nie zgadujemy z nich „dostępne/niedostępne”
    access: 'unknown',
    accessNote: 'Ocena dla wózka nie jest jednoznaczna – szczegóły z deklaracji dostępności niżej.',
    attributes: (inst.attributes ?? []).map((a) => ({
      key: a.category,
      label: a.label,
      value: a.value ?? 'brak informacji',
      source: a.source,
      date: a.last_verified ?? null,
      confidence: a.confidence,
      status: INSTITUTION_STATUS[a.status],
      alternatives: [],
      note: a.note ?? null,
    })),
    demo: false,
    locationNote:
      inst.location && !inst.location.exact
        ? 'Punkt na mapie jest przybliżony – adres nie ma numeru budynku.'
        : null,
  }
}

function poiCard(poi: DemoPoi): PlaceCard {
  const demo = isDemoData(poi)
  const status = demo ? DEMO_STATUS : { label: STATUS_LABEL.unverified, badge: 'badge-unverified' }
  return {
    id: poi.id,
    title: poi.name ?? POI_KIND_LABEL[poi.kind],
    kind: POI_KIND_LABEL[poi.kind],
    subtitle: null,
    point: poi.location,
    access: 'unknown',
    accessNote: null,
    attributes: Object.entries(poi.details).map(([key, value]) => ({
      key,
      label: DETAIL_LABEL[key] ?? key,
      value: text(value),
      source: demo ? 'dane przykładowe' : sourceLabel(poi.provenance?.source ?? poi.source),
      date: poi.provenance?.last_verified ?? null,
      confidence: poi.confidence ?? null,
      status,
      alternatives: [],
    })),
    demo,
  }
}

/** Karta miejsca z dowolnego źródła; null, gdy instytucji nie ma (jeszcze) w danych. */
export function placeCard(selection: SelectedPlace, institutions: Institution[]): PlaceCard | null {
  switch (selection.kind) {
    case 'institution': {
      const inst = institutions.find((i) => i.id === selection.id)
      return inst ? institutionCard(inst) : null
    }
    case 'place':
      return placeCardOf(selection.place)
    case 'demo':
      return poiCard(selection.poi)
    case 'search': {
      const r = selection.result
      if (r.source === 'institution' && r.institution_id)
        return placeCard({ kind: 'institution', id: r.institution_id }, institutions)
      const subtitle =
        [r.description, r.distance_m != null ? `${formatKm(r.distance_m)} od środka mapy` : null]
          .filter(Boolean)
          .join(' · ') || null
      if (r.place)
        return placeCardOf(r.place, { id: r.id, title: r.label, kind: r.kind ?? null, subtitle })
      return {
        id: r.id,
        title: r.label,
        kind: r.kind ?? null,
        subtitle,
        point: r.point,
        access: 'unknown',
        accessNote: null,
        attributes: [],
        demo: false,
      }
    }
  }
}
