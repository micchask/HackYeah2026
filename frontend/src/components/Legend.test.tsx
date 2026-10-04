import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Legend, LegendContent } from './Legend'

describe('Legend', () => {
  it('jest schowana za przyciskiem i otwiera się na żądanie', async () => {
    const user = userEvent.setup()
    render(<Legend showRoute={false} showBaseline={false} showInstitutions showPlaces />)
    const button = screen.getByRole('button', { name: 'Legenda' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('region', { name: 'Legenda mapy' })).not.toBeInTheDocument()

    await user.click(button)
    const legend = screen.getByRole('region', { name: 'Legenda mapy' })
    expect(legend).toHaveTextContent('Miejsca')
    expect(legend).toHaveTextContent('instytucja publiczna')
    await user.keyboard('{Escape}')
    expect(button).toHaveFocus()
    expect(screen.queryByRole('region', { name: 'Legenda mapy' })).not.toBeInTheDocument()
  })

  it('pusta mapa = krótki pusty stan zamiast pustego pudełka', () => {
    render(<LegendContent showRoute={false} showBaseline={false} showInstitutions={false} />)
    expect(screen.getByText('Mapa jest pusta')).toBeInTheDocument()
  })
})
