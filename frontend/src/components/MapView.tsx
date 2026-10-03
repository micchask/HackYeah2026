import 'maplibre-gl/dist/maplibre-gl.css'
import * as maplibregl from 'maplibre-gl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Institution, LatLon, Place, RouteResponse } from '../api/client'
import { DIFFICULTY_COLOR } from './difficulty'
import { InstitutionPopup } from './InstitutionPopup'
import { shortInstitutionName } from './institutionStyle'

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      // przygaszony podkład, żeby kolory trasy były czytelne
      paint: { 'raster-saturation': -0.6, 'raster-contrast': -0.1 },
    },
  ],
}

type GeoJSONData = Parameters<maplibregl.GeoJSONSource['setData']>[0]

const EMPTY: GeoJSONData = { type: 'FeatureCollection', features: [] }

interface Props {
  center: [number, number] // [lat, lon]
  zoom: number
  places: Place[]
  route: RouteResponse | null
  origin: LatLon | null
  destination: LatLon | null
  /** Miejsce zgłaszanej bariery (formularz „Zgłoś barierę”) */
  reportPoint?: LatLon | null
  selectedSegment: number | null
  /** Etykieta punktu, który ustawi kliknięcie w mapę, np. "A" */
  pickLabel: string | null
  onMapClick: (point: LatLon) => void
  /** Kliknięcie w odcinek trasy (poza trybem wskazywania punktu) */
  onSegmentClick: (index: number) => void
  /** Widoczny obszar mapy "south,west,north,east" - po załadowaniu i po każdym przesunięciu */
  onBoundsChange?: (bbox: string) => void
  institutions: Institution[]
  selectedInstitution: string | null
  /** Wybór instytucji (klik w znacznik) albo zamknięcie okienka (null) */
  onInstitutionSelect: (id: string | null) => void
  /** "Start (A)" / "Cel (B)" w okienku instytucji */
  onInstitutionRoute: (institution: Institution, target: 'origin' | 'destination') => void
}

// Linia trasy jest wąska - klik w promieniu kilku pikseli też ją trafia
const HIT_PX = 6
// Poniżej tego zoomu podpisy instytucji by się nakładały - zostają same kropki
const LABEL_MIN_ZOOM = 14

function institutionMarker(inst: Institution): HTMLButtonElement {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = 'inst-marker'
  // Klawiatura i czytniki ekranu korzystają z listy instytucji w panelu - bez 32 przystanków Tab na mapie
  el.tabIndex = -1
  el.title = inst.name
  el.setAttribute('aria-label', `${inst.name} – pokaż szczegóły`)
  const dot = document.createElement('span')
  dot.className = 'inst-marker-dot'
  const label = document.createElement('span')
  label.className = 'inst-marker-label'
  label.textContent = shortInstitutionName(inst.name)
  el.append(dot, label)
  return el
}

/**
 * Mapa jest uzupełnieniem, nie jedynym źródłem informacji.
 * Te same dane są dostępne tekstowo dla wymagań WCAG.
 */
