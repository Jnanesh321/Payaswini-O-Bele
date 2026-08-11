import type { CSSProperties, ReactNode } from 'react'
import { P, F, type Screen } from './theme'

// ── Navigation context ──────────────────────────────────────────────────
export type NavFn = (screen: Screen) => void

// ── Leaf-weave divider ──────────────────────────────────────────────────
export function LeafDivider() {
  return (
    <div style={{ position: 'relative', height: 20, overflow: 'hidden', margin: '2px 0' }}>
      <svg width="100%" height="20" viewBox="0 0 390 20" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="lp" x="0" y="0" width="28" height="20" patternUnits="userSpaceOnUse">
            <line x1="14" y1="2" x2="14" y2="18" stroke={P.green} strokeWidth="0.8" strokeOpacity="0.35" />
            <path d="M14,5 Q8,5 6,8"   fill="none" stroke={P.green} strokeWidth="0.9" strokeOpacity="0.3" strokeLinecap="round" />
            <path d="M14,9 Q7,8 5,11"  fill="none" stroke={P.green} strokeWidth="0.9" strokeOpacity="0.3" strokeLinecap="round" />
            <path d="M14,13 Q8,12 6,15" fill="none" stroke={P.green} strokeWidth="0.9" strokeOpacity="0.3" strokeLinecap="round" />
            <path d="M14,5 Q20,5 22,8"  fill="none" stroke={P.green} strokeWidth="0.9" strokeOpacity="0.3" strokeLinecap="round" />
            <path d="M14,9 Q21,8 23,11" fill="none" stroke={P.green} strokeWidth="0.9" strokeOpacity="0.3" strokeLinecap="round" />
            <path d="M14,13 Q20,12 22,15" fill="none" stroke={P.green} strokeWidth="0.9" strokeOpacity="0.3" strokeLinecap="round" />
          </pattern>
        </defs>
        <rect width="390" height="20" fill="url(#lp)" />
        <line x1="0" y1="10" x2="390" y2="10" stroke={P.borderBrown} strokeWidth="0.6" />
      </svg>
    </div>
  )
}

// ── Phone frame ─────────────────────────────────────────────────────────
export function PhoneFrame({
  title,
  onBack,
  children,
  navRight,
  headerBg = P.green,
}: {
  title: string
  onBack?: () => void
  children: ReactNode
  navRight?: ReactNode
  headerBg?: string
}) {
  return (
    <div style={{
      width: 390,
      backgroundColor: P.bg,
      border: `2px solid ${P.brown}`,
      borderRadius: 36,
      overflow: 'hidden',
      boxShadow: '0 8px 40px rgba(45,80,22,0.18)',
      flexShrink: 0,
    }}>
      {/* Status bar */}
      <div style={{ height: 24, backgroundColor: headerBg }} />
      {/* Nav bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', backgroundColor: headerBg }}>
        {onBack ? (
          <button onClick={onBack} style={iconBtnStyle}>←</button>
        ) : (
          <div style={{ width: 32 }} />
        )}
        <span style={{ flex: 1, fontSize: 16, fontFamily: F.heading, fontWeight: 600, color: '#fff', letterSpacing: '0.01em' }}>
          {title}
        </span>
        {navRight ?? <div style={{ width: 32 }} />}
      </div>
      {/* Inset rounding */}
      <div style={{ backgroundColor: headerBg, paddingBottom: 2 }}>
        <div style={{ backgroundColor: P.bg, borderRadius: '12px 12px 0 0', height: 12 }} />
      </div>
      <div style={{ overflowY: 'auto', maxHeight: 680 }}>
        {children}
      </div>
    </div>
  )
}

const iconBtnStyle: CSSProperties = {
  width: 32, height: 32, borderRadius: 12, border: 'none',
  backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff',
  fontSize: 16, cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', fontFamily: F.body,
}

// ── Section label ───────────────────────────────────────────────────────
export function Section({ label, children, style }: { label: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      <div style={{ fontSize: 9.5, fontFamily: F.body, fontWeight: 700, color: P.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

// ── Card ────────────────────────────────────────────────────────────────
export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ backgroundColor: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 18, padding: '14px 14px', ...style }}>
      {children}
    </div>
  )
}

