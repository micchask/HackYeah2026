import 'maplibre-gl/dist/maplibre-gl.css'
import * as maplibregl from 'maplibre-gl'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type {
  Barrier,
  Institution,
  LatLon,
  Place,
  RouteResponse,
  SearchResult,
  SegmentCollection,
} from '../api/client'
import { BARRIER_COLOR, BARRIER_TYPES, barrierIconSvg } from './barrierStyle'
import { GAP_CLASSES, GAP_COLOR, GAP_DASH, gapClass } from './dataGapsStyle'
import { DIFFICULTY_COLOR } from './difficulty'
import { POPUP_RESIZE_EVENT } from './MapPopupCard'
import { ACCESS_LEVELS, accessIconSvg, accessibilityOf } from './placeCategories'
import { shortInstitutionName } from './institutionStyle'

export type BaseMap = 'standard' | 'satellite' | 'light'

// Trzy podkłady w jednym stylu - przełączanie widoczności nie przeładowuje warstw aplikacji
const BASE_LAYERS: Record<BaseMap, string> = {
  standard: 'osm',
  satellite: 'satellite',
  light: 'light',
}

function mapStyle(baseMap: BaseMap): maplibregl.StyleSpecification {
  const visibility = (id: BaseMap) => (id === baseMap ? 'visible' : 'none')
  return {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 19,
        attribution: '© OpenStreetMap contributors',
      },
      satellite: {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution: 'Zdjęcia © Esri, Maxar, Earthstar Geographics',
      },
      light: {
        type: 'raster',
        tiles: ['a', 'b', 'c'].map(
          (sub) => `https://${sub}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png`,
        ),
        tileSize: 256,
        maxzoom: 20,
        attribution: '© OpenStreetMap contributors © CARTO',
      },
    },
    layers: [
      {
        id: 'osm',
        type: 'raster',
        source: 'osm',
        layout: { visibility: visibility('standard') },
        // przygaszony podkład, żeby kolory trasy były czytelne
        paint: { 'raster-saturation': -0.6, 'raster-contrast': -0.1 },
      },
      {
        id: 'satellite',
        type: 'raster',
        source: 'satellite',
        layout: { visibility: visibility('satellite') },
        paint: { 'raster-saturation': -0.15 },
      },
      {
        id: 'light',
        type: 'raster',
        source: 'light',
        layout: { visibility: visibility('light') },
      },
    ],
  }
}

type GeoJSONData = Parameters<maplibregl.GeoJSONSource['setData']>[0]

const EMPTY: GeoJSONData = { type: 'FeatureCollection', features: [] }

/** Okienko przy punkcie (instytucja, miejsce z wyszukiwarki...). Treść dostarcza rodzic. */
export interface MapPopup {
  /** Zmiana klucza = nowe okienko (np. inna instytucja) */
  key: string
  point: LatLon
  /** Treść okienka; po zmianie rozmiaru wysyła POPUP_RESIZE_EVENT (patrz MapPopupCard) */
  render: () => ReactNode
}

interface Props {
  center: [number, number] // [lat, lon]
  zoom: number
  /** Miejsca już przefiltrowane wg włączonych warstw - rysowane jako jedna warstwa z klastrami */
  places: Place[]
  /** Klik w miejsce na mapie */
  onPlaceClick?: (place: Place) => void
  /** Aktywny wariant, rysowany kolorami trudności i używany do wyboru odcinka. */
  route: RouteResponse | null
  /** Wszystkie warianty; nieaktywne są rysowane szaro, każdy innym wzorem. */
  routeVariants?: RouteResponse[]
  selectedRoute?: number
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
  /** Klik w znacznik instytucji */
  onInstitutionSelect: (id: string) => void
  popup: MapPopup | null
  /** Zamknięcie okienka: krzyżyk albo klik w mapę */
  onPopupClose: () => void
  /** Pinezka wybranego wyniku wyszukiwania */
  searchPin: LatLon | null
  /** Wszystkie wyniki zapytania o rodzaj/cechę ("hotel", "przewijak") jako punkty na mapie */
  resultPins?: SearchResult[]
  onResultPinClick?: (result: SearchResult) => void
  /** Środek widoku po każdym przesunięciu mapy (np. dla wyszukiwarki) */
  onViewChange?: (center: LatLon) => void
  barriers?: Barrier[]
  showBarriers?: boolean
  selectedBarrier?: string | null
  /** Klik w ikonę bariery na mapie */
  onBarrierSelect?: (id: string | null) => void
  /** Odcinki o niskiej pewności danych (#31); null = warstwa wyłączona */
  dataGaps?: SegmentCollection | null
  /** Przesuń mapę na ten punkt (zmiana seq = ponowne przesunięcie) */
  focus?: { point: LatLon; seq: number } | null
  /** Podkład mapy */
  baseMap?: BaseMap
}

