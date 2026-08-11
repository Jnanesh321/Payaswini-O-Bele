import { useState } from 'react'
import { P, F } from '../theme'
import {
  PhoneFrame, ScreenBody, Section, Card, LeafDivider,
  PrimaryBtn, AvailToggle, BottomNav, type NavFn,
} from '../ui'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const JOB_TYPES = ['Arecanut Harvest', 'Coconut Harvest', 'Pepper Pruning', 'Paddy Transplant', 'Cashew Picking', 'General Labour']
const ZONES = ['Udupi Taluk', 'Kundapur Taluk', 'Karkala Taluk', 'Brahmavar']

export default function AvailabilityScreen({ navigate }: { navigate: NavFn }) {
  const [available, setAvailable]   = useState(true)
  const [activeDays, setActiveDays] = useState<Record<string, boolean>>({ Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true })
  const [startHr, setStartHr]       = useState('6')
  const [endHr, setEndHr]           = useState('18')
  const [jobTypes, setJobTypes]      = useState<Record<string, boolean>>({ 'Arecanut Harvest': true, 'Coconut Harvest': true, 'Pepper Pruning': true })
  const [zone, setZone]              = useState('Udupi Taluk')
  const [radius, setRadius]          = useState(15)

  const toggleDay  = (d: string) => setActiveDays(p => ({ ...p, [d]: !p[d] }))
  const toggleType = (t: string) => setJobTypes(p => ({ ...p, [t]: !p[t] }))

  return (
    <PhoneFrame title="Availability" onBack={() => navigate('profile')}>
      <ScreenBody>
        {/* Master toggle */}
        <Card style={{ backgroundColor: available ? P.greenMuted : P.bgMuted, borderColor: available ? P.green : P.border }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 15, fontFamily: F.heading, fontWeight: 700, color: available ? P.green : P.textMid }}>
                {available ? 'Currently Available' : 'Currently Unavailable'}
              </div>
              <div style={{ fontSize: 11.5, fontFamily: F.body, color: P.textMuted, marginTop: 3 }}>
                {available ? "You'll receive new job alerts" : 'Job alerts paused'}
              </div>
            </div>
            <AvailToggle on={available} onToggle={() => setAvailable(v => !v)} />
          </div>
        </Card>

        <LeafDivider />

        {/* Weekly schedule */}
        <Section label="Working Days">
          <div style={{ display: 'flex', gap: 6 }}>
            {DAYS.map(d => (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 14, cursor: 'pointer',
                  border: `1.5px solid ${activeDays[d] ? P.green : P.border}`,
                  backgroundColor: activeDays[d] ? P.green : P.bgCard,
                  color: activeDays[d] ? '#fff' : P.textMuted,
                  fontFamily: F.body, fontWeight: 700, fontSize: 10,
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </Section>

        <LeafDivider />

        {/* Hours */}
        <Section label="Working Hours">
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9.5, fontFamily: F.body, fontWeight: 700, color: P.textMuted, marginBottom: 6 }}>START</div>
                <select
                  value={startHr}
                  onChange={e => setStartHr(e.target.value)}
                  style={{ width: '100%', borderRadius: 10, border: `1px solid ${P.border}`, padding: '8px 10px', fontFamily: F.body, fontSize: 12.5, color: P.text, backgroundColor: P.bgCard, outline: 'none' }}
                >
                  {['5', '6', '7', '8', '9'].map(h => <option key={h} value={h}>{h}:00 AM</option>)}
                </select>
              </div>
              <div style={{ fontSize: 18, color: P.textMuted, marginTop: 14 }}>→</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9.5, fontFamily: F.body, fontWeight: 700, color: P.textMuted, marginBottom: 6 }}>END</div>
                <select
                  value={endHr}
                  onChange={e => setEndHr(e.target.value)}
                  style={{ width: '100%', borderRadius: 10, border: `1px solid ${P.border}`, padding: '8px 10px', fontFamily: F.body, fontSize: 12.5, color: P.text, backgroundColor: P.bgCard, outline: 'none' }}
                >
                  {['14', '16', '17', '18', '19', '20'].map(h => <option key={h} value={h}>{parseInt(h) > 12 ? `${parseInt(h)-12}:00 PM` : `${h}:00`}</option>)}
                </select>
              </div>
            </div>
          </Card>
        </Section>

        <LeafDivider />

        {/* Zone + radius */}
        <Section label="Operating Zone">
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ZONES.map(z => (
                  <button
                    key={z}
                    onClick={() => setZone(z)}
                    style={{
                      padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                      border: `1.5px solid ${zone === z ? P.green : P.border}`,
                      backgroundColor: zone === z ? P.greenMuted : P.bgCard,
                      color: zone === z ? P.green : P.textMuted,
                      fontFamily: F.body, fontWeight: 700, fontSize: 11,
                    }}
                  >
                    {z}
                  </button>
                ))}
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontFamily: F.body, color: P.textMuted, fontWeight: 600 }}>Max distance</span>
                  <span style={{ fontSize: 12, fontFamily: F.body, fontWeight: 700, color: P.green }}>{radius} km</span>
                </div>
                <input
                  type="range" min={5} max={40} value={radius}
                  onChange={e => setRadius(Number(e.target.value))}
                  style={{ width: '100%', accentColor: P.green }}
                />
              </div>
            </div>
          </Card>
        </Section>

        <LeafDivider />

        {/* Preferred job types */}
        <Section label="Preferred Job Types">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {JOB_TYPES.map(t => (
              <button
                key={t}
                onClick={() => toggleType(t)}
                style={{
                  padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                  border: `1.5px solid ${jobTypes[t] ? P.green : P.border}`,
                  backgroundColor: jobTypes[t] ? P.greenMuted : P.bgCard,
                  color: jobTypes[t] ? P.green : P.textMuted,
                  fontFamily: F.body, fontWeight: 700, fontSize: 11,
                }}
              >
                {jobTypes[t] ? '✓ ' : ''}{t}
              </button>
            ))}
          </div>
        </Section>

        <PrimaryBtn onClick={() => navigate('profile')}>Save Availability</PrimaryBtn>
      </ScreenBody>
      <BottomNav active="availability" navigate={navigate} />
    </PhoneFrame>
  )
}
