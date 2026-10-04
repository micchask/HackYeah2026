import { useEffect, useId, useState, type FormEvent } from 'react'
import { api, type Report, type ReportCreate } from '../api/client'
import { AddressSearch } from './AddressSearch'
import {
  ATTRIBUTE_LABEL,
  REPORT_STATUS_LABEL,
  REPORT_TYPE_ICON,
  REPORT_TYPE_LABEL,
  type AttributeKey,
  type ReportType,
} from './attributes'
import { AlertIcon, CheckIcon, PinIcon } from './icons'
import type { NamedPoint } from './RoutePoints'

const COMMENT_MAX = 500
const RECENT_LIMIT = 5

type BarrierField =
  | { key: AttributeKey; kind: 'bool'; initial: 'true' | 'false' }
  | { key: AttributeKey; kind: 'number'; unit: string; max: number; initial: string }
  | { key: AttributeKey; kind: 'choice'; options: [string, string][]; initial: string }

/** Cechy, które można zgłosić jako ogólną barierę, i rodzaj pola na wartość. */
const BARRIER_FIELDS: BarrierField[] = [
  { key: 'stairs', kind: 'bool', initial: 'true' },
  { key: 'step_count', kind: 'number', unit: 'stopni', max: 200, initial: '3' },
  { key: 'kerb_height_cm', kind: 'number', unit: 'cm', max: 50, initial: '10' },
  { key: 'width_cm', kind: 'number', unit: 'cm', max: 500, initial: '70' },
  { key: 'incline_percent', kind: 'number', unit: '%', max: 50, initial: '10' },
  {
    key: 'surface',
    kind: 'choice',
    options: [
      ['sett', 'kostka granitowa (bruk)'],
      ['cobblestone', 'kocie łby'],
      ['gravel', 'żwir'],
      ['dirt', 'ziemia / błoto'],
      ['paving_stones', 'płyty chodnikowe'],
    ],
    initial: 'sett',
  },
  {
    key: 'wheelchair',
    kind: 'choice',
    options: [
      ['no', 'niedostępne'],
      ['limited', 'częściowo dostępne'],
      ['yes', 'dostępne'],
    ],
    initial: 'no',
  },
  { key: 'ramp', kind: 'bool', initial: 'false' },
  { key: 'tactile_paving', kind: 'bool', initial: 'false' },
  { key: 'accessible_toilet', kind: 'bool', initial: 'false' },
]

const REPORT_TYPES = Object.keys(REPORT_TYPE_LABEL) as ReportType[]

function parseValue(field: BarrierField, raw: string): ReportCreate['value'] {
  if (field.kind === 'bool') return raw === 'true'
  if (field.kind === 'number') return Number(raw)
  return raw
}

interface Props {
  city: string
  point: NamedPoint | null
  onPointChange: (point: NamedPoint | null) => void
  picking: boolean
  onPick: (picking: boolean) => void
  /** Środek odcinka trasy zaznaczonego w opisie trasy, jeśli jakiś jest */
  segmentPoint: NamedPoint | null
  /** Rozwinięty od razu (w osobnym panelu zgłoszenia) */
  defaultOpen?: boolean
}

