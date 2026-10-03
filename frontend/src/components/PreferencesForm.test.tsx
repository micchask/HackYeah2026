import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_PREFERENCES } from '../api/client'
import { PreferencesForm } from './PreferencesForm'

describe('PreferencesForm', () => {
  it('ma etykiety i działa z klawiatury', async () => {
    const onChange = vi.fn()
    render(<PreferencesForm value={DEFAULT_PREFERENCES} onChange={onChange} />)
    const stairs = screen.getByRole('checkbox', { name: 'Omijaj schody' })
    stairs.focus()
    await userEvent.keyboard(' ')
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_PREFERENCES, avoid_stairs: false })
  })

  it('ustawia maksymalną wysokość krawężnika', () => {
    const onChange = vi.fn()
    render(<PreferencesForm value={DEFAULT_PREFERENCES} onChange={onChange} />)
    const kerb = screen.getByRole('slider', { name: /Maksymalna wysokość krawężnika: 2 cm/ })
    expect(kerb).toHaveAccessibleDescription(/Obniżony krawężnik/)
    // jsdom nie obsługuje strzałek na <input type="range">, w przeglądarce działa to natywnie
    fireEvent.change(kerb, { target: { value: '3' } })
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_PREFERENCES, max_kerb_height_cm: 3 })
  })
})
