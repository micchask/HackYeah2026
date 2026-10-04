// „Dostępne w pobliżu” w panelu „Dla Ciebie” (plan §5.3, #91). Pełne dopasowanie do profilu: #59.
import type { LatLon, Place } from '../api/client'
import { accessibilityOf, placeLayer, type Access } from '../components/placeCategories'
import type { ProfileId } from './state'

// Tryby, dla których liczy się dostępność dla wózka; brak danych nigdy nie jest „dostępne”
const STEP_FREE_MODES: ProfileId[] = ['wheelchair', 'senior', 'stroller']
const ACCESS_ORDER: Access[] = ['yes', 'limited', 'unknown', 'no']

export function distanceM(a: LatLon, b: LatLon): number {
  const k = Math.cos((a.lat * Math.PI) / 180)
  return Math.hypot(a.lat - b.lat, (a.lon - b.lon) * k) * 111_320
}

export interface NearbyPlace {
  place: Place
  access: Access
  distance: number | null
}

/** Do `limit` miejsc z widoku pasujących do trybu: najpierw dostępne, potem najbliższe. */
export function nearbyForMode(
  places: Place[],
  profile: ProfileId | null,
  center: LatLon | null,
  limit = 5,
): NearbyPlace[] {
  const stepFree = profile !== null && STEP_FREE_MODES.includes(profile)
  return (
    places
      // tylko miejsca z warstw (jedzenie, kultura, zdrowie, urzędy) - bez przystanków i „innych”
      .filter((place) => placeLayer(place) !== null)
      .map((place) => ({
        place,
        access: accessibilityOf(place),
        distance: center ? distanceM(center, place.location) : null,
      }))
      .filter(({ access }) => !stepFree || access === 'yes' || access === 'limited')
      .sort(
        (a, b) =>
          ACCESS_ORDER.indexOf(a.access) - ACCESS_ORDER.indexOf(b.access) ||
          (a.distance ?? 0) - (b.distance ?? 0),
      )
      .slice(0, limit)
  )
}