// Linia trasy jest wąska - klik w promieniu kilku pikseli też ją trafia
const HIT_PX = 6
// Poniżej tego zoomu podpisy instytucji by się nakładały - zostają same kropki
const LABEL_MIN_ZOOM = 14
// Podpisy wyników wyszukiwania (np. 126 hoteli) dopiero z bliska - inaczej zakryją mapę
const RESULT_LABEL_MIN_ZOOM = 17
const OTHER_ROUTE_PATTERNS = [
  [1, 1.4],
  [3, 1.6],
  [0.4, 1.2],
]

const PLACE_CLUSTERS = 'places-clusters'
const PLACE_POINTS = 'places-points'
// Powyżej tego zoomu miejsca są już pojedynczo (w Starym Mieście to ok. 2 budynki na ekran)
const PLACE_CLUSTER_MAX_ZOOM = 16

/** Ikony miejsc wg dostępności - te same SVG co w legendzie i na liście. */
function loadPlaceIcons(map: maplibregl.Map): Promise<void> {
  return Promise.all(
    ACCESS_LEVELS.map(
      (access) =>
        new Promise<void>((resolve) => {
          const img = new Image(48, 48)
          img.onload = () => {
            if (!map.hasImage(`place-${access}`))
              map.addImage(`place-${access}`, img, { pixelRatio: 2 })
            resolve()
          }
          img.onerror = () => resolve()
          img.src = `data:image/svg+xml;utf8,${encodeURIComponent(accessIconSvg(access, 48))}`
        }),
    ),
  ).then(() => undefined)
}

/** Kółko klastra z liczbą - rysowane w canvasie, bo rastrowy podkład nie ma fontów dla symboli. */
function clusterImage(count: number): ImageData {
  const scale = 2
  const radius = count < 10 ? 15 : count < 100 ? 18 : 22
  const size = (radius + 3) * 2 * scale
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  const c = radius + 3
  ctx.beginPath()
  ctx.arc(c, c, radius, 0, Math.PI * 2)
  ctx.fillStyle = '#0b5cad'
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = '#ffffff'
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 ${count < 100 ? 13 : 12}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(count), c, c + 0.5)
  return ctx.getImageData(0, 0, size, size)
}

function addPlaceLayers(map: maplibregl.Map) {
  map.addSource('places', {
    type: 'geojson',
    data: EMPTY,
    cluster: true,
    clusterRadius: 40,
    clusterMaxZoom: PLACE_CLUSTER_MAX_ZOOM,
  })
  // Obrazek klastra powstaje przy pierwszym użyciu danej liczby
  map.on('styleimagemissing', (e) => {
    const match = /^cluster-(\d+)$/.exec(e.id)
    if (match && !map.hasImage(e.id))
      map.addImage(e.id, clusterImage(Number(match[1])), { pixelRatio: 2 })
  })
  map.addLayer({
    id: PLACE_CLUSTERS,
    type: 'symbol',
    source: 'places',
    filter: ['has', 'point_count'],
    layout: {
      'icon-image': ['concat', 'cluster-', ['to-string', ['get', 'point_count']]],
      'icon-allow-overlap': true,
    },
  })
  void loadPlaceIcons(map).then(() => {
    if (!map.getStyle() || map.getLayer(PLACE_POINTS)) return
    map.addLayer(
      {
        id: PLACE_POINTS,
        type: 'symbol',
        source: 'places',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': ['concat', 'place-', ['get', 'access']],
          'icon-allow-overlap': true,
        },
      },
      // pod trasą i barierami
      map.getLayer('baseline') ? 'baseline' : undefined,
    )
  })
}

