import { PROFILE_PRESETS, type ProfileId } from '../api/client'
import { StrollerIcon, WheelchairIcon } from './icons'

const ICONS: Record<ProfileId, typeof WheelchairIcon> = {
  wheelchair: WheelchairIcon,
  stroller: StrollerIcon,
}

interface Props {
  value: string | null | undefined
  onChange: (profile: ProfileId) => void
}

/** Wybór gotowego profilu. Pytamy o sposób poruszania się, nie o niepełnosprawność. */
export function ProfilePicker({ value, onChange }: Props) {
  return (
    <fieldset className="profile-picker">
      <legend className="card-title">Profil trasy</legend>
      {(Object.keys(PROFILE_PRESETS) as ProfileId[]).map((id) => {
        const preset = PROFILE_PRESETS[id]
        const ProfileIcon = ICONS[id]
        return (
          <label key={id} className="profile-card">
            <input
              type="radio"
              name="profile"
              value={id}
              checked={value === id}
              onChange={() => onChange(id)}
              aria-describedby={`profile-${id}-desc`}
            />
            <span className="profile-icon">
              <ProfileIcon size={26} />
            </span>
            <span className="profile-text">
              <span className="profile-label">{preset.label}</span>
              <span id={`profile-${id}-desc`} className="profile-desc">
                {preset.description}
              </span>
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}
