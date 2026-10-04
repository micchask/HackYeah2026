import type { components } from '../api/schema'
import { plural } from './format'

type BarrierReport = components['schemas']['BarrierReport']

export type AttributeKey = components['schemas']['AttributeKey']
export type ReportType = components['schemas']['ReportType']
export type ReportStatus = components['schemas']['ReportStatus']

export const ATTRIBUTE_LABEL: Record<AttributeKey, string> = {
  wheelchair: 'dostępność dla wózka',
  step_free_entrance: 'wejście bez schodów',
  stairs: 'schody',
  step_count: 'liczba stopni',
  ramp: 'rampa',
  elevator: 'winda',
  accessible_toilet: 'toaleta dostępna',
  surface: 'nawierzchnia',
  incline_percent: 'nachylenie [%]',
  kerb_height_cm: 'krawężnik [cm]',
  width_cm: 'szerokość przejścia [cm]',
  tactile_paving: 'ścieżka dotykowa',
  blocked: 'przejście zablokowane',
  accessible_parking: 'miejsce parkingowe dla OzN dostępne',
  changing_table: 'przewijak',
}

export const VALUE_LABEL: Record<string, string> = {
  true: 'tak',
  false: 'nie',
  yes: 'tak',
  no: 'nie',
  limited: 'częściowo',
}

export const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  barrier: 'Bariera',
  elevator_broken: 'Niedziałająca winda',
  construction: 'Remont lub zablokowany chodnik',
  inaccessible_entrance: 'Niedostępne wejście',
  blocked_parking: 'Zablokowane miejsce parkingowe dla OzN',
}

export const REPORT_TYPE_ICON: Record<ReportType, string> = {
  barrier: '🚨',
  elevator_broken: '🛗',
  construction: '🚧',
  inaccessible_entrance: '🚪',
  blocked_parking: '🅿️',
}

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  pending: 'czeka na weryfikację',
  confirmed: 'potwierdzone',
  rejected: 'odrzucone',
  resolved: 'rozwiązane',
}

/** Nazwy źródeł danych po polsku (provenance.source). */
export const SOURCE_LABEL: Record<string, string> = {
  osm: 'OpenStreetMap',
  krakow_open_data: 'otwarte dane Krakowa',
  accessibility_declarations: 'deklaracja dostępności (BIP)',
  msip: 'MSIP Kraków',
  user_reports: 'zgłoszenia użytkowników',
  manual: 'dane wprowadzone ręcznie',
  nmt_gugik: 'NMT GUGiK',
  demo: 'dane przykładowe',
}

/** Potwierdzenie po wysłaniu zgłoszenia (formularz i panel zgłoszenia) */
export function reportConfirmation(report: { type: ReportType }): string {
  return `Dziękujemy! Zgłoszenie „${REPORT_TYPE_LABEL[report.type]}” zapisane – czeka na weryfikację.`
}

function people(n: number): string {
  return `${n} ${plural(n, 'osobę', 'osoby', 'osób')}`
}

/** Stan zgłoszenia słowami, np. „Potwierdzone przez 3 osoby · 1 osoba: problemu już nie ma”. */
export function reportVotesText(
  report: Pick<BarrierReport, 'status' | 'confirmations' | 'denials'>,
) {
  const head =
    report.status === 'confirmed'
      ? `Potwierdzone przez ${people(report.confirmations)}`
      : report.confirmations > 0
        ? `Niepotwierdzone – na razie potwierdzone przez ${people(report.confirmations)}`
        : 'Niepotwierdzone – nikt jeszcze nie potwierdził'
  const denials =
    report.denials > 0
      ? ` · ${report.denials} ${plural(report.denials, 'osoba', 'osoby', 'osób')}: problemu już nie ma`
      : ''
  return head + denials
}