// ── Badge ───────────────────────────────────────────────────────────────
export function Badge({ children, color = 'green' }: { children: ReactNode; color?: 'green' | 'gold' | 'brown' | 'red' | 'teal' }) {
  const map = {
    green: { border: P.green,  color: P.green,  bg: P.greenMuted },
    gold:  { border: P.gold,   color: '#7A5800', bg: P.goldMuted },
    brown: { border: P.brown,  color: P.brown,  bg: P.brownMuted },
    red:   { border: P.red,    color: P.red,    bg: P.redMuted },
    teal:  { border: P.teal,   color: P.teal,   bg: P.tealMuted },
  }
  const c = map[color]
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      border: `1.5px solid ${c.border}`, borderRadius: 20, padding: '4px 12px',
      fontSize: 11.5, fontFamily: F.body, fontWeight: 700, color: c.color,
      backgroundColor: c.bg, letterSpacing: '0.03em',
    }}>
      {children}
    </div>
  )
}

// ── Info block (date/time trio) ─────────────────────────────────────────
export function InfoBlock({ icon, top, bottom }: { icon: string; top: string; bottom: string }) {
  return (
    <div style={{
      flex: 1, backgroundColor: P.greenMuted, border: `1px solid ${P.border}`,
      borderRadius: 16, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 3,
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 9.5, fontFamily: F.body, color: P.textMuted, fontWeight: 600 }}>{top}</span>
      <span style={{ fontSize: 13, fontFamily: F.heading, fontWeight: 600, color: P.text }}>{bottom}</span>
    </div>
  )
}

// ── Primary / secondary action buttons ─────────────────────────────────
export function PrimaryBtn({ children, onClick, style }: { children: ReactNode; onClick?: () => void; style?: CSSProperties }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '14px 0', border: 'none', borderRadius: 20,
      background: `linear-gradient(135deg, ${P.gold} 0%, ${P.goldLight} 100%)`,
      color: P.green, fontSize: 14, fontWeight: 700, fontFamily: F.body,
      cursor: 'pointer', letterSpacing: '0.02em',
      boxShadow: `0 3px 12px rgba(212,160,23,0.45)`, ...style,
    }}>
      {children}
    </button>
  )
}

export function SecondaryBtn({ children, onClick, style }: { children: ReactNode; onClick?: () => void; style?: CSSProperties }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '13px 0', border: `1.5px solid ${P.borderBrown}`,
      borderRadius: 20, backgroundColor: P.bgCard, color: P.textMid,
      fontSize: 14, fontWeight: 700, fontFamily: F.body, cursor: 'pointer', ...style,
    }}>
      {children}
    </button>
  )
}

export function DangerBtn({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '13px 0', border: `1.5px solid ${P.red}`,
      borderRadius: 20, backgroundColor: P.redMuted, color: P.red,
      fontSize: 14, fontWeight: 700, fontFamily: F.body, cursor: 'pointer',
    }}>
      {children}
    </button>
  )
}

// ── Stat tile ───────────────────────────────────────────────────────────
export function StatTile({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: string }) {
  return (
    <div style={{
      flex: 1, backgroundColor: P.bgCard, border: `1px solid ${P.border}`,
      borderRadius: 18, padding: '12px 14px',
    }}>
      {icon && <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>}
      <div style={{ fontSize: 9.5, fontFamily: F.body, color: P.textMuted, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 20, fontFamily: F.heading, fontWeight: 700, color: P.green, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, fontFamily: F.body, color: P.textMuted, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ── Row with chevron ────────────────────────────────────────────────────
export function ListRow({ icon, title, sub, right, onClick }: {
  icon?: string; title: string; sub?: string; right?: ReactNode; onClick?: () => void
}) {
  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', backgroundColor: P.bgCard, border: `1px solid ${P.border}`,
      borderRadius: 16, cursor: onClick ? 'pointer' : 'default', textAlign: 'left',
    }}>
      {icon && <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontFamily: F.body, fontWeight: 600, color: P.text }}>{title}</div>
        {sub && <div style={{ fontSize: 11, fontFamily: F.body, color: P.textMuted, marginTop: 2 }}>{sub}</div>}
      </div>
      {right ?? (onClick && <span style={{ color: P.textMuted, fontSize: 14 }}>›</span>)}
    </button>
  )
}

