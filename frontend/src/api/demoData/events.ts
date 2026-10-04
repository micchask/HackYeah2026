// Wydarzenia - DANE PRZYKŁADOWE w prawdziwych instytucjach z deklaracji dostępności (#75).
// Daty liczone od dziś, żeby na demo zawsze były „nadchodzące”. Prawdziwe dane: #60.
import type { DemoEvent, EventFeature } from '../demo'

interface Template {
  id: string
  title: string
  venueId: string
  venueName: string
  lat: number
  lon: number
  inDays: number
  hour: number
  hours: number
  features: EventFeature[]
}

const TEMPLATES: Template[] = [
  {
    id: 'krzysztofory-audiodeskrypcja',
    title: 'Oprowadzanie z audiodeskrypcją po wystawie o historii Krakowa',
    venueId: 'mk-krzysztofory',
    venueName: 'Muzeum Krakowa — Pałac Krzysztofory',
    lat: 50.062889,
    lon: 19.936369,
    inDays: 0,
    hour: 17,
    hours: 1.5,
    features: ['audiodeskrypcja'],
  },
  {
    id: 'synagoga-pjm',
    title: 'Spacer po Starej Synagodze z tłumaczem PJM',
    venueId: 'mk-stara-synagoga',
    venueName: 'Muzeum Krakowa — Stara Synagoga',
    lat: 50.051435,
    lon: 19.948704,
    inDays: 1,
    hour: 12,
    hours: 1,
    features: ['PJM'],
  },
  {
    id: 'bracka-spotkanie',
    title: 'Kraków dostępny – spotkanie o trasach bez barier',
    venueId: 'umk-bracka-10',
    venueName: 'Urząd Miasta Krakowa — Wydział ds. Turystyki',
    lat: 50.059939,
    lon: 19.936477,
    inDays: 2,
    hour: 16,
    hours: 2,
    features: ['napisy', 'pętla indukcyjna'],
  },
  {
    id: 'krzysztofory-rodziny',
    title: 'Warsztaty rodzinne w muzeum (wejście z wózkiem bez schodów)',
    venueId: 'mk-krzysztofory',
    venueName: 'Muzeum Krakowa — Pałac Krzysztofory',
    lat: 50.062889,
    lon: 19.936369,
    inDays: 3,
    hour: 11,
    hours: 2,
    features: ['napisy'],
  },
  {
    id: 'synagoga-koncert',
    title: 'Koncert muzyki żydowskiej',
    venueId: 'mk-stara-synagoga',
    venueName: 'Muzeum Krakowa — Stara Synagoga',
    lat: 50.051435,
    lon: 19.948704,
    inDays: 4,
    hour: 19,
    hours: 1.5,
    features: ['pętla indukcyjna'],
  },
  {
    id: 'wielopole-film',
    title: 'Pokaz filmu z napisami i audiodeskrypcją',
    venueId: 'umk-wielopole-17a',
    venueName: 'Urząd Miasta Krakowa — Wydział Kultury',
    lat: 50.057855,
    lon: 19.945526,
    inDays: 6,
    hour: 18,
    hours: 2,
    features: ['napisy', 'audiodeskrypcja'],
  },
]

export function buildDemoEvents(now: Date): DemoEvent[] {
  return TEMPLATES.map((t) => {
    const start = new Date(now)
    start.setDate(start.getDate() + t.inDays)
    start.setHours(t.hour, 0, 0, 0)
    const end = new Date(start.getTime() + t.hours * 3_600_000)
    return {
      id: `demo:event/${t.id}`,
      title: t.title,
      start: start.toISOString(),
      end: end.toISOString(),
      venueId: t.venueId,
      venueName: t.venueName,
      location: { lat: t.lat, lon: t.lon },
      features: t.features,
      source: 'demo',
    }
  })
}
