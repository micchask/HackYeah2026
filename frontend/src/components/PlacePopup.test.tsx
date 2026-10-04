import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SearchResult } from '../api/client'
import { PlacePopup } from './PlacePopup'

const address: SearchResult = {
  id: 'address:50.06,19.94',
  source: 'address',
  match: 'name',
  label: 'Grodzka 20',
  description: 'Stare Miasto',
  point: { lat: 50.06, lon: 19.94 },
  distance_m: 350,
}

const actions = { onSetOrigin: vi.fn(), onSetDestination: vi.fn(), onClose: vi.fn() }

describe('PlacePopup', () => {
  it('bez danych mówi wprost, że to nie znaczy "dostępne"', () => {
    render(<PlacePopup result={address} {...actions} />)
    expect(screen.getByRole('heading', { name: 'Grodzka 20' })).toHaveFocus()
    expect(screen.getByText('Stare Miasto · 350 m od środka mapy')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Więcej informacji o dostępności' }))
    expect(screen.getByText(/nie mamy danych o dostępności tego miejsca/i)).toBeInTheDocument()
  })

  it('pokazuje atrybuty miejsca z naszych danych', () => {
    const place: SearchResult = {
      ...address,
      id: 'place:osm:1',
      source: 'place',
      label: 'Apteka Pod Tygrysem',
      kind: 'apteka',
      place: {
        id: 'osm:1',
        city: 'krakow',
        name: 'Apteka Pod Tygrysem',
        location: address.point,
        attributes: [
          {
            key: 'wheelchair',
            value: 'limited',
            confidence: 0.6,
            status: 'unverified',
            provenance: { source: 'osm', source_type: 'osm', fetched_at: '2026-10-03T10:00:00Z' },
          },
        ],
      },
    }
    render(<PlacePopup result={place} {...actions} />)
    fireEvent.click(screen.getByRole('button', { name: 'Więcej informacji o dostępności' }))
    expect(screen.getByText('częściowo')).toBeInTheDocument()
    expect(screen.getByText(/OpenStreetMap · pewność 60%/)).toBeInTheDocument()
  })
})
