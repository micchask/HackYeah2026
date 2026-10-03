import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 20, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export const WheelchairIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="16" cy="4" r="1" />
    <path d="m18 19 1-7-6 1" />
    <path d="m5 8 3-3 5.5 3-2.36 3.5" />
    <path d="M4.24 14.5a5 5 0 0 0 6.88 6" />
    <path d="M13.76 17.5a5 5 0 0 0-6.88-6" />
  </Icon>
)

export const StrollerIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 10V3a7 7 0 0 1 7 7" />
    <path d="M3 10h14a6 6 0 0 1-6 6H8a5 5 0 0 1-5-5z" />
    <path d="M17 10l2-6h2" />
    <circle cx="7" cy="20" r="1.8" />
    <circle cx="15" cy="20" r="1.8" />
  </Icon>
)

export const PinIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </Icon>
)

export const SwapIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m21 16-4 4-4-4" />
    <path d="M17 20V4" />
    <path d="m3 8 4-4 4 4" />
    <path d="M7 4v16" />
  </Icon>
)

export const RouteIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="6" cy="19" r="3" />
    <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
    <circle cx="18" cy="5" r="3" />
  </Icon>
)

export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </Icon>
)

export const StairsIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 20h5v-5h5v-5h5V5h3" />
  </Icon>
)

export const CobbleIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="4" width="7" height="6" rx="1.5" />
    <rect x="13" y="4" width="8" height="6" rx="1.5" />
    <rect x="3" y="13" width="9" height="7" rx="1.5" />
    <rect x="15" y="13" width="6" height="7" rx="1.5" />
  </Icon>
)

export const AlertIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </Icon>
)

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
)

export const InfoIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </Icon>
)

export const SlidersIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
    <path d="M1 14h6M9 8h6M17 16h6" />
  </Icon>
)

export const DatabaseIcon = (p: IconProps) => (
  <Icon {...p}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14a9 3 0 0 0 18 0V5" />
    <path d="M3 12a9 3 0 0 0 18 0" />
  </Icon>
)

export const LogoMark = (p: IconProps) => (
  <svg width={p.size ?? 32} height={p.size ?? 32} viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="9" fill="#0b5cad" />
    <path
      d="M9 23c0-4 3-5 7-5s7-1 7-5"
      fill="none"
      stroke="#fff"
      strokeWidth="2.6"
      strokeLinecap="round"
    />
    <circle cx="9" cy="23" r="2.6" fill="#7fd6a4" />
    <circle cx="23" cy="10" r="2.6" fill="#fff" />
  </svg>
)