export function MapView({
  center,
  zoom,
  places,
  route,
  origin,
  destination,
  reportPoint = null,
  selectedSegment,
  pickLabel,
  onMapClick,
  onSegmentClick,
  onBoundsChange,
  institutions,
  selectedInstitution,
  onInstitutionSelect,
  onInstitutionRoute,
}: Props) {
  const container = useRef<HTMLElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  const pointMarkers = useRef<maplibregl.Marker[]>([])
  const institutionMarkers = useRef(new Map<string, maplibregl.Marker>())
  const popup = useRef<maplibregl.Popup | null>(null)
  const [popupEl, setPopupEl] = useState<HTMLElement | null>(null)
  const onClick = useRef(onMapClick)
  const onSegment = useRef(onSegmentClick)
  const onBounds = useRef(onBoundsChange)
  const onSelect = useRef(onInstitutionSelect)
  const picking = useRef(pickLabel !== null)
  const [mapReady, setMapReady] = useState(false)
  const routeRef = useRef(route)

  useEffect(() => {
    routeRef.current = route
  }, [route])

  useEffect(() => {
    onClick.current = onMapClick
    onSegment.current = onSegmentClick
    onBounds.current = onBoundsChange
    onSelect.current = onInstitutionSelect
  }, [onMapClick, onSegmentClick, onBoundsChange, onInstitutionSelect])

  useEffect(() => {
    if (!container.current) return

    const instance = new maplibregl.Map({
      container: container.current,
      style: MAP_STYLE,
      center: [center[1], center[0]],
      zoom,
    })
    map.current = instance

    instance.addControl(new maplibregl.NavigationControl(), 'top-right')
    const reportBounds = () => {
      const b = instance.getBounds()
      onBounds.current?.(
        [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()].map((v) => v.toFixed(5)).join(','),
      )
    }
    instance.on('moveend', reportBounds)
    const updateLabels = () => {
      const el = container.current
      if (el) el.dataset.labels = instance.getZoom() >= LABEL_MIN_ZOOM ? 'on' : 'off'
    }
    updateLabels()
    instance.on('zoom', updateLabels)
    // Wysokość mapy dla CSS: rozwinięte okienko instytucji nie może być wyższe niż mapa
    const updateHeight = () => {
      container.current?.style.setProperty('--map-h', `${instance.getContainer().clientHeight}px`)
    }
    updateHeight()
    instance.on('resize', updateHeight)
    instance.on('click', (e) => {
      // Klik w znacznik instytucji albo w okienko nie ustawia punktu A/B
      const target = e.originalEvent.target as Element | null
      if (target?.closest('.inst-marker, .maplibregl-popup')) return
      // Klik w mapę zamyka okienko instytucji (jak na mapach Google)
      onSelect.current(null)
      const { x, y } = e.point
      const box: [maplibregl.PointLike, maplibregl.PointLike] = [
        [x - HIT_PX, y - HIT_PX],
        [x + HIT_PX, y + HIT_PX],
      ]
      if (!picking.current && instance.getLayer('route')) {
        const [hit] = instance.queryRenderedFeatures(box, { layers: ['route'] })
        if (hit) {
          onSegment.current(Number(hit.properties.index))
          return
        }
      }
      onClick.current({ lat: e.lngLat.lat, lon: e.lngLat.lng })
    })
    instance.on('load', () => {
      instance.addSource('baseline', { type: 'geojson', data: EMPTY })
      instance.addSource('route', { type: 'geojson', data: EMPTY })
      instance.addLayer({
        id: 'baseline',
        type: 'line',
        source: 'baseline',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#3d4652',
          'line-width': 4,
          'line-opacity': 0.75,
          'line-dasharray': [1, 1.6],
        },
      })
      instance.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 11 },
      })
      instance.addLayer({
        id: 'route-selected',
        type: 'line',
        source: 'route',
        filter: ['==', ['get', 'index'], -1],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#111827', 'line-width': 16 },
      })
      instance.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': [
            'match',
            ['get', 'difficulty'],
            'hard',
            DIFFICULTY_COLOR.hard,
            'moderate',
            DIFFICULTY_COLOR.moderate,
            DIFFICULTY_COLOR.easy,
          ],
          'line-width': 7,
        },
      })
      instance.on('mouseenter', 'route', () => {
        if (!picking.current) instance.getCanvas().style.cursor = 'pointer'
      })
      instance.on('mouseleave', 'route', () => {
        instance.getCanvas().style.cursor = picking.current ? 'crosshair' : ''
      })
      setMapReady(true)
      reportBounds()
    })

    return () => {
      instance.remove()
      map.current = null
      setMapReady(false)
    }
  }, [center, zoom])

  useEffect(() => {
    picking.current = pickLabel !== null
    const el = map.current?.getCanvas()
    if (el) el.style.cursor = pickLabel ? 'crosshair' : ''
  }, [pickLabel])

  useEffect(() => {
    markers.current.forEach((marker) => marker.remove())

    if (!map.current) return

    markers.current = places.map((place) => {
      const popup = document.createElement('div')
      const name = document.createElement('strong')
      name.textContent = place.name ?? 'Miejsce'
      popup.append(name, document.createElement('br'), place.category ?? '')
      return new maplibregl.Marker({ color: '#5b3a8c', scale: 0.7 })
        .setLngLat([place.location.lon, place.location.lat])
        .setPopup(new maplibregl.Popup().setDOMContent(popup))
        .addTo(map.current!)
    })
  }, [places])

  useEffect(() => {
    pointMarkers.current.forEach((marker) => marker.remove())
    const currentMap = map.current
    if (!currentMap) return

    const points: [string, string, LatLon | null][] = [
      ['A', 'a', origin],
      ['B', 'b', destination],
      ['!', 'report', reportPoint],
    ]
    pointMarkers.current = points
      .filter((entry): entry is [string, string, LatLon] => entry[2] !== null)
      .map(([label, kind, point]) => {
        const el = document.createElement('div')
        el.className = `point-marker point-marker-${kind}`
        el.textContent = label
        el.setAttribute('aria-hidden', 'true')
        return new maplibregl.Marker({ element: el })
          .setLngLat([point.lon, point.lat])
          .addTo(currentMap)
      })
  }, [origin, destination, reportPoint])

  useEffect(() => {
    const currentMap = map.current
    if (!currentMap || !mapReady) return

    const draw = () => {
      const routeData: GeoJSONData = {
        type: 'FeatureCollection',
        features:
          route?.segments.map((segment, index) => ({
            type: 'Feature',
            properties: { index, difficulty: segment.difficulty },
            geometry: {
              type: 'LineString',
              coordinates: segment.geometry.map((p) => [p.lon, p.lat]),
            },
          })) ?? [],
      }
      const baselineData: GeoJSONData =
        route?.baseline && !route.is_mock
          ? {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: route.baseline.geometry.map((p) => [p.lon, p.lat]),
                  },
                },
              ],
            }
          : EMPTY
      ;(currentMap.getSource('route') as maplibregl.GeoJSONSource).setData(routeData)
      ;(currentMap.getSource('baseline') as maplibregl.GeoJSONSource).setData(baselineData)

      const coords = [
        ...(route?.segments.flatMap((s) => s.geometry) ?? []),
        ...(route?.baseline?.geometry ?? []),
      ]
      if (coords.length > 1) {
        const bounds = new maplibregl.LngLatBounds()
        coords.forEach((p) => bounds.extend([p.lon, p.lat]))
        currentMap.fitBounds(bounds, { padding: 80, maxZoom: 17, duration: 700 })
      }
    }

    draw()
  }, [route, mapReady])

  useEffect(() => {
    const currentMap = map.current
    if (!currentMap || !mapReady) return
    currentMap.setFilter('route-selected', ['==', ['get', 'index'], selectedSegment ?? -1])
    const geometry =
      selectedSegment !== null ? routeRef.current?.segments[selectedSegment]?.geometry : null
    if (geometry && geometry.length > 1) {
      const bounds = new maplibregl.LngLatBounds()
      geometry.forEach((p) => bounds.extend([p.lon, p.lat]))
      currentMap.fitBounds(bounds, { padding: 120, maxZoom: 18, duration: 600 })
    }
  }, [selectedSegment, mapReady])

  // Znaczniki instytucji: kropka + podpis z nazwą (jak na mapach Google)
  useEffect(() => {
    const currentMap = map.current
    if (!currentMap || !mapReady) return
    const created = new Map<string, maplibregl.Marker>()
    for (const inst of institutions) {
      if (!inst.location) continue
      const el = institutionMarker(inst)
      el.addEventListener('click', () => onSelect.current(inst.id))
      created.set(
        inst.id,
        // kotwica z lewej: środek kropki (14 px) dokładnie w punkcie, podpis obok
        new maplibregl.Marker({ element: el, anchor: 'left', offset: [-7, 0] })
          .setLngLat([inst.location.point.lon, inst.location.point.lat])
          .addTo(currentMap),
      )
    }
    institutionMarkers.current = created
    return () => created.forEach((marker) => marker.remove())
  }, [institutions, mapReady])

  // Okienko przy wybranym punkcie; treść renderuje React (portal) - patrz niżej
  useEffect(() => {
    const currentMap = map.current
    institutionMarkers.current.forEach((marker, id) =>
      marker.getElement().setAttribute('aria-pressed', String(id === selectedInstitution)),
    )
    const point = institutions.find((i) => i.id === selectedInstitution)?.location?.point
    if (!currentMap || !mapReady || !point) {
      setPopupEl(null)
      return
    }
    const el = document.createElement('div')
    const onClose = () => onSelect.current(null)
    const instance = new maplibregl.Popup({
      offset: 14,
      maxWidth: '340px',
      // zamykanie kliknięciem w mapę obsługujemy sami - inaczej klik w inny znacznik
      // najpierw wybrałby nową instytucję, a potem zamknięcie starego okienka by ją skasowało
      closeOnClick: false,
      focusAfterOpen: false,
      className: 'institution-popup-wrap',
    })
      .setLngLat([point.lon, point.lat])
      .setDOMContent(el)
      .addTo(currentMap)
    instance.on('close', onClose)
    popup.current = instance
    setPopupEl(el)
    currentMap.easeTo({
      center: [point.lon, point.lat],
      zoom: Math.max(currentMap.getZoom(), 15),
      duration: 600,
    })
    return () => {
      // usuwamy bez zdarzenia 'close' - to zmiana wyboru, nie zamknięcie przez użytkownika
      instance.off('close', onClose)
      instance.remove()
      popup.current = null
    }
  }, [selectedInstitution, institutions, mapReady])

  // Po rozwinięciu okienko jest wyższe: MapLibre wybiera stronę na nowo (setLngLat),
  // a jeśli dalej wystaje poza mapę - przesuwamy mapę o brakujące piksele
  const fitPopup = useCallback(() => {
    const p = popup.current
    const m = map.current
    if (!p || !m) return
    p.setLngLat(p.getLngLat())
    requestAnimationFrame(() => {
      const box = p.getElement().getBoundingClientRect()
      const area = m.getContainer().getBoundingClientRect()
      const margin = 12
      let dx = 0
      let dy = 0
      if (box.top < area.top + margin) dy = box.top - area.top - margin
      else if (box.bottom > area.bottom - margin) dy = box.bottom - area.bottom + margin
      if (box.left < area.left + margin) dx = box.left - area.left - margin
      else if (box.right > area.right - margin) dx = box.right - area.right + margin
      if (dx || dy) m.panBy([dx, dy], { duration: 300 })
    })
  }, [])

  const selected = institutions.find((i) => i.id === selectedInstitution)

  return (
    <>
      <section
        ref={container}
        className="map"
        aria-label="Mapa. Te same informacje, w tym szczegóły odcinków i instytucji, znajdziesz w panelu obok."
      />
      {popupEl &&
        selected &&
        createPortal(
          <InstitutionPopup
            key={selected.id}
            institution={selected}
            onSetOrigin={() => onInstitutionRoute(selected, 'origin')}
            onSetDestination={() => onInstitutionRoute(selected, 'destination')}
            onClose={() => onInstitutionSelect(null)}
            onResize={fitPopup}
          />,
          popupEl,
        )}
    </>
  )
}
