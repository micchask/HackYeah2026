/*
 * Wzorzec ARIA combobox (WAI-ARIA APG): natywne <select>/<datalist> nie dają podpowiedzi z opisem
 * ani pełnej kontroli klawiatury. Opcje celowo nie są fokusowalne - fokus zostaje w polu,
 * a aktywną opcję wskazuje aria-activedescendant (strzałki i Enter obsługuje pole).
 */
/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/interactive-supports-focus, jsx-a11y/click-events-have-key-events */
import { useEffect, useId, useState, type KeyboardEvent } from 'react'
import { api, type GeocodeResult } from '../api/client'
import { plural } from './format'
import type { NamedPoint } from './RoutePoints'

const MIN_LENGTH = 2
const DEBOUNCE_MS = 300

interface Props {
  label: string
  placeholder: string
  value: NamedPoint | null
  city: string
  onSelect: (point: NamedPoint) => void
}

type Status = 'idle' | 'loading' | 'done' | 'error'

/**
 * Pole adresu z podpowiedziami - wzorzec ARIA combobox (WAI-ARIA APG, "list autocomplete").
 * Fokus zostaje w polu, aktywna podpowiedź jest wskazywana przez aria-activedescendant.
 */
export function AddressSearch({ label, placeholder, value, city, onSelect }: Props) {
  const id = useId()
  const inputId = `${id}-input`
  const listId = `${id}-list`
  const errorId = `${id}-error`

  const [query, setQuery] = useState(value?.label ?? '')
  const [shownValue, setShownValue] = useState(value)
  const [dirty, setDirty] = useState(false)
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  // Punkt ustawiony z zewnątrz (preset, mapa, zamiana A/B) nadpisuje tekst w polu
  if (value !== shownValue) {
    setShownValue(value)
    setQuery(value?.label ?? '')
    setDirty(false)
    setOpen(false)
  }

  const term = query.trim()

  useEffect(() => {
    if (!dirty || term.length < MIN_LENGTH) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setStatus('loading')
      setError(null)
      try {
        const found = await api.geocode(term, city, controller.signal)
        setResults(found)
        setActive(-1)
        setStatus('done')
        setOpen(true)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setResults([])
        setOpen(false)
        setStatus('error')
        setError((err as Error).message)
      }
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [term, dirty, city])

  function select(result: GeocodeResult) {
    onSelect({ label: result.label, point: result.point })
    setQuery(result.label)
    setDirty(false)
    setOpen(false)
    setResults([])
    setStatus('idle')
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const count = results.length
    switch (e.key) {
      case 'ArrowDown':
        if (!count) return
        e.preventDefault()
        setOpen(true)
        setActive((i) => (i + 1) % count)
        break
      case 'ArrowUp':
        if (!count) return
        e.preventDefault()
        setOpen(true)
        setActive((i) => (i <= 0 ? count - 1 : i - 1))
        break
      case 'Enter':
        if (open && active >= 0 && results[active]) {
          e.preventDefault()
          select(results[active])
        }
        break
      case 'Escape':
        if (open) {
          e.preventDefault()
          setOpen(false)
          setActive(-1)
        } else if (dirty) {
          e.preventDefault()
          setQuery(value?.label ?? '')
          setDirty(false)
        }
        break
    }
  }

  const expanded = open && results.length > 0
  const noResults = status === 'done' && dirty && results.length === 0
  const announcement =
    status === 'loading'
      ? 'Szukam…'
      : expanded
        ? `${results.length} ${plural(results.length, 'podpowiedź', 'podpowiedzi', 'podpowiedzi')}. Strzałki wybierają, Enter zatwierdza.`
        : noResults
          ? 'Brak wyników w obszarze demo.'
          : ''

  return (
    <div className="address-search">
      <label htmlFor={inputId} className="point-title">
        {label}
      </label>
      <input
        id={inputId}
        className="address-input"
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={status === 'error' || undefined}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          const text = e.target.value
          setQuery(text)
          setDirty(true)
          setActive(-1)
          if (text.trim().length < MIN_LENGTH) {
            setResults([])
            setOpen(false)
            setStatus('idle')
          }
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
        onFocus={(e) => e.target.select()}
      />
      <div
        id={listId}
        role="listbox"
        aria-label={`Podpowiedzi: ${label}`}
        className="suggestions"
        hidden={!expanded}
      >
        {results.map((r, i) => (
          <div
            key={`${r.label}-${r.point.lat}-${r.point.lon}`}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            className={i === active ? 'suggestion active' : 'suggestion'}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => select(r)}
          >
            <span className="suggestion-label">{r.label}</span>
            {(r.kind || r.description) && (
              <span className="suggestion-meta">
                {[r.kind, r.description].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
        ))}
      </div>
      {noResults && <p className="field-hint">Brak wyników w obszarze demo.</p>}
      {error && (
        <p id={errorId} role="alert" className="field-error">
          {error}
        </p>
      )}
      <output className="visually-hidden" htmlFor={inputId}>
        {announcement}
      </output>
    </div>
  )
}
