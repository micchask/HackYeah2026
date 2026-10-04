import { describe, expect, it } from 'vitest'
import type { Institution, Place, SearchResult } from '../api/client'
import type { DemoEvent, DemoPoi } from '../api/demo'
import { fromPlace, placeCard } from './selectedPlace'

const P = { lat: 50.06, lon: 19.94 }
const PROV = { source: 'osm', source_type: 'osm', fetched_at: '2026-10-03T10:00:00Z' } as const

const place: Place = {
  id: 'osm:node/1',
  city: 'krakow',
  name: 'Apteka Pod Tygrysem',
  category: 'pharmacy',
  location: P,
  attributes: [
    {
      key: 'wheelchair',
      value: 'limited',
      confidence: 0.6,
      status: 'conflicting',
      provenance: { ...PROV, last_verified: '2025-07-16T00:00:00Z' },
      alternatives: [
        {
          key: 'wheelchair',
          value: 'yes',
          confidence: 0.4,
          provenance: { ...PROV, source: 'user_reports', source_type: 'user_report' },
        },
      ],
    },
  ],
} as Place

const institution: Institution = {
  id: 'mk-test',
  name: 'Muzeum testowe',
  address: 'Rynek Główny 1, Kraków',
  kind: 'muzeum',
  location: { point: P, source: 'Photon', exact: false },
  attributes: [
    {
      category: 'winda',
      label: 'Winda',
      value: 'tak, przyciski Braille',
      source: 'Deklaracja dostępności (BIP)',
      last_verified: '2026-03-31',
      confidence: 0.95,
      status: 'confirmed',
    },
    {
      category: 'toaleta',
      label: 'Toaleta',
      value: null,
      source: 'Deklaracja dostępności (BIP)',
      confidence: 0,
      status: 'unknown',
    },
  ],
}

describe('placeCard', () => {
  it('miejsce z /api/places: grupa po polsku, status, paszport ze źródłem, datą i konfliktem', () => {
    const card = placeCard({ kind: 'place', place }, [])!
    expect(card).toMatchObject({ title: 'Apteka Pod Tygrysem', kind: 'zdrowie', access: 'limited' })
    expect(card.attributes[0]).toMatchObject({
      label: 'dostępność dla wózka',
      value: 'częściowo',
      source: 'OpenStreetMap',
      date: '2025-07-16T00:00:00Z',
      confidence: 0.6,
      status: { label: 'źródła się nie zgadzają', badge: 'badge-conflicting' },
      alternatives: [{ value: 'tak', source: 'zgłoszenia użytkowników' }],
    })
  })

  it('miejsce kliknięte na mapie (wynik wyszukiwania) daje tę samą kartę', () => {
    const card = placeCard(fromPlace(place, 'zdrowie'), [])!
    expect(card.access).toBe('limited')
    expect(card.attributes).toHaveLength(1)
  })

  it('adres bez danych: „brak danych”, nigdy „dostępne”, pusty paszport', () => {
    const address: SearchResult = {
      id: 'address:1',
      source: 'address',
      match: 'name',
      label: 'Grodzka 20',
      description: 'Stare Miasto',
      point: P,
      distance_m: 350,
    }
    const card = placeCard({ kind: 'search', result: address }, [])!
    expect(card).toMatchObject({
      title: 'Grodzka 20',
      subtitle: 'Stare Miasto · 350 m od środka mapy',
      access: 'unknown',
      attributes: [],
    })
  })

  it('instytucja: atrybuty z deklaracji, brak informacji wprost, punkt przybliżony', () => {
    const card = placeCard({ kind: 'institution', id: 'mk-test' }, [institution])!
    expect(card.access).toBe('unknown') // wolny tekst deklaracji - bez zgadywania
    expect(card.accessNote).toMatch(/deklaracji/)
    expect(card.locationNote).toMatch(/przybliżony/)
    expect(card.attributes.map((a) => [a.label, a.value, a.status.label])).toEqual([
      ['Winda', 'tak, przyciski Braille', 'potwierdzone'],
      ['Toaleta', 'brak informacji', 'brak informacji'],
    ])
    // wynik wyszukiwarki wskazujący instytucję prowadzi do tej samej karty
    const fromSearch = placeCard(
      {
        kind: 'search',
        result: {
          id: 'institution:mk-test',
          source: 'institution',
          match: 'name',
          label: 'Muzeum testowe',
          point: P,
          institution_id: 'mk-test',
        },
      },
      [institution],
    )
    expect(fromSearch?.title).toBe('Muzeum testowe')
  })

  it('instytucji jeszcze nie ma w danych - null (karta czeka)', () => {
    expect(placeCard({ kind: 'institution', id: 'nie-ma' }, [])).toBeNull()
  })

  it('obiekt przykładowy (source demo) ma etykietę „dane przykładowe”', () => {
    const poi: DemoPoi = {
      id: 'demo:parking/plac-nowy',
      kind: 'parking_disabled',
      name: 'Plac Nowy (Kazimierz)',
      location: P,
      details: { spaces: 2, fee: 'bezpłatnie z kartą parkingową' },
      source: 'demo',
    }
    const card = placeCard({ kind: 'demo', poi }, [])!
    expect(card.demo).toBe(true)
    expect(card.kind).toBe('miejsce parkingowe dla OzN')
    expect(card.attributes[0]).toMatchObject({
      label: 'liczba kopert',
      value: '2',
      source: 'dane przykładowe',
      status: { label: 'dane przykładowe' },
    })
  })

  it('wydarzenie pokazuje datę, miejsce i udogodnienia z etykietą danych przykładowych', () => {
    const event: DemoEvent = {
      id: 'demo:event/1',
      title: 'Pokaz filmu dostępnego',
      start: '2026-10-05T16:00:00.000Z',
      end: '2026-10-05T18:00:00.000Z',
      venueName: 'Kino testowe',
      location: P,
      features: ['napisy', 'audiodeskrypcja'],
      source: 'demo',
    }
    const card = placeCard({ kind: 'event', event }, [])!
    expect(card).toMatchObject({
      title: 'Pokaz filmu dostępnego',
      kind: 'wydarzenie',
      subtitle: 'Kino testowe',
      demo: true,
    })
    expect(card.attributes.map((attribute) => [attribute.label, attribute.value])).toEqual([
      ['data i godzina', expect.stringContaining('5 października')],
      ['udogodnienia', 'napisy, audiodeskrypcja'],
    ])
    expect(card.attributes.every((attribute) => attribute.source === 'dane przykładowe')).toBe(true)
  })
})
