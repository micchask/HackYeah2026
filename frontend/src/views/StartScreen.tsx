// Ekran wyboru trybu (plan §5.1, #88): pełnoekranowy dialog nad mapą, gdy nie wybrano trybu.
import { useEffect, useId, useRef, type KeyboardEvent } from 'react'
import { useApp } from '../app/context'
import type { ProfileId } from '../app/state'
import { useModes, type ModeInfo } from '../app/useModes'

// Kafelki; „Bez profilu” jest osobnym przyciskiem pod spodem
const TILES: ProfileId[] = ['wheelchair', 'senior', 'tourist', 'stroller']

export function StartScreen() {
  const [{ profile }, dispatch] = useApp()
  const modes = useModes()
  if (profile !== null) return null

  const choose = (id: ProfileId) => {
    const mode = modes.find((m) => m.id === id)
    dispatch({ type: 'chooseProfile', profile: id, prefs: mode?.prefs })
    // Dialog znika - fokus na chip trybu, żeby klawiatura nie wylądowała na początku strony
    requestAnimationFrame(() => document.getElementById('profile-chip')?.focus())
  }
  return <StartDialog modes={modes} onChoose={choose} />
}

function StartDialog({
  modes,
  onChoose,
}: {
  modes: ModeInfo[]
  onChoose: (id: ProfileId) => void
}) {
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus()
  }, [])

  // Modalny dialog: Tab krąży po przyciskach dialogu, Esc = „Kontynuuj bez profilu”
  function onKeyDown(e: KeyboardEvent<HTMLDialogElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onChoose('guest')
      return
    }
    if (e.key !== 'Tab' || !dialog.current) return
    const buttons = Array.from(dialog.current.querySelectorAll('button'))
    const first = buttons[0]
    const last = buttons[buttons.length - 1]
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === heading.current)) {
      e.preventDefault()
      last?.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first?.focus()
    }
  }

  const tiles = TILES.map((t) => modes.find((m) => m.id === t)).filter(
    (m): m is ModeInfo => m !== undefined,
  )

  return (
    <div className="start-screen">
      <dialog
        ref={dialog}
        open
        aria-modal="true"
        aria-labelledby={`${id}-heading`}
        aria-describedby={`${id}-lead`}
        className="start-dialog"
        onKeyDown={onKeyDown}
      >
        <p className="start-brand">Kraków bez Barier</p>
        <h2 id={`${id}-heading`} ref={heading} tabIndex={-1}>
          Jak się poruszasz?
        </h2>
        <p id={`${id}-lead`} className="start-lead">
          Dopasujemy trasy i mapę do Twoich potrzeb.
        </p>

        <fieldset className="mode-tiles">
          <legend className="visually-hidden">Wybierz tryb</legend>
          {tiles.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className="mode-tile"
              aria-labelledby={`${id}-${mode.id}-label`}
              aria-describedby={`${id}-${mode.id}-desc`}
              onClick={() => onChoose(mode.id)}
            >
              <span className="mode-tile-icon" aria-hidden="true">
                {mode.icon}
              </span>
              <span id={`${id}-${mode.id}-label`} className="mode-tile-label">
                {mode.label}
              </span>
              <span id={`${id}-${mode.id}-desc`} className="mode-tile-desc">
                {mode.description}
              </span>
            </button>
          ))}
        </fieldset>

        <button type="button" className="link-button start-skip" onClick={() => onChoose('guest')}>
          Kontynuuj bez profilu
        </button>
        <p className="meta start-note">Zawsze możesz to zmienić i dostosować na mapie.</p>
      </dialog>
    </div>
  )
}
