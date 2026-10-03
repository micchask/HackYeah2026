import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Institution } from '../api/client'
import { InstitutionPopup } from './InstitutionPopup'

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

function renderPopup() {
  const handlers = { onSetOrigin: vi.fn(), onSetDestination: vi.fn(), onClose: vi.fn() }
  render(<InstitutionPopup institution={institution} {...handlers} />)
  return handlers
}

describe('InstitutionPopup', () => {
  it('na start pokazuje nazwę i akcje, szczegóły dopiero po "Więcej informacji"', () => {
    renderPopup()
    expect(screen.getByRole('heading', { name: 'Muzeum testowe' })).toHaveFocus()
    expect(screen.queryByText('tak, przyciski Braille')).not.toBeInTheDocument()

    const more = screen.getByRole('button', { name: 'Więcej informacji' })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(more)

    expect(screen.getByRole('button', { name: 'Mniej informacji' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByText('tak, przyciski Braille')).toBeInTheDocument()
    expect(screen.getByText('potwierdzone')).toBeInTheDocument()
    // null + status unknown - "brak informacji" w treści i na plakietce, nigdy "dostępne"
    expect(screen.getAllByText('brak informacji')).toHaveLength(2)
    expect(screen.getByText(/punkt na mapie jest przybliżony/i)).toBeInTheDocument()
  })

  it('ustawia start/cel i zamyka się Escape', () => {
    const handlers = renderPopup()
    fireEvent.click(screen.getByRole('button', { name: 'Start (A)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cel (B)' }))
    fireEvent.keyDown(screen.getByRole('heading', { name: 'Muzeum testowe' }), { key: 'Escape' })
    expect(handlers.onSetOrigin).toHaveBeenCalledOnce()
    expect(handlers.onSetDestination).toHaveBeenCalledOnce()
    expect(handlers.onClose).toHaveBeenCalledOnce()
  })
})
