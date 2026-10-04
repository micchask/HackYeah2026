import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModePreset } from '../api/client'
import { DispatchContext, StateContext } from '../app/context'
import { initialState, PROFILE_DEFAULTS, type AppState } from '../app/state'
import { resetModesCache } from '../app/useModes'
import { ProfileSwitcher } from './ProfileSwitcher'
import { StartScreen } from './StartScreen'

const LAYERS = {
  barriers: true,
  health: true,
  institutions: true,
  places: false,
  reports: false,
  rest: false,
  parking: true,
  events: false,
}

// Odpowiedź GET /api/profiles - opis inny niż zapas, żeby było widać, skąd pochodzą dane
const PRESETS: ModePreset[] = (
  ['wheelchair', 'senior', 'tourist', 'stroller', 'guest'] as const
).map((id) => ({
  id,
  label: {
    wheelchair: 'Poruszam się na wózku',
    senior: 'Wolniejsze tempo, mniej podejść',
    tourist: 'Zwiedzam miasto',
    stroller: 'Jestem z wózkiem dziecięcym',
    guest: 'Bez profilu',
  }[id],
  description: `opis z API: ${id}`,
  icon: '★',
  profile: id === 'tourist' || id === 'guest' ? 'walk' : id,
  preferences: { ...PROFILE_DEFAULTS[id].prefs, max_kerb_height_cm: 7 },
  layers: LAYERS,
}))

function renderWith(ui: ReactNode, state: AppState) {
  const dispatch = vi.fn()
  render(
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{ui}</DispatchContext.Provider>
    </StateContext.Provider>,
  )
  return dispatch
}

beforeEach(() => {
  resetModesCache()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(PRESETS)),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('StartScreen', () => {
  it('modalny dialog z fokusem na nagłówku i pięcioma kafelkami', () => {
    renderWith(<StartScreen />, initialState())
    const dialog = screen.getByRole('dialog', { name: 'Jak się poruszasz?' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('heading', { name: 'Jak się poruszasz?' })).toHaveFocus()
    expect(screen.getByText('BezPrzeszkód')).toBeInTheDocument()
    for (const name of [
      'Osoba na wózku',
      'Senior',
      'Turysta',
      'Rodzina z wózkiem dziecięcym',
      'Gość',
    ]) {
      expect(screen.getByRole('button', { name: new RegExp(name) })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: /Kontynuuj/ })).toBeDisabled()
    expect(
      screen.getByText('Profil zmienisz lub dopasujesz w każdej chwili na mapie.'),
    ).toBeInTheDocument()
  })

  it('kafelek + „Kontynuuj” wywołuje chooseProfile z preferencjami z API', async () => {
    const user = userEvent.setup()
    const dispatch = renderWith(<StartScreen />, initialState())
    // tryby z /api/profiles wczytują się w tle
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    const tile = screen.getByRole('button', { name: /Senior/ })
    await user.click(tile)
    expect(tile).toHaveAttribute('aria-pressed', 'true')
    expect(dispatch).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /Kontynuuj/ }))
    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith({
        type: 'chooseProfile',
        profile: 'senior',
        prefs: { ...PROFILE_DEFAULTS.senior.prefs, max_kerb_height_cm: 7 },
      }),
    )
  })

  it('Esc = „Gość”', async () => {
    const user = userEvent.setup()
    const dispatch = renderWith(<StartScreen />, initialState())
    await user.keyboard('{Escape}')
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'chooseProfile', profile: 'guest' }),
    )
  })

  it('Tab krąży po aktywnych przyciskach dialogu', async () => {
    const user = userEvent.setup()
    renderWith(<StartScreen />, initialState())
    const buttons = screen.getAllByRole('button').filter((b) => !b.hasAttribute('disabled'))
    buttons.at(-1)?.focus()
    await user.tab()
    expect(buttons[0]).toHaveFocus()
    await user.tab({ shift: true })
    expect(buttons.at(-1)).toHaveFocus()
  })

  it('nie pokazuje się, gdy profil jest zapisany', () => {
    renderWith(<StartScreen />, initialState({ profile: 'wheelchair' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('ProfileSwitcher', () => {
  it('krótka nazwa profilu, menu ze zmianą profilu i personalizacją', async () => {
    const user = userEvent.setup()
    const state = { ...initialState({ profile: 'wheelchair' }), customized: true }
    const dispatch = renderWith(<ProfileSwitcher />, state)
    const chip = screen.getByRole('button', { name: /Profil: Wózek \(dostosowany\)/ })
    expect(chip).toHaveAttribute('aria-expanded', 'false')

    await user.click(chip)
    expect(chip).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /Osoba na wózku/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
    await user.click(screen.getByRole('button', { name: /Senior/ }))
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'chooseProfile', profile: 'senior' }),
    )

    await user.click(chip)
    await user.click(screen.getByRole('button', { name: 'Własna personalizacja' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'openSettings' })

    await user.click(chip)
    await user.click(screen.getByRole('button', { name: 'Pokaż ekran powitalny' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'resetProfile' })
  })

  it('Esc zamyka menu i oddaje fokus na chip', async () => {
    const user = userEvent.setup()
    renderWith(<ProfileSwitcher />, initialState({ profile: 'guest' }))
    const chip = screen.getByRole('button', { name: /Profil: Gość/ })
    await user.click(chip)
    await user.keyboard('{Escape}')
    expect(chip).toHaveAttribute('aria-expanded', 'false')
    expect(chip).toHaveFocus()
  })
})
