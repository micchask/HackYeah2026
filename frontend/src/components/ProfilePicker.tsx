import { PROFILE_PRESETS, type ProfileId } from '../api/client'

interface Props {
  value: string | null | undefined
  onChange: (profile: ProfileId) => void
}

/** Wybór gotowego profilu. Pytamy o sprzęt, którym się poruszasz, nie o niepełnosprawność. */
export function ProfilePicker({ value, onChange }: Props) {
  return (
    <fieldset className="profile-picker">
      <legend>Czym się poruszasz?</legend>
      {(Object.keys(PROFILE_PRESETS) as ProfileId[]).map((id) => (
        <label key={id} className={value === id ? 'profile-option selected' : 'profile-option'}>
          <input
            type="radio"
            name="profile"
            value={id}
            checked={value === id}
            onChange={() => onChange(id)}
          />
          {PROFILE_PRESETS[id].label}
        </label>
      ))}
    </fieldset>
  )
}
