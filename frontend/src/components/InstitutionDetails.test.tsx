import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Institution } from '../api/client'
import { InstitutionDetails } from './InstitutionDetails'

const institution: Institution = {
  id: 'mk-test',
  name: 'Muzeum testowe',
  address: 'Rynek Główny 1, Kraków',
  kind: 'muzeum',
  location: {
    point: { lat: 50.06, lon: 19.94 },
    source: 'Photon (dane OpenStreetMap)',
    exact: false,
  },
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

function renderDetails() {
  const handlers = { onSetOrigin: vi.fn(), onSetDestination: vi.fn(), onClose: vi.fn() }
  render(<InstitutionDetails institution={institution} {...handlers} />)
  return handlers
}

describe('InstitutionDetails', () => {
  it('pokazuje dostępność, a brak danych jako brak informacji (nie "dostępne")', () => {
    renderDetails()
    expect(screen.getByRole('heading', { name: 'Muzeum testowe' })).toHaveFocus()
    expect(screen.getByText('tak, przyciski Braille')).toBeInTheDocument()
    expect(screen.getByText('potwierdzone')).toBeInTheDocument()
    // wartość null i status unknown - dwa razy "brak informacji": w treści i na plakietce
    expect(screen.getAllByText('brak informacji')).toHaveLength(2)
    expect(screen.getByText(/punkt na mapie jest przybliżony/i)).toBeInTheDocument()
  })

  it('pozwala ustawić instytucję jako start/cel i zamknąć kartę', () => {
    const handlers = renderDetails()
    fireEvent.click(screen.getByRole('button', { name: 'Trasa stąd (A)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Trasa tutaj (B)' }))
    fireEvent.keyDown(screen.getByRole('heading', { name: 'Muzeum testowe' }), { key: 'Escape' })
    expect(handlers.onSetOrigin).toHaveBeenCalledOnce()
    expect(handlers.onSetDestination).toHaveBeenCalledOnce()
    expect(handlers.onClose).toHaveBeenCalledOnce()
  })
})
