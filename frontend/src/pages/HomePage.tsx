import { useCallback, useEffect, useState } from 'react'
import {
  api,
  DEFAULT_PREFERENCES,
  PROFILE_PRESETS,
  type Institution,
  type LatLon,
  type Place,
  type RoutePreferences,
  type RouteResponse,
} from '../api/client'
import { AlertIcon, PinIcon, SlidersIcon } from '../components/icons'
import { InstitutionDetails } from '../components/InstitutionDetails'
import { InstitutionList } from '../components/InstitutionList'
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
import { RouteSummary } from '../components/RouteSummary'

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
    label: `Punkt na mapie (${point.lat.toFixed(4)}, ${point.lon.toFixed(4)})`,
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
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(null)

  useEffect(() => {
    api
      .places(CITY)
      .then(setPlaces)
      .catch((e: Error) => setError(e.message))
    api
      .institutions(CITY)
      .then(setInstitutions)
      .catch(() => {
        // bez warstwy instytucji aplikacja dalej działa
      })
  }, [])

  const institution = institutions.find((i) => i.id === selectedInstitution) ?? null

  function institutionPoint(inst: Institution): NamedPoint | null {
    return inst.location ? { label: inst.name, point: inst.location.point } : null
  }

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

  const activeTarget: PickTarget | null =
    pickTarget ?? (!origin ? 'origin' : !destination ? 'destination' : null)

  const setPoint = useCallback((target: PickTarget, value: NamedPoint) => {
    if (target === 'origin') setOrigin(value)
    else setDestination(value)
  }, [])

  const handleMapClick = useCallback(
    (point: LatLon) => {
      if (!activeTarget) return
      const picked = mapPoint(point)
      setPoint(activeTarget, picked)
      setPickTarget(activeTarget === 'origin' && !destination ? 'destination' : null)

      // Adres zamiast współrzędnych, jeśli geokoder odpowie; punkt zostaje ten sam
      const setter = activeTarget === 'origin' ? setOrigin : setDestination
      api
        .reverseGeocode(point, CITY)
        .then((found) => {
          if (!found) return
          setter((current) => (current === picked ? { label: found.label, point } : current))
        })
        .catch(() => {
          // brak geokodera: zostają współrzędne
        })
    },
    [activeTarget, destination, setPoint],
  )

  const pickLetter = activeTarget === 'origin' ? 'A' : activeTarget === 'destination' ? 'B' : null

  return (
    <div className="layout">
      <aside className="panel" aria-label="Planowanie trasy">
        <form
          className="card"
          onSubmit={(e) => e.preventDefault()}
          aria-describedby={error ? 'error' : undefined}
        >
          <RoutePoints
            city={CITY}
            origin={origin}
            destination={destination}
            presets={PRESETS}
            pickTarget={pickTarget}
            onChange={(target, value) => {
              setPoint(target, value)
              setPickTarget(null)
            }}
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
            <summary>
              <SlidersIcon size={18} /> Dostosuj szczegóły
            </summary>
            <PreferencesForm value={prefs} onChange={setPrefs} />
          </details>
        </form>

        <div className="results" aria-live="polite" aria-busy={loading}>
          {error && (
            <p id="error" role="alert" className="callout callout-error">
              <AlertIcon size={18} />
              <span>{error}</span>
            </p>
          )}
          {loading && !route && (
            <div className="card skeleton" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          )}
          {loading && <p className="visually-hidden">Szukam trasy…</p>}
          {!route && !error && !loading && (
            <section className="card empty" aria-labelledby="start-heading">
              <h2 id="start-heading">Jak to działa?</h2>
              <ol>
                <li>Wpisz adres startu i celu, wybierz trasę demo albo wskaż punkty na mapie.</li>
                <li>Zaznacz, jak się poruszasz – trasa przeliczy się od razu.</li>
                <li>Sprawdź opis krok po kroku: bruk, schody, źródła danych.</li>
              </ol>
            </section>
          )}
          {route && (
            <div className={loading ? 'stale' : undefined}>
              <RouteSummary route={route} />
              <RouteDescription route={route} selected={selected} onSelect={setSelected} />
            </div>
          )}
        </div>

        {institution && (
          <InstitutionDetails
            institution={institution}
            onSetOrigin={() => {
              const p = institutionPoint(institution)
              if (p) setPoint('origin', p)
              setPickTarget(null)
            }}
            onSetDestination={() => {
              const p = institutionPoint(institution)
              if (p) setPoint('destination', p)
              setPickTarget(null)
            }}
            onClose={() => setSelectedInstitution(null)}
          />
        )}

        <InstitutionList
          institutions={institutions}
          selected={selectedInstitution}
          onSelect={setSelectedInstitution}
        />

        <PlaceList places={places} />
      </aside>

      <div className="map-wrap">
        <MapView
          center={KRAKOW_CENTER}
          zoom={14}
          places={places}
          route={route}
          origin={origin?.point ?? null}
          destination={destination?.point ?? null}
          selectedSegment={selected}
          pickLabel={pickLetter}
          onMapClick={handleMapClick}
          onSegmentClick={setSelected}
          institutions={institutions}
          selectedInstitution={selectedInstitution}
          onInstitutionClick={setSelectedInstitution}
        />
        {pickLetter && (
          <div className="map-banner">
            <PinIcon size={18} />
            <span>
              Kliknij na mapie, aby ustawić punkt <strong>{pickLetter}</strong>
            </span>
            {pickTarget && (
              <button type="button" className="banner-button" onClick={() => setPickTarget(null)}>
                Anuluj
              </button>
            )}
          </div>
        )}
        {loading && (
          <div className="map-loading" aria-hidden="true">
            <span className="spinner" /> Szukam trasy…
          </div>
        )}
        {(route || institutions.length > 0) && (
          <Legend
            showRoute={!!route}
            showBaseline={!!route?.baseline && !route.is_mock}
            showInstitutions={institutions.length > 0}
          />
        )}
      </div>
    </div>
  )
}