function placeData(places: Place[]): GeoJSONData {
  return {
    type: 'FeatureCollection',
    features: places.map((place) => ({
      type: 'Feature' as const,
      properties: { id: place.id, access: accessibilityOf(place) },
      geometry: {
        type: 'Point' as const,
        coordinates: [place.location.lon, place.location.lat],
      },
    })),
  }
}

const BARRIER_LINES = 'barrier-lines'
const BARRIER_SELECTED = 'barrier-selected'
const BARRIER_ICONS = 'barrier-icons'
const BARRIER_ICON_SELECTED = 'barrier-icon-selected'
// Ikony dopiero od tego zoomu - wcześniej setki barier zasłoniłyby mapę
const BARRIER_ICON_MIN_ZOOM = 15

function barrierColorExpression(): maplibregl.ExpressionSpecification {
  return [
    'match',
    ['get', 'type'],
    ...BARRIER_TYPES.flatMap((t) => [t, BARRIER_COLOR[t]]),
    BARRIER_COLOR.reported,
  ] as unknown as maplibregl.ExpressionSpecification
}

/** Obrazki ikon z tych samych SVG co w legendzie; pixelRatio 2 = ostre na ekranach HiDPI. */
function loadBarrierIcons(map: maplibregl.Map): Promise<void> {
  return Promise.all(
    BARRIER_TYPES.map(
      (type) =>
        new Promise<void>((resolve) => {
          const img = new Image(56, 56)
          img.onload = () => {
            if (!map.hasImage(`barrier-${type}`))
              map.addImage(`barrier-${type}`, img, { pixelRatio: 2 })
            resolve()
          }
          img.onerror = () => resolve()
          img.src = `data:image/svg+xml;utf8,${encodeURIComponent(barrierIconSvg(type, 56))}`
        }),
    ),
  ).then(() => undefined)
}

function addGapLayers(map: maplibregl.Map) {
  map.addSource('data-gaps', { type: 'geojson', data: EMPTY })
  // Jedna warstwa na klasę - wzór linii w MapLibre nie zależy od danych obiektu
  for (const gap of GAP_CLASSES) {
    map.addLayer({
      id: `data-gaps-${gap}`,
      type: 'line',
      source: 'data-gaps',
      filter: ['==', ['get', 'gap'], gap],
      layout: { 'line-cap': 'butt', 'line-join': 'round' },
      paint: { 'line-color': GAP_COLOR[gap], 'line-width': 4, 'line-dasharray': GAP_DASH[gap] },
    })
  }
}

function gapData(gaps: SegmentCollection | null | undefined): GeoJSONData {
  return {
    type: 'FeatureCollection',
    features: (gaps?.features ?? []).map((f) => ({
      type: 'Feature',
      geometry: f.geometry,
      properties: { gap: gapClass(f.properties.confidence) },
    })),
  }
}

function addBarrierLayers(map: maplibregl.Map) {
  map.addSource('barriers', { type: 'geojson', data: EMPTY })
  map.addLayer({
    id: BARRIER_LINES,
    type: 'line',
    source: 'barriers',
    filter: ['==', ['geometry-type'], 'LineString'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': barrierColorExpression(), 'line-width': 4, 'line-opacity': 0.55 },
  })
  map.addLayer({
    id: BARRIER_SELECTED,
    type: 'line',
    source: 'barriers',
    filter: ['==', ['get', 'id'], ''],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#111827', 'line-width': 9, 'line-opacity': 0.85 },
  })
  void loadBarrierIcons(map).then(() => {
    if (!map.getStyle() || map.getLayer(BARRIER_ICONS)) return
    const icon = ['concat', 'barrier-', ['get', 'type']] as maplibregl.ExpressionSpecification
    map.addLayer({
      id: BARRIER_ICONS,
      type: 'symbol',
      source: 'barriers',
      minzoom: BARRIER_ICON_MIN_ZOOM,
      filter: ['all', ['==', ['geometry-type'], 'Point'], ['!=', ['get', 'selected'], true]],
      layout: {
        'icon-image': icon,
        // przy kolizji zostają ważniejsze: schody, krawężnik, zgłoszenia…
        'symbol-sort-key': ['get', 'rank'],
      },
    })
    // Wybrana bariera zawsze widoczna (icon-allow-overlap nie przyjmuje wyrażeń z danych)
    map.addLayer({
      id: BARRIER_ICON_SELECTED,
      type: 'symbol',
      source: 'barriers',
      filter: ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'selected'], true]],
      layout: { 'icon-image': icon, 'icon-allow-overlap': true, 'icon-size': 1.3 },
    })
  })
}

