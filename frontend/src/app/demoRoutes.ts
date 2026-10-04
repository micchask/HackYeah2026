import type { NamedPoint, Preset } from '../components/RoutePoints'

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

export const DEMO_ROUTES: Preset[] = [
  { label: 'Rynek → Wawel', origin: RYNEK, destination: WAWEL },
  { label: 'Wawel → Plac Nowy', origin: WAWEL, destination: PLAC_NOWY },
  { label: 'Rynek → Plac Nowy', origin: RYNEK, destination: PLAC_NOWY },
]
