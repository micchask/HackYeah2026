import 'maplibre-gl/dist/maplibre-gl.css'
import * as maplibregl from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'
import type { LatLon, Place, RouteResponse } from '../api/client'
import { DIFFICULTY_COLOR } from './difficulty'

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
  selectedSegment: number | null
  /** Etykieta punktu, który ustawi kliknięcie w mapę, np. "A" */
  pickLabel: string | null
  onMapClick: (point: LatLon) => void
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
  selectedSegment,
  pickLabel,
  onMapClick,
}: Props) {
  const container = useRef<HTMLElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  const pointMarkers = useRef<maplibregl.Marker[]>([])
  const onClick = useRef(onMapClick)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    onClick.current = onMapClick
  }, [onMapClick])

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
    instance.on('click', (e) => onClick.current({ lat: e.lngLat.lat, lon: e.lngLat.lng }))
    instance.on('load', () => {
      instance.addSource('baseline', { type: 'geojson', data: EMPTY })
      instance.addSource('route', { type: 'geojson', data: EMPTY })
      instance.addLayer({
        id: 'baseline',
        type: 'line',
        source: 'baseline',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#4a4a4a', 'line-width': 4, 'line-dasharray': [1, 2] },
      })
      instance.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 10 },
      })
      instance.addLayer({
        id: 'route-selected',
        type: 'line',
        source: 'route',
        filter: ['==', ['get', 'index'], -1],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#1a1a1a', 'line-width': 14 },
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
          'line-width': 6,
        },
      })
      setMapReady(true)
    })

    return () => {
      instance.remove()
      map.current = null
      setMapReady(false)
    }
  }, [center, zoom])

  useEffect(() => {
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

    pointMarkers.current = (
      [
        ['A', origin],
        ['B', destination],
      ] as const
    )
      .filter((entry): entry is ['A' | 'B', LatLon] => entry[1] !== null)
      .map(([label, point]) => {
        const el = document.createElement('div')
        el.className = `point-marker point-marker-${label.toLowerCase()}`
        el.textContent = label
        el.setAttribute('aria-hidden', 'true')
        return new maplibregl.Marker({ element: el })
          .setLngLat([point.lon, point.lat])
          .addTo(currentMap)
      })
  }, [origin, destination])

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
        currentMap.fitBounds(bounds, { padding: 60, maxZoom: 17, duration: 600 })
      }
    }

    draw()
  }, [route, mapReady])

  useEffect(() => {
    const currentMap = map.current
    if (!currentMap || !mapReady) return
    currentMap.setFilter('route-selected', ['==', ['get', 'index'], selectedSegment ?? -1])
  }, [selectedSegment, mapReady])

  return (
    <section
      ref={container}
      className="map"
      aria-label="Mapa. Te same informacje znajdziesz w opisie trasy i liście miejsc."
    />
  )
}
