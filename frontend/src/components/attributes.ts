import type { components } from '../api/schema'

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
