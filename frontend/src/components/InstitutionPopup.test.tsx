import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Institution } from '../api/client'
import { InstitutionPopup } from './InstitutionPopup'

const institution: Institution = {
  id: 'mk-test',
  name: 'Muzeum testowe',
  address: 'Rynek Główny 1, Kraków',
  kind: 'muzeum',
  location: { point: { lat: 50.06, lon: 19.94 }, source: 'Photon', exact: true },
  attributes: [],
}

describe('InstitutionPopup', () => {
  it('mały dymek: rodzaj, nazwa, adres, bez „Szczegóły” (karta jest w panelu); Esc zamyka', () => {
    const onClose = vi.fn()
    render(<InstitutionPopup institution={institution} onClose={onClose} />)
    expect(screen.getByRole('heading', { name: 'Muzeum testowe' })).toHaveFocus()
    expect(screen.getByText('muzeum')).toBeInTheDocument()
    expect(screen.getByText('Rynek Główny 1, Kraków')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Szczegóły' })).not.toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('heading', { name: 'Muzeum testowe' }), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })
})
