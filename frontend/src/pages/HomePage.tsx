import { useEffect, useState } from 'react'
import {
  api,
  DEFAULT_PREFERENCES,
  type Place,
  type RoutePreferences,
  type RouteResponse,
} from '../api/client'
import { MapView } from '../components/MapView'
import { PlaceList } from '../components/PlaceList'
import { PreferencesForm } from '../components/PreferencesForm'
import { RouteDescription } from '../components/RouteDescription'

const CITY = 'krakow'
const KRAKOW_CENTER: [number, number] = [50.0614, 19.9366]

export function HomePage() {
  const [places, setPlaces] = useState<Place[]>([])
  const [prefs, setPrefs] = useState<RoutePreferences>(DEFAULT_PREFERENCES)
  const [route, setRoute] = useState<RouteResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api
      .places(CITY)
      .then(setPlaces)
      .catch((e: Error) => setError(e.message))
  }, [])

  async function planRoute(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      // TODO(frontend): wybór punktów z wyszukiwarki / mapy zamiast stałych
      setRoute(
        await api.route({
          city: CITY,
          origin: { lat: 50.0617, lon: 19.9373 },
          destination: { lat: 50.0672, lon: 19.945 },
          preferences: prefs,
        }),
      )
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="layout">
      <aside className="panel">
        <form onSubmit={planRoute} aria-describedby={error ? 'error' : undefined}>
          <PreferencesForm value={prefs} onChange={setPrefs} />
          <button type="submit" disabled={loading}>
            {loading ? 'Szukam trasy…' : 'Wyznacz trasę'}
          </button>
        </form>
        <div aria-live="polite">
          {error && (
            <p id="error" role="alert" className="error">
              Błąd: {error}
            </p>
          )}
          {route && <RouteDescription route={route} />}
        </div>
        <PlaceList places={places} />
      </aside>
      <MapView center={KRAKOW_CENTER} zoom={14} places={places} route={route} />
    </div>
  )
}
