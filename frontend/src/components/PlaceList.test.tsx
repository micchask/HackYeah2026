import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Place } from '../api/client'
import { PlaceList } from './PlaceList'

const provenance = (source: 'manual' | 'osm') => ({
  source,
  source_type: source,
  fetched_at: '2026-10-03T00:00:00Z',
})

function place(i: number): Place {
  return {
    id: `osm:node/${i}`,
    city: 'krakow',
    name: `Miejsce ${i}`,
    location: { lat: 50.06, lon: 19.93 },
    attributes: [],
  }
}

const basilica: Place = {
  id: 'osm:way/26195267',
  city: 'krakow',
  name: 'Bazylika Mariacka',
  location: { lat: 50.0616, lon: 19.9394 },
  attributes: [
    {
      key: 'wheelchair',
      value: 'limited',
      provenance: provenance('manual'),
      confidence: 0.7,
      status: 'conflicting',
      alternatives: [
        {
          key: 'wheelchair',
          value: 'yes',
          provenance: provenance('osm'),
          confidence: 0.6,
          status: 'unverified',
          alternatives: [],
        },
      ],
    },
  ],
}

describe('PlaceList', () => {
  it('przy konflikcie pokazuje wartości z obu źródeł', () => {
    render(<PlaceList places={[basilica]} query="" onQueryChange={vi.fn()} limit={200} />)

    expect(screen.getByText('źródła się nie zgadzają')).toBeInTheDocument()
    expect(screen.getByText(/dane wprowadzone ręcznie · pewność 70%/)).toBeInTheDocument()
    expect(screen.getByText(/OpenStreetMap · pewność 60%/)).toBeInTheDocument()
  })

  it('pokazuje miejsca porcjami po 20', async () => {
    const places = Array.from({ length: 45 }, (_, i) => place(i))
    render(<PlaceList places={places} query="" onQueryChange={vi.fn()} limit={200} />)

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(20)
    await userEvent.click(screen.getByRole('button', { name: 'Pokaż więcej miejsc (25)' }))
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(40)
  })

  it('wyszukiwarka ma etykietę i przekazuje tekst', async () => {
    const onQueryChange = vi.fn()
    render(<PlaceList places={[]} query="" onQueryChange={onQueryChange} limit={200} />)

    await userEvent.type(screen.getByRole('searchbox', { name: 'Szukaj miejsca po nazwie' }), 'S')
    expect(onQueryChange).toHaveBeenCalledWith('S')
  })
})
