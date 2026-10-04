import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DispatchContext, StateContext } from '../app/context'
import { initialState } from '../app/state'
import { LayersDrawer } from './LayersDrawer'

describe('LayersDrawer', () => {
  it('przełącza widok mapy i warstwy, zapowiada warstwy w przygotowaniu', async () => {
    const user = userEvent.setup()
    const dispatch = vi.fn()
    render(
      <StateContext.Provider value={initialState({ profile: 'wheelchair' })}>
        <DispatchContext.Provider value={dispatch}>
          <LayersDrawer />
        </DispatchContext.Provider>
      </StateContext.Provider>,
    )
    await user.click(screen.getByRole('button', { name: 'Warstwy' }))
    expect(screen.getByRole('button', { name: 'Mapa' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Satelita' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'setBaseMap', baseMap: 'satellite' })

    await user.click(screen.getByRole('switch', { name: 'Braki danych' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'toggleLayer', layer: 'gaps', on: true })
    expect(screen.getByText('Parkingi dla OzN')).toBeInTheDocument()
  })
})