/** Anonimowe zgłoszenie bariery: miejsce, rodzaj, wartość, komentarz. Bez danych osobowych. */
export function ReportForm({
  city,
  point,
  onPointChange,
  picking,
  onPick,
  segmentPoint,
  defaultOpen = false,
}: Props) {
  const id = useId()
  const formId = `${id}-form`
  const commentHintId = `${id}-comment-hint`

  const [open, setOpen] = useState(defaultOpen)
  const [type, setType] = useState<ReportType>('barrier')
  const [fieldKey, setFieldKey] = useState<AttributeKey>(BARRIER_FIELDS[0].key)
  const [rawValue, setRawValue] = useState<string>(BARRIER_FIELDS[0].initial)
  const [validUntil, setValidUntil] = useState('')
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [recent, setRecent] = useState<Report[]>([])

  const field = BARRIER_FIELDS.find((f) => f.key === fieldKey) ?? BARRIER_FIELDS[0]

  useEffect(() => {
    const controller = new AbortController()
    api
      .reports(city, controller.signal)
      .then((reports) => setRecent(reports.slice(0, RECENT_LIMIT)))
      .catch(() => {
        // lista jest dodatkiem - formularz działa bez niej
      })
    return () => controller.abort()
  }, [city])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!point) {
      setError('Wskaż miejsce bariery: wpisz adres albo kliknij na mapie.')
      return
    }
    setSending(true)
    setError(null)
    setConfirmation(null)
    const body: ReportCreate = {
      type,
      location: point.point,
      comment: comment.trim() || null,
      ...(type === 'barrier' ? { attribute: field.key, value: parseValue(field, rawValue) } : {}),
      ...(type === 'construction' && validUntil ? { valid_until: validUntil } : {}),
    }
    try {
      const saved = await api.report(body, city)
      setRecent((current) => [saved, ...current].slice(0, RECENT_LIMIT))
      setConfirmation(
        `Dziękujemy! Zgłoszenie „${REPORT_TYPE_LABEL[saved.type]}” zapisane – czeka na weryfikację.`,
      )
      setComment('')
      setValidUntil('')
      onPointChange(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="card report" aria-labelledby={`${id}-heading`}>
      <div className="report-head">
        <div>
          <h2 id={`${id}-heading`}>Zgłoś barierę</h2>
          <p className="meta">Anonimowo – bez konta i bez danych osobowych.</p>
        </div>
        <button
          type="button"
          className="chip"
          aria-expanded={open}
          aria-controls={formId}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Zwiń' : 'Zgłoś'}
        </button>
      </div>

      {confirmation && (
        <output className="callout callout-success">
          <CheckIcon size={18} />
          <span>{confirmation}</span>
        </output>
      )}

      <form id={formId} className="report-form" hidden={!open} onSubmit={submit} noValidate>
        <fieldset className="report-types">
          <legend>Co się stało?</legend>
          {REPORT_TYPES.map((t) => (
            <label key={t} className="report-type">
              <input
                type="radio"
                name={`${id}-type`}
                value={t}
                checked={type === t}
                onChange={() => setType(t)}
              />
              <span aria-hidden="true">{REPORT_TYPE_ICON[t]}</span>
              {REPORT_TYPE_LABEL[t]}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Gdzie?</legend>
          <div className="report-location">
            <AddressSearch
              label="Miejsce bariery"
              placeholder={picking ? 'Kliknij na mapie…' : 'Wpisz adres albo wskaż na mapie'}
              value={point}
              city={city}
              onSelect={onPointChange}
            />
            <button
              type="button"
              className="icon-button"
              aria-pressed={picking}
              onClick={() => onPick(!picking)}
            >
              <PinIcon size={18} />
              <span className="visually-hidden">Wskaż miejsce bariery na mapie</span>
            </button>
          </div>
          {segmentPoint && (
            <button
              type="button"
              className="link-button"
              onClick={() => onPointChange(segmentPoint)}
            >
              Użyj zaznaczonego odcinka trasy ({segmentPoint.label})
            </button>
          )}
        </fieldset>

        {type === 'barrier' && (
          <fieldset>
            <legend>Szczegóły bariery</legend>
            <div className="report-fields">
              <label>
                Czego dotyczy
                <select
                  value={fieldKey}
                  onChange={(e) => {
                    const next = BARRIER_FIELDS.find((f) => f.key === e.target.value)
                    if (!next) return
                    setFieldKey(next.key)
                    setRawValue(next.initial)
                  }}
                >
                  {BARRIER_FIELDS.map((f) => (
                    <option key={f.key} value={f.key}>
                      {ATTRIBUTE_LABEL[f.key]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Stan na miejscu
                {field.kind === 'number' ? (
                  <span className="with-unit">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={field.max}
                      value={rawValue}
                      onChange={(e) => setRawValue(e.target.value)}
                    />
                    <span>{field.unit}</span>
                  </span>
                ) : (
                  <select value={rawValue} onChange={(e) => setRawValue(e.target.value)}>
                    {field.kind === 'bool' ? (
                      <>
                        <option value="true">tak</option>
                        <option value="false">nie</option>
                      </>
                    ) : (
                      field.options.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </label>
            </div>
          </fieldset>
        )}

        {type === 'construction' && (
          <label className="report-field">
            Przewidywany koniec utrudnienia (jeśli znany)
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </label>
        )}

        <label className="report-field">
          Komentarz (opcjonalnie)
          <textarea
            rows={3}
            maxLength={COMMENT_MAX}
            value={comment}
            aria-describedby={commentHintId}
            onChange={(e) => setComment(e.target.value)}
          />
        </label>
        <p id={commentHintId} className="meta">
          Nie wpisuj imienia, telefonu ani e-maila. {comment.length}/{COMMENT_MAX} znaków.
        </p>

        {error && (
          <p role="alert" className="callout callout-error">
            <AlertIcon size={18} />
            <span>{error}</span>
          </p>
        )}

        <button type="submit" className="primary-button" disabled={sending}>
          {sending ? 'Wysyłam…' : 'Wyślij zgłoszenie'}
        </button>
      </form>

      {recent.length > 0 && (
        <div className="recent-reports">
          <h3>Ostatnie zgłoszenia</h3>
          <ul>
            {recent.map((r) => (
              <li key={r.id}>
                <span aria-hidden="true">{REPORT_TYPE_ICON[r.type]}</span>
                <span className="recent-text">
                  <span>{REPORT_TYPE_LABEL[r.type]}</span>
                  <span className="meta">
                    {new Date(r.created_at).toLocaleDateString('pl-PL')}
                    {r.comment ? ` · ${r.comment}` : ''}
                  </span>
                </span>
                <span className={`badge badge-report-${r.status}`}>
                  {REPORT_STATUS_LABEL[r.status]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
