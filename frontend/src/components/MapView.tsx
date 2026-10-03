import 'maplibre-gl/dist/maplibre-gl.css'
import * as maplibregl from 'maplibre-gl'
import { useEffect, useRef } from 'react'
import type { Place, RouteResponse } from '../api/client'

// Darmowy styl wektorowy bez klucza API
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

interface Props {
  center: [number, number] // [lat, lon]
  zoom: number
  places: Place[]
  route: RouteResponse | null
}

/**
 * Mapa jest uzupełnieniem, nie jedynym źródłem informacji: ta sama treść
 * jest dostępna jako tekst (PlaceList, RouteDescription) - wymóg WCAG.
 */
export function MapView({ center, zoom, places, route }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])

  useEffect(() => {
    if (!container.current) return
    map.current = new maplibregl.Map({
      container: container.current,
      style: MAP_STYLE,
      center: [center[1], center[0]],
      zoom,
    })
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right')
    return () => map.current?.remove()
  }, [center, zoom])

  useEffect(() => {
    markers.current.forEach((m) => m.remove())
    if (!map.current) return
    markers.current = places.map((p) =>
      new maplibregl.Marker()
        .setLngLat([p.location.lon, p.location.lat])
        .setPopup(new maplibregl.Popup().setText(p.name ?? 'Miejsce'))
        .addTo(map.current!),
    )
  }, [places])

  useEffect(() => {
    const m = map.current
    if (!m) return
    const draw = () => {
      const coords = route?.segments.flatMap((s) => s.geometry.map((p) => [p.lon, p.lat])) ?? []
      const data: Parameters<maplibregl.GeoJSONSource['setData']>[0] = {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: coords },
      }
      const source = m.getSource('route') as maplibregl.GeoJSONSource | undefined
      if (source) {
        source.setData(data)
      } else {
        m.addSource('route', { type: 'geojson', data })
        m.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          paint: { 'line-color': '#0b5cad', 'line-width': 6 },
        })
      }
    }
    if (m.isStyleLoaded()) draw()
    else m.once('load', draw)
  }, [route])

  return (
    <section
      ref={container}
      className="map"
      aria-label="Mapa. Te same informacje znajdziesz w opisie trasy i liście miejsc."
    />
  )
}
