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
  it('mały dymek: rodzaj, nazwa, adres; „Szczegóły” otwiera kartę, Esc zamyka', () => {
    const onDetails = vi.fn()
    const onClose = vi.fn()
    render(<InstitutionPopup institution={institution} onDetails={onDetails} onClose={onClose} />)
    expect(screen.getByRole('heading', { name: 'Muzeum testowe' })).toHaveFocus()
    expect(screen.getByText('muzeum')).toBeInTheDocument()
    expect(screen.getByText('Rynek Główny 1, Kraków')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Szczegóły' }))
    fireEvent.keyDown(screen.getByRole('heading', { name: 'Muzeum testowe' }), { key: 'Escape' })
    expect(onDetails).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })
})
