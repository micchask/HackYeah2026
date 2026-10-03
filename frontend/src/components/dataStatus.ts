import type { RouteSegment } from '../api/client'

type DataStatus = NonNullable<RouteSegment['data_status']>

export const STATUS_LABEL: Record<DataStatus, string> = {
  verified: 'dane potwierdzone',
  unverified: 'dane niepotwierdzone',
  conflicting: 'źródła się nie zgadzają',
  outdated: 'dane mogą być nieaktualne',
}

/** Co status znaczy dla użytkownika - pokazywane w panelu szczegółów odcinka. */
export const STATUS_DESCRIPTION: Record<DataStatus, string> = {
  verified: 'Kilka źródeł podaje to samo albo dane sprawdzono.',
  unverified: 'Jedno źródło, nikt tego jeszcze nie potwierdził.',
  conflicting: 'Źródła podają różne wartości – sprawdź na miejscu.',
  outdated: 'Dane nie były sprawdzane od ponad 2 lat.',
}
