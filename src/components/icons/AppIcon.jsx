import React from 'react'

const DEFAULT_SIZE = 20

function Svg({ children, size = DEFAULT_SIZE, className = '', title, strokeWidth = 1.9, ...props }) {
  return (
    <svg
      className={`app-icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      focusable="false"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

const ICONS = {
  dashboard: (props) => (
    <Svg {...props}>
      <rect x="3" y="12" width="4" height="8" rx="1.5" />
      <rect x="10" y="8" width="4" height="12" rx="1.5" />
      <rect x="17" y="4" width="4" height="16" rx="1.5" />
      <path d="M4 4h4" />
    </Svg>
  ),
  clients: (props) => (
    <Svg {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  ),
  patients: (props) => (
    <Svg {...props}>
      <circle cx="5.5" cy="10" r="2" />
      <circle cx="18.5" cy="10" r="2" />
      <circle cx="8.5" cy="5.5" r="2" />
      <circle cx="15.5" cy="5.5" r="2" />
      <path d="M7.5 17.5c0-2.4 2-4.5 4.5-4.5s4.5 2.1 4.5 4.5c0 1.8-1.2 2.8-2.7 2.4l-1.1-.3a4 4 0 0 0-2.4 0l-1.1.3c-1.5.4-2.7-.6-2.7-2.4Z" />
    </Svg>
  ),
  agenda: (props) => (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
    </Svg>
  ),
  salesCash: (props) => (
    <Svg {...props}>
      <rect x="3" y="6" width="18" height="12" rx="3" />
      <path d="M7 10h4" />
      <path d="M17 14h.01" />
      <path d="M13 14h.01" />
      <path d="M7 14h2" />
      <path d="M12 3v3" />
      <path d="M12 18v3" />
    </Svg>
  ),
  purchases: (props) => (
    <Svg {...props}>
      <path d="M6 6h15l-2 8H8L6 3H3" />
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M9 10h8" />
    </Svg>
  ),
  boarding: (props) => (
    <Svg {...props}>
      <path d="M4 10h16" />
      <path d="M5 10V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
      <path d="M6 10v8" />
      <path d="M18 10v8" />
      <path d="M4 18h16" />
      <path d="M10 5v13" />
      <path d="M14 5v13" />
    </Svg>
  ),
  membership: (props) => (
    <Svg {...props}>
      <rect x="4" y="5" width="16" height="14" rx="3" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
      <circle cx="17" cy="16" r="1" />
    </Svg>
  ),
  reports: (props) => (
    <Svg {...props}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 15 4-4 3 3 5-7" />
      <path d="M17 7h2v2" />
    </Svg>
  ),
  system: (props) => (
    <Svg {...props}>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.05.05a2.1 2.1 0 1 1-2.98 2.98l-.05-.05A1.8 1.8 0 0 0 14.8 19.6a1.8 1.8 0 0 0-1 .56V20a2.1 2.1 0 1 1-4.2 0v-.08a1.8 1.8 0 0 0-1-.56 1.8 1.8 0 0 0-1.98.36l-.05.05a2.1 2.1 0 1 1-2.98-2.98l.05-.05A1.8 1.8 0 0 0 4.4 15a1.8 1.8 0 0 0-.56-1H3.8a2.1 2.1 0 1 1 0-4.2h.08a1.8 1.8 0 0 0 .56-1 1.8 1.8 0 0 0-.36-1.98l-.05-.05a2.1 2.1 0 1 1 2.98-2.98l.05.05A1.8 1.8 0 0 0 9.2 4.4a1.8 1.8 0 0 0 1-.56V3.8a2.1 2.1 0 1 1 4.2 0v.08a1.8 1.8 0 0 0 1 .56 1.8 1.8 0 0 0 1.98-.36l.05-.05a2.1 2.1 0 1 1 2.98 2.98l-.05.05A1.8 1.8 0 0 0 19.6 9.2c.23.34.42.67.56 1h.04a2.1 2.1 0 1 1 0 4.2h-.08a1.8 1.8 0 0 0-.72.6Z" />
    </Svg>
  ),
  bolt: (props) => (
    <Svg {...props}>
      <path d="M13 2 4 14h7l-1 8 10-13h-7l0-7Z" />
    </Svg>
  ),
  bell: (props) => (
    <Svg {...props}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </Svg>
  ),
  menu: (props) => (
    <Svg {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </Svg>
  ),
}

export function AppIcon({ name, fallback = 'dashboard', ...props }) {
  const Icon = ICONS[name] || ICONS[fallback] || ICONS.dashboard
  return <Icon {...props} />
}
