// Chip profilu w pasku wyszukiwania: ikona + krótka nazwa; menu ze zmianą trybu i personalizacją.
import { useApp } from '../app/context'
import { MODE_META, MODE_ORDER } from '../app/modeMeta'
import type { ProfileId } from '../app/state'
import { findMode, useModes } from '../app/useModes'
import { CheckIcon, SlidersIcon } from '../components/icons'
import { usePopover } from '../components/usePopover'

export function ProfileSwitcher() {
  const [{ profile, customized }, dispatch] = useApp()
  const modes = useModes()
  const { open, setOpen, toggle, id: menuId, wrapper, trigger, triggerProps } = usePopover()
  if (!profile) return null
  const meta = MODE_META[profile]

  const choose = (id: ProfileId) => {
    setOpen(false)
    dispatch({ type: 'chooseProfile', profile: id, prefs: findMode(modes, id)?.prefs })
    trigger.current?.focus()
  }

  return (
    <div ref={wrapper} className="profile-switcher">
      <button
        ref={trigger}
        id="profile-chip"
        type="button"
        className="profile-switcher-button"
        {...triggerProps}
        onClick={toggle}
      >
        <meta.Icon size={18} />
        <span className="visually-hidden">Profil:</span> {meta.short}
        {customized && (
          <>
            <span className="profile-switcher-dot" aria-hidden="true" />{' '}
            <span className="visually-hidden">(dostosowany)</span>
          </>
        )}
      </button>
      {open && (
        <section id={menuId} className="popover profile-menu" aria-label="Profil">
          <p className="popover-title">Jak się poruszasz?</p>
          <ul className="profile-menu-list">
            {MODE_ORDER.map((id) => {
              const m = MODE_META[id]
              const current = id === profile
              return (
                <li key={id}>
                  <button
                    type="button"
                    className="profile-menu-item"
                    aria-current={current || undefined}
                    onClick={() => choose(id)}
                  >
                    <span className="profile-menu-icon">
                      <m.Icon size={20} />
                    </span>
                    <span className="profile-menu-text">
                      <span className="profile-menu-label">{m.title}</span>
                      <span className="profile-menu-desc">{m.tagline}</span>
                    </span>
                    {current && <CheckIcon size={18} className="profile-menu-check" />}
                  </button>
                </li>
              )
            })}
          </ul>
          <button
            type="button"
            className="profile-menu-customize"
            onClick={() => {
              setOpen(false)
              dispatch({ type: 'openSettings' })
            }}
          >
            <SlidersIcon size={18} /> Własna personalizacja
          </button>
          <button
            type="button"
            className="link-button profile-menu-start"
            onClick={() => {
              setOpen(false)
              dispatch({ type: 'resetProfile' })
            }}
          >
            Pokaż ekran powitalny
          </button>
        </section>
      )}
    </div>
  )
}
