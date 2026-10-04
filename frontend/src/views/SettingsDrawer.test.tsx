import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useCallback, useReducer, type Dispatch } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DispatchContext, StateContext } from '../app/context'
import { appReducer, initialState, type Action, type AppState } from '../app/state'
import { resetModesCache } from '../app/useModes'
import { SettingsDrawer, SettingsDrawerView } from './SettingsDrawer'

function Harness({ onDispatch }: { onDispatch: (action: Action) => void }) {
  const [state, reducerDispatch] = useReducer(appReducer, undefined, (): AppState => ({
    ...initialState({ profile: 'wheelchair' }),
    settingsOpen: true,
  }))
  const dispatch = useCallback<Dispatch<Action>>(
    (action) => {
      onDispatch(action)
      reducerDispatch(action)
    },
    [onDispatch],
  )

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        <button id="profile-chip" type="button">
          Tryb
        </button>
        <output aria-label="Stan personalizacji">{String(state.customized)}</output>
        <SettingsDrawer />
      </DispatchContext.Provider>
    </StateContext.Provider>
  )
}

beforeEach(() => {
  resetModesCache()
  // W tym zestawie testujemy drawer; presety asynchroniczne nie są potrzebne.
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => undefined)),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SettingsDrawer', () => {
  it('zmiana suwaka wywołuje setPrefs i oznacza ustawienia jako dostosowane', () => {
    const onDispatch = vi.fn()
    render(<Harness onDispatch={onDispatch} />)

    fireEvent.change(screen.getByRole('slider', { name: /Maksymalne nachylenie: 6%/ }), {
      target: { value: '7' },
    })

    expect(onDispatch).toHaveBeenCalledWith({
      type: 'setPrefs',
      prefs: expect.objectContaining({ max_incline_percent: 7 }),
    })
    expect(screen.getByLabelText('Stan personalizacji')).toHaveTextContent('true')
    expect(screen.getByRole('slider', { name: /Maksymalne nachylenie: 7%/ })).toBeInTheDocument()
  })

  it('ma trzy opisane grupy ustawień', () => {
    render(<Harness onDispatch={vi.fn()} />)

    expect(screen.getByRole('group', { name: 'Ruch i trasy' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Miejsca i usługi' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Dane i widoczność' })).toBeInTheDocument()
    expect(
      screen.getByRole('switch', { name: 'Pokazuj miejsca odpoczynku na trasie' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('switch', { name: 'Pokazuj miejsca bez danych o dostępności' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('switch', { name: 'Pokazuj zgłoszenia użytkowników' }),
    ).toBeInTheDocument()
  })

  it('przywraca preset wybranego trybu', async () => {
    const user = userEvent.setup()
    const onDispatch = vi.fn()
    render(<Harness onDispatch={onDispatch} />)

    fireEvent.change(screen.getByRole('slider', { name: /Maksymalne nachylenie: 6%/ }), {
      target: { value: '12' },
    })
    expect(screen.getByLabelText('Stan personalizacji')).toHaveTextContent('true')

    await user.click(screen.getByRole('button', { name: 'Przywróć ustawienia trybu' }))

    expect(onDispatch).toHaveBeenLastCalledWith({
      type: 'chooseProfile',
      profile: 'wheelchair',
      prefs: expect.objectContaining({ max_incline_percent: 6 }),
    })
    expect(screen.getByLabelText('Stan personalizacji')).toHaveTextContent('false')
    expect(screen.getByRole('slider', { name: /Maksymalne nachylenie: 6%/ })).toBeInTheDocument()
  })

  it('Esc zamyka dialog i oddaje fokus na chip trybu', async () => {
    const user = userEvent.setup()
    render(<Harness onDispatch={vi.fn()} />)
    const chip = screen.getByRole('button', { name: 'Tryb' })

    expect(screen.getByRole('dialog', { name: 'Twoje ustawienia' })).toBeInTheDocument()
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(chip).toHaveFocus())
  })

  it('Tab nie wychodzi poza drawer', async () => {
    const user = userEvent.setup()
    const props: Parameters<typeof SettingsDrawerView>[0] = {
      prefs: initialState({ profile: 'wheelchair' }).prefs,
      layers: initialState({ profile: 'wheelchair' }).layers,
      onPrefsChange: vi.fn(),
      onLayerChange: vi.fn(),
      onRestore: vi.fn(),
      onClose: vi.fn(),
    }
    render(<SettingsDrawerView {...props} />)
    const closeButtons = screen.getAllByRole('button', { name: 'Zamknij' })
    const first = closeButtons[0]
    const last = closeButtons[1]

    last.focus()
    await user.tab()
    expect(first).toHaveFocus()
    await user.tab({ shift: true })
    expect(last).toHaveFocus()
  })
})