// ── Availability toggle ─────────────────────────────────────────────────
export function AvailToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      width: 52, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
      backgroundColor: on ? P.green : P.bgMuted, position: 'relative', transition: 'background 0.2s',
      flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 3, left: on ? 26 : 3,
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: on ? P.gold : P.textMuted,
        transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

// ── Source pill ─────────────────────────────────────────────────────────
export type ToolSource =
  | { kind: 'own' }
  | { kind: 'farmer' }
  | { kind: 'owner'; name: string; distance: string }

export function SourcePill({ source }: { source: ToolSource }) {
  const cfgs = {
    own:    { label: 'Your tool',     bg: P.greenMuted,  color: P.green },
    farmer: { label: 'Farm-provided', bg: P.goldMuted,   color: '#7A5800' },
    owner:  { label: '',              bg: P.brownMuted,  color: P.brown },
  }
  const cfg = cfgs[source.kind]
  const label = source.kind === 'owner' ? `Collect · ${source.name} (${source.distance})` : cfg.label
  return (
    <span style={{
      display: 'inline-block', fontSize: 9.5, fontFamily: F.body, fontWeight: 600,
      color: cfg.color, backgroundColor: cfg.bg, borderRadius: 20, padding: '2px 8px',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

// ── Checklist item ──────────────────────────────────────────────────────
export function CheckItem({ label, checked, onToggle }: { label: string; checked: boolean; onToggle?: () => void }) {
  return (
    <button onClick={onToggle} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 14px', backgroundColor: checked ? P.greenMuted : P.bgCard,
      border: `1px solid ${checked ? P.green : P.border}`, borderRadius: 14,
      cursor: 'pointer', textAlign: 'left',
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 7, flexShrink: 0,
        backgroundColor: checked ? P.green : 'transparent',
        border: `2px solid ${checked ? P.green : P.borderBrown}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 12,
      }}>
        {checked ? '✓' : ''}
      </div>
      <span style={{
        fontSize: 13, fontFamily: F.body, fontWeight: 600, color: checked ? P.green : P.textMid,
        textDecoration: checked ? 'line-through' : 'none',
      }}>
        {label}
      </span>
    </button>
  )
}

// ── Screen padding wrapper ──────────────────────────────────────────────
export function ScreenBody({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ padding: '4px 16px 20px', display: 'flex', flexDirection: 'column', gap: 16, ...style }}>
      {children}
    </div>
  )
}

// ── Bottom tab bar ──────────────────────────────────────────────────────
const TABS: { icon: string; label: string; screen: Screen }[] = [
  { icon: '🏠', label: 'Home',     screen: 'home' },
  { icon: '📋', label: 'Jobs',     screen: 'job-history' },
  { icon: '₹',  label: 'Earnings', screen: 'earnings' },
  { icon: '👤', label: 'Profile',  screen: 'profile' },
]

export function BottomNav({ active, navigate }: { active: Screen; navigate: NavFn }) {
  const rootScreens: Screen[] = ['home', 'job-history', 'earnings', 'profile']
  const activeTab = rootScreens.includes(active) ? active : 'home'
  return (
    <div style={{
      borderTop: `1px solid ${P.border}`, backgroundColor: P.bgCard,
      display: 'flex', justifyContent: 'space-around', padding: '10px 0 14px',
    }}>
      {TABS.map(t => (
        <button key={t.label} onClick={() => navigate(t.screen)} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          border: 'none', backgroundColor: 'transparent', cursor: 'pointer', padding: '0 8px',
        }}>
          <span style={{ fontSize: t.label === 'Earnings' ? 15 : 18, color: activeTab === t.screen ? P.green : P.textMuted, fontFamily: F.body }}>
            {t.icon}
          </span>
          <span style={{
            fontSize: 9.5, fontFamily: F.body, fontWeight: 600,
            color: activeTab === t.screen ? P.green : P.textMuted,
          }}>
            {t.label}
          </span>
        </button>
      ))}
    </div>
  )
}
