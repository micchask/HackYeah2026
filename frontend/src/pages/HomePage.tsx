import { useCallback, useEffect, useState } from 'react'
import {
  api,
  DEFAULT_PREFERENCES,
  PROFILE_PRESETS,
  type LatLon,
  type Place,
  type RoutePreferences,
  type RouteResponse,
} from '../api/client'
import { Legend } from '../components/Legend'
import { MapView } from '../components/MapView'
import { PlaceList } from '../components/PlaceList'
import { PreferencesForm } from '../components/PreferencesForm'
import { ProfilePicker } from '../components/ProfilePicker'
import { RouteDescription } from '../components/RouteDescription'
import {
  RoutePoints,
  type NamedPoint,
  type PickTarget,
  type Preset,
} from '../components/RoutePoints'

const CITY = 'krakow'
const KRAKOW_CENTER: [number, number] = [50.0575, 19.9385]

// Punkty ze scenariusza demo (docs/demo-scenario.md)
const RYNEK: NamedPoint = {
  label: 'Rynek Główny (Sukiennice)',
  point: { lat: 50.0617, lon: 19.9373 },
}
const WAWEL: NamedPoint = {
  label: 'Wawel (Dziedziniec Arkadowy)',
  point: { lat: 50.0541, lon: 19.9355 },
}
const PLAC_NOWY: NamedPoint = {
  label: 'Kazimierz (Plac Nowy)',
  point: { lat: 50.0516, lon: 19.9447 },
}

const PRESETS: Preset[] = [
  { label: 'Rynek → Wawel', origin: RYNEK, destination: WAWEL },
  { label: 'Wawel → Plac Nowy', origin: WAWEL, destination: PLAC_NOWY },
  { label: 'Rynek → Plac Nowy', origin: RYNEK, destination: PLAC_NOWY },
]

function mapPoint(point: LatLon): NamedPoint {
  return {
    label: `punkt na mapie (${point.lat.toFixed(5)}, ${point.lon.toFixed(5)})`,
    point,
  }
}

export function HomePage() {
  const [places, setPlaces] = useState<Place[]>([])
  const [prefs, setPrefs] = useState<RoutePreferences>(DEFAULT_PREFERENCES)
  const [origin, setOrigin] = useState<NamedPoint | null>(null)
  const [destination, setDestination] = useState<NamedPoint | null>(null)
  const [pickTarget, setPickTarget] = useState<PickTarget | null>(null)
  const [route, setRoute] = useState<RouteResponse | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api
      .places(CITY)
      .then(setPlaces)
      .catch((e: Error) => setError(e.message))
  }, [])

  useEffect(() => {
    if (!origin || !destination) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await api.route(
          {
            city: CITY,
            origin: origin.point,
            destination: destination.point,
            preferences: prefs,
          },
          controller.signal,
        )
        setRoute(result)
        setSelected(null)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setRoute(null)
        setError((err as Error).message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [origin, destination, prefs])

  const handleMapClick = useCallback(
    (point: LatLon) => {
      const target = pickTarget ?? (!origin ? 'origin' : !destination ? 'destination' : null)
      if (target === 'origin') {
        setOrigin(mapPoint(point))
        setPickTarget(destination ? null : 'destination')
      } else if (target === 'destination') {
        setDestination(mapPoint(point))
        setPickTarget(null)
      }
    },
    [pickTarget, origin, destination],
  )

  const pickLabel =
    pickTarget === 'origin'
      ? 'A'
      : pickTarget === 'destination'
        ? 'B'
        : !origin
          ? 'A'
          : !destination
            ? 'B'
            : null

  return (
    <div className="layout">
      <aside className="panel">
        <form onSubmit={(e) => e.preventDefault()} aria-describedby={error ? 'error' : undefined}>
          <RoutePoints
            origin={origin}
            destination={destination}
            presets={PRESETS}
            pickTarget={pickTarget}
            onPick={setPickTarget}
            onPreset={(preset) => {
              setOrigin(preset.origin)
              setDestination(preset.destination)
              setPickTarget(null)
            }}
            onSwap={() => {
              setOrigin(destination)
              setDestination(origin)
            }}
          />
          <ProfilePicker
            value={prefs.profile}
            onChange={(id) => setPrefs(PROFILE_PRESETS[id].preferences)}
          />
          <details className="advanced">
            <summary>Dostosuj szczegóły</summary>
            <PreferencesForm value={prefs} onChange={setPrefs} />
          </details>
        </form>

        <div aria-live="polite" aria-busy={loading}>
          {loading && <p className="hint">Szukam trasy…</p>}
          {error && (
            <p id="error" role="alert" className="error">
              {error}
            </p>
          )}
          {!route && !error && !loading && (
            <p className="hint">Wybierz gotową trasę albo wskaż punkty A i B na mapie.</p>
          )}
          {route && (
            <>
              <Legend showBaseline={!!route.baseline && !route.is_mock} />
              <RouteDescription route={route} selected={selected} onSelect={setSelected} />
            </>
          )}
        </div>
        <PlaceList places={places} />
      </aside>
      <MapView
        center={KRAKOW_CENTER}
        zoom={14}
        places={places}
        route={route}
        origin={origin?.point ?? null}
        destination={destination?.point ?? null}
        selectedSegment={selected}
        pickLabel={pickLabel}
        onMapClick={handleMapClick}
      />
    </div>
  )
}