function barrierData(barriers: Barrier[], selected: string | null): GeoJSONData {
  return {
    type: 'FeatureCollection',
    features: barriers.flatMap((b) => {
      const properties = {
        id: b.id,
        type: b.type,
        rank: BARRIER_TYPES.indexOf(b.type),
        selected: b.id === selected,
      }
      const icon = {
        type: 'Feature' as const,
        properties,
        geometry: { type: 'Point' as const, coordinates: [b.location.lon, b.location.lat] },
      }
      if (b.geometry.length < 2) return [icon]
      return [
        {
          type: 'Feature' as const,
          properties,
          geometry: {
            type: 'LineString' as const,
            coordinates: b.geometry.map((p) => [p.lon, p.lat]),
          },
        },
        icon,
      ]
    }),
  }
}

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
  onPlaceClick,
  route,
  routeVariants = [],
  selectedRoute = 0,
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
  popup,
  onPopupClose,
  searchPin,
  resultPins = [],
  onResultPinClick,
  onViewChange,
  barriers = [],
  showBarriers = true,
  selectedBarrier = null,
  onBarrierSelect,
  dataGaps = null,
  focus = null,
  baseMap = 'standard',
}: Props) {
  const container = useRef<HTMLElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const pointMarkers = useRef<maplibregl.Marker[]>([])
  const institutionMarkers = useRef(new Map<string, maplibregl.Marker>())
  const [popupEl, setPopupEl] = useState<HTMLElement | null>(null)
  const onClick = useRef(onMapClick)
  const onSegment = useRef(onSegmentClick)
  const onBounds = useRef(onBoundsChange)
  const onSelect = useRef(onInstitutionSelect)
  const onResultPin = useRef(onResultPinClick)
  const onPopupCloseRef = useRef(onPopupClose)
  const onView = useRef(onViewChange)
  const onBarrier = useRef(onBarrierSelect)
  const onPlace = useRef(onPlaceClick)
  const placesRef = useRef(places)
  const picking = useRef(pickLabel !== null)
  const [mapReady, setMapReady] = useState(false)
  const routeRef = useRef(route)
  const barriersRef = useRef(barriers)
  const baseMapRef = useRef(baseMap)

  // Zmiana podkładu: tylko widoczność warstw rastrowych - trasa, bariery i miejsca zostają
  useEffect(() => {
    baseMapRef.current = baseMap
    const instance = map.current
    if (!instance || !mapReady) return
    for (const [id, layer] of Object.entries(BASE_LAYERS)) {
      if (instance.getLayer(layer)) {
        instance.setLayoutProperty(layer, 'visibility', id === baseMap ? 'visible' : 'none')
      }
    }
  }, [baseMap, mapReady])

  useEffect(() => {
    routeRef.current = route
  }, [route])

  useEffect(() => {
    barriersRef.current = barriers
  }, [barriers])

  useEffect(() => {
    onClick.current = onMapClick
    onSegment.current = onSegmentClick
    onBounds.current = onBoundsChange
    onSelect.current = onInstitutionSelect
    onResultPin.current = onResultPinClick
    onPopupCloseRef.current = onPopupClose
    onView.current = onViewChange
    onBarrier.current = onBarrierSelect
    onPlace.current = onPlaceClick
  }, [
    onMapClick,
    onSegmentClick,
    onBoundsChange,
    onInstitutionSelect,
    onResultPinClick,
    onPopupClose,
    onViewChange,
    onBarrierSelect,
    onPlaceClick,
  ])

  useEffect(() => {
    placesRef.current = places
  }, [places])

  useEffect(() => {
    if (!container.current) return

    const instance = new maplibregl.Map({
      container: container.current,
      style: mapStyle(baseMapRef.current),
      center: [center[1], center[0]],
      zoom,
      attributionControl: false,
    })
    map.current = instance

    // Kontrolki jak w aplikacjach mapowych: prawy dół, nad nimi przyciski Warstwy / Legenda
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    instance.addControl(
      new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }),
      'bottom-right',
    )
    instance.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
    const reportBounds = () => {
      const b = instance.getBounds()
      onBounds.current?.(
        [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()].map((v) => v.toFixed(5)).join(','),
      )
    }
    instance.on('moveend', reportBounds)
    const updateLabels = () => {
      const el = container.current
      if (!el) return
      el.dataset.labels = instance.getZoom() >= LABEL_MIN_ZOOM ? 'on' : 'off'
      el.dataset.resultLabels = instance.getZoom() >= RESULT_LABEL_MIN_ZOOM ? 'on' : 'off'
    }
    updateLabels()
    instance.on('zoom', updateLabels)
    // Wysokość mapy dla CSS: rozwinięte okienko instytucji nie może być wyższe niż mapa
    const updateHeight = () => {
      container.current?.style.setProperty('--map-h', `${instance.getContainer().clientHeight}px`)
    }
    updateHeight()
    instance.on('resize', updateHeight)
    const reportView = () => {
      const c = instance.getCenter()
      onView.current?.({ lat: c.lat, lon: c.lng })
    }
    instance.on('moveend', reportView)
    instance.once('load', reportView)
    instance.on('click', (e) => {
      // Klik w znacznik instytucji albo w okienko nie ustawia punktu A/B
      const target = e.originalEvent.target as Element | null
      if (target?.closest('.inst-marker, .result-pin, .maplibregl-popup')) return
      // Klik w mapę zamyka okienko (jak na mapach Google)
      onPopupCloseRef.current()
      const { x, y } = e.point
      const box: [maplibregl.PointLike, maplibregl.PointLike] = [
        [x - HIT_PX, y - HIT_PX],
        [x + HIT_PX, y + HIT_PX],
      ]
      if (!picking.current && instance.getLayer(PLACE_CLUSTERS)) {
        const [cluster] = instance.queryRenderedFeatures(box, { layers: [PLACE_CLUSTERS] })
        if (cluster) {
          const source = instance.getSource('places') as maplibregl.GeoJSONSource
          void source
            .getClusterExpansionZoom(Number(cluster.properties.cluster_id))
            .then((zoomTo) =>
              instance.easeTo({
                center: (cluster.geometry as GeoJSON.Point).coordinates as [number, number],
                zoom: zoomTo,
              }),
            )
          return
        }
      }
      if (!picking.current && instance.getLayer(PLACE_POINTS)) {
        const [hit] = instance.queryRenderedFeatures(box, { layers: [PLACE_POINTS] })
        const place = hit && placesRef.current.find((p) => p.id === hit.properties.id)
        if (place) {
          onPlace.current?.(place)
          return
        }
      }
      if (!picking.current && instance.getLayer(BARRIER_ICONS)) {
        const [barrier] = instance.queryRenderedFeatures(box, { layers: [BARRIER_ICONS] })
        if (barrier) {
          onBarrier.current?.(String(barrier.properties.id))
          return
        }
      }
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
      // pod trasą i barierami - to tło informacyjne
      addGapLayers(instance)
      addPlaceLayers(instance)
      for (const layer of [PLACE_CLUSTERS, PLACE_POINTS]) {
        instance.on('mouseenter', layer, () => {
          if (!picking.current) instance.getCanvas().style.cursor = 'pointer'
        })
        instance.on('mouseleave', layer, () => {
          instance.getCanvas().style.cursor = picking.current ? 'crosshair' : ''
        })
      }
      addBarrierLayers(instance)
      instance.addSource('baseline', { type: 'geojson', data: EMPTY })
      instance.addSource('other-routes', { type: 'geojson', data: EMPTY })
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
      OTHER_ROUTE_PATTERNS.forEach((pattern, index) => {
        instance.addLayer({
          id: `route-other-${index}`,
          type: 'line',
          source: 'other-routes',
          filter: ['==', ['get', 'variant'], index],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#59636f',
            'line-width': 5,
            'line-opacity': 0.72,
            'line-dasharray': pattern,
          },
        })
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
    if (!mapReady) return
    const source = map.current?.getSource('places') as maplibregl.GeoJSONSource | undefined
    source?.setData(placeData(places))
  }, [places, mapReady])

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
      const displayedRoutes = routeVariants.length ? routeVariants : route ? [route] : []
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
      const otherRoutesData: GeoJSONData = {
        type: 'FeatureCollection',
        features: displayedRoutes.flatMap((variant, variantIndex) =>
          variantIndex === selectedRoute
            ? []
            : variant.segments.map((segment) => ({
                type: 'Feature',
                properties: { variant: variantIndex },
                geometry: {
                  type: 'LineString',
                  coordinates: segment.geometry.map((p) => [p.lon, p.lat]),
                },
              })),
        ),
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
      ;(currentMap.getSource('other-routes') as maplibregl.GeoJSONSource).setData(otherRoutesData)
      ;(currentMap.getSource('baseline') as maplibregl.GeoJSONSource).setData(baselineData)

      const coords = [
        ...displayedRoutes.flatMap((variant) => variant.segments.flatMap((s) => s.geometry)),
        ...(route?.baseline?.geometry ?? []),
      ]
      if (coords.length > 1) {
        const bounds = new maplibregl.LngLatBounds()
        coords.forEach((p) => bounds.extend([p.lon, p.lat]))
        currentMap.fitBounds(bounds, { padding: 80, maxZoom: 17, duration: 700 })
      }
    }

    draw()
  }, [route, routeVariants, selectedRoute, mapReady])

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

  useEffect(() => {
    const currentMap = map.current
    if (!currentMap || !mapReady) return
    const source = currentMap.getSource('barriers') as maplibregl.GeoJSONSource | undefined
    source?.setData(barrierData(barriers, selectedBarrier))
  }, [barriers, selectedBarrier, mapReady])

  useEffect(() => {
    const currentMap = map.current
    if (!currentMap || !mapReady) return
    const apply = () => {
      for (const layer of [BARRIER_LINES, BARRIER_SELECTED, BARRIER_ICONS, BARRIER_ICON_SELECTED]) {
        if (currentMap.getLayer(layer))
          currentMap.setLayoutProperty(layer, 'visibility', showBarriers ? 'visible' : 'none')
      }
    }
    apply()
    // warstwa ikon dochodzi po wczytaniu obrazków
    currentMap.once('styledata', apply)
    return () => {
      currentMap.off('styledata', apply)
    }
  }, [showBarriers, mapReady])

  useEffect(() => {
    const currentMap = map.current
    if (!currentMap || !mapReady || !currentMap.getLayer(BARRIER_SELECTED)) return
    currentMap.setFilter(BARRIER_SELECTED, ['==', ['get', 'id'], selectedBarrier ?? ''])
    // z refa: odświeżenie listy po przesunięciu mapy nie ma przesuwać jej znowu
    const barrier = barriersRef.current.find((b) => b.id === selectedBarrier)
    if (!barrier) return
    if (barrier.geometry.length > 1) {
      const bounds = new maplibregl.LngLatBounds()
      barrier.geometry.forEach((p) => bounds.extend([p.lon, p.lat]))
      currentMap.fitBounds(bounds, { padding: 140, maxZoom: 18, duration: 600 })
    } else {
      currentMap.easeTo({
        center: [barrier.location.lon, barrier.location.lat],
        zoom: Math.max(currentMap.getZoom(), 17),
        duration: 600,
      })
    }
  }, [selectedBarrier, mapReady])

  useEffect(() => {
    const currentMap = map.current
    if (!currentMap || !mapReady) return
    const source = currentMap.getSource('data-gaps') as maplibregl.GeoJSONSource | undefined
    source?.setData(gapData(dataGaps))
  }, [dataGaps, mapReady])

  useEffect(() => {
    const currentMap = map.current
    if (!currentMap || !mapReady || !focus) return
    currentMap.easeTo({
      center: [focus.point.lon, focus.point.lat],
      zoom: Math.max(currentMap.getZoom(), 17),
      duration: 600,
    })
    // nowy obiekt focus przy każdym kliknięciu - ten sam punkt drugi raz też przesuwa mapę
  }, [focus, mapReady])

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

  useEffect(() => {
    institutionMarkers.current.forEach((marker, id) =>
      marker.getElement().setAttribute('aria-pressed', String(id === selectedInstitution)),
    )
  }, [selectedInstitution, institutions, mapReady])

  // Wyniki zapytania o rodzaj/cechę: punkt + nazwa (z bliska); mapa obejmuje je wszystkie
  useEffect(() => {
    const currentMap = map.current
    if (!currentMap || !mapReady || !resultPins.length) return
    const markers = resultPins.map((result) => {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'result-pin'
      // klawiatura i czytniki ekranu: lista wyników w panelu (bez setek przystanków Tab na mapie)
      el.tabIndex = -1
      el.title = result.label
      el.setAttribute('aria-label', `${result.label} – pokaż szczegóły`)
      const dot = document.createElement('span')
      dot.className = 'result-pin-dot'
      const label = document.createElement('span')
      label.className = 'result-pin-label'
      label.textContent = result.label
      el.append(dot, label)
      el.addEventListener('click', () => onResultPin.current?.(result))
      return new maplibregl.Marker({ element: el, anchor: 'left', offset: [-6, 0] })
        .setLngLat([result.point.lon, result.point.lat])
        .addTo(currentMap)
    })
    const bounds = new maplibregl.LngLatBounds()
    resultPins.forEach((r) => bounds.extend([r.point.lon, r.point.lat]))
    currentMap.fitBounds(bounds, { padding: 80, maxZoom: 17, duration: 700 })
    return () => markers.forEach((m) => m.remove())
  }, [resultPins, mapReady])

  // Pinezka wybranego wyniku wyszukiwania (miejsca bez własnego znacznika na mapie)
  useEffect(() => {
    const currentMap = map.current
    if (!currentMap || !mapReady || !searchPin) return
    const el = document.createElement('div')
    el.className = 'search-pin'
    el.setAttribute('aria-hidden', 'true')
    const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([searchPin.lon, searchPin.lat])
      .addTo(currentMap)
    return () => {
      marker.remove()
    }
  }, [searchPin, mapReady])

  // Okienko przy punkcie; treść renderuje React (portal) - patrz niżej
  const popupKey = popup?.key ?? null
  const popupLat = popup?.point.lat
  const popupLon = popup?.point.lon
  useEffect(() => {
    const currentMap = map.current
    if (!currentMap || !mapReady || popupLat === undefined || popupLon === undefined) {
      setPopupEl(null)
      return
    }
    const el = document.createElement('div')
    const onClose = () => onPopupCloseRef.current()
    const instance = new maplibregl.Popup({
      offset: 14,
      maxWidth: '340px',
      // zamykanie kliknięciem w mapę obsługujemy sami - inaczej klik w inny znacznik
      // najpierw wybrałby nowy obiekt, a potem zamknięcie starego okienka by go skasowało
      closeOnClick: false,
      focusAfterOpen: false,
      className: 'institution-popup-wrap',
    })
      .setLngLat([popupLon, popupLat])
      .setDOMContent(el)
      .addTo(currentMap)
    instance.on('close', onClose)
    // Po rozwinięciu okienko jest wyższe: MapLibre wybiera stronę na nowo (setLngLat),
    // a jeśli dalej wystaje poza mapę - przesuwamy mapę o brakujące piksele
    const fit = () => {
      instance.setLngLat(instance.getLngLat())
      requestAnimationFrame(() => {
        const box = instance.getElement().getBoundingClientRect()
        const area = currentMap.getContainer().getBoundingClientRect()
        const margin = 12
        let dx = 0
        let dy = 0
        if (box.top < area.top + margin) dy = box.top - area.top - margin
        else if (box.bottom > area.bottom - margin) dy = box.bottom - area.bottom + margin
        if (box.left < area.left + margin) dx = box.left - area.left - margin
        else if (box.right > area.right - margin) dx = box.right - area.right + margin
        if (dx || dy) currentMap.panBy([dx, dy], { duration: 300 })
      })
    }
    el.addEventListener(POPUP_RESIZE_EVENT, fit)
    setPopupEl(el)
    currentMap.easeTo({
      center: [popupLon, popupLat],
      zoom: Math.max(currentMap.getZoom(), 16),
      duration: 600,
    })
    return () => {
      // usuwamy bez zdarzenia 'close' - to zmiana wyboru, nie zamknięcie przez użytkownika
      instance.off('close', onClose)
      el.removeEventListener(POPUP_RESIZE_EVENT, fit)
      instance.remove()
    }
  }, [popupKey, popupLat, popupLon, mapReady])

  return (
    <>
      <section
        ref={container}
        className="map"
        aria-label="Mapa. Te same informacje, w tym szczegóły odcinków, instytucji i miejsc (lista „Miejsca i źródła danych”), znajdziesz w panelu obok."
      />
      {popupEl && popup && createPortal(popup.render(), popupEl)}
    </>
  )
}
