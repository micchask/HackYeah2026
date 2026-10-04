// Koperty dla osób z niepełnosprawnościami - DANE PRZYKŁADOWE (realistyczne miejsca przy ulicach
// obszaru demo, nie z urzędowego rejestru). Prawdziwe dane: #64 (OSM parking_space=disabled, SPP).
import type { DemoPoi } from '../demo'

const parking = (
  id: string,
  name: string,
  lat: number,
  lon: number,
  spaces: number,
  extra: Record<string, string | number | boolean> = {},
): DemoPoi => ({
  id: `demo:parking/${id}`,
  kind: 'parking_disabled',
  name,
  location: { lat, lon },
  details: { spaces, fee: 'bezpłatnie z kartą parkingową', ...extra },
  source: 'demo',
})

export const DEMO_PARKING: DemoPoi[] = [
  parking('szczepanski', 'Plac Szczepański', 50.0631, 19.9353, 2),
  parking('straszewskiego', 'ul. Straszewskiego (przy Plantach)', 50.059, 19.933, 3),
  parking('powisle', 'ul. Powiśle (pod Wawelem)', 50.0545, 19.933, 4, { surface: 'asfalt' }),
  parking('bernardynska', 'ul. Bernardyńska', 50.0532, 19.9378, 2),
  parking('stradomska', 'ul. Stradomska / Dietla', 50.054, 19.942, 2),
  parking('gertrudy', 'ul. św. Gertrudy', 50.057, 19.942, 3),
  parking('westerplatte', 'ul. Westerplatte', 50.062, 19.9435, 2),
  parking('plac-nowy', 'Plac Nowy (Kazimierz)', 50.0514, 19.945, 2, { surface: 'kostka' }),
]
