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
  kind: 'adres',
  point: { lat: 50.06, lon: 19.94 },
  distance_m: 350,
}

describe('PlacePopup', () => {
  it('mały dymek: rodzaj, nazwa z fokusem, podtytuł, bez „Szczegóły” (karta jest w panelu)', () => {
    render(<PlacePopup result={address} onClose={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Grodzka 20' })).toHaveFocus()
    expect(screen.getByText('adres')).toBeInTheDocument()
    expect(screen.getByText('Stare Miasto · 350 m od środka mapy')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Szczegóły' })).not.toBeInTheDocument()
  })

  it('Esc zamyka dymek', () => {
    const onClose = vi.fn()
    render(<PlacePopup result={address} onClose={onClose} />)
    fireEvent.keyDown(screen.getByRole('heading', { name: 'Grodzka 20' }), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
