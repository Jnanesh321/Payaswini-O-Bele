import { useState, useEffect } from 'react'
import { P, F } from '../theme'
import {
  PhoneFrame, ScreenBody, Section, Card, InfoBlock, Badge, LeafDivider,
  PrimaryBtn, SecondaryBtn, BottomNav, type NavFn,
} from '../ui'

export default function NewJobAlertScreen({ navigate }: { navigate: NavFn }) {
  const [seconds, setSeconds] = useState(8 * 60)

  useEffect(() => {
    const id = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [])

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const pct = seconds / (8 * 60)
  const urgent = seconds < 120

  return (
    <PhoneFrame title="New Job Alert" onBack={() => navigate('home')}>
      <ScreenBody>
        {/* Countdown ring */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0' }}>
          <div style={{
            width: 100, height: 100, borderRadius: 50,
            border: `6px solid ${urgent ? P.red : P.gold}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            backgroundColor: urgent ? P.redMuted : P.goldMuted,
            boxShadow: `0 0 0 3px ${urgent ? 'rgba(192,57,43,0.15)' : 'rgba(212,160,23,0.2)'}`,
          }}>
            <span style={{ fontSize: 22, fontFamily: F.heading, fontWeight: 700, color: urgent ? P.red : '#7A5800' }}>
              {mins}:{secs.toString().padStart(2, '0')}
            </span>
            <span style={{ fontSize: 9, fontFamily: F.body, color: P.textMuted, fontWeight: 600, marginTop: 1 }}>to respond</span>
          </div>
          <div style={{ marginTop: 8, width: '80%', height: 4, borderRadius: 4, backgroundColor: P.bgMuted, overflow: 'hidden' }}>
            <div style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: urgent ? P.red : P.gold, transition: 'width 1s linear' }} />
          </div>
        </div>

        <LeafDivider />

        {/* Job summary card */}
        <Card>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Badge color="green">🌴 Arecanut Harvest</Badge>
            <Badge color="gold">Seasonal</Badge>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 18, backgroundColor: P.brownMuted,
              border: `2px solid ${P.borderBrown}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>👨‍🌾</div>
            <div>
              <div style={{ fontSize: 14, fontFamily: F.heading, fontWeight: 600, color: P.text }}>Ravi Shetty</div>
              <div style={{ fontSize: 11, fontFamily: F.body, color: P.textMuted }}>Shetty Arecanut Estate, Udupi</div>
              <div style={{ fontSize: 11, fontFamily: F.body, color: P.green, fontWeight: 600, marginTop: 2 }}>📍 6.8 km away</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <InfoBlock icon="📅" top="Date" bottom="Wed, 13 Aug" />
            <InfoBlock icon="🕖" top="Start" bottom="6:30 AM" />
            <InfoBlock icon="⏱" top="Duration" bottom="~7 hrs" />
          </div>
        </Card>

        <LeafDivider />

        {/* Pay preview */}
        <Section label="Estimated Pay">
          <div style={{
            background: `linear-gradient(135deg, ${P.greenMuted} 0%, ${P.goldMuted} 100%)`,
            border: `1.5px solid ${P.border}`, borderRadius: 20, padding: '16px 18px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 28, fontFamily: F.heading, fontWeight: 700, color: P.green }}>₹2,100</div>
              <div style={{ fontSize: 10.5, fontFamily: F.body, color: P.textMuted, marginTop: 2 }}>₹300/hr · 7 hrs estimated</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontFamily: F.body, color: P.textMuted }}>Net after fee</div>
              <div style={{ fontSize: 13, fontFamily: F.body, fontWeight: 700, color: P.brown }}>₹1,890</div>
            </div>
          </div>
        </Section>

        {/* Details link */}
        <button
          onClick={() => navigate('job-details')}
          style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: 12, fontFamily: F.body, color: P.brown, fontWeight: 700, textDecoration: 'underline', padding: 0, textAlign: 'left' }}
        >
          View full job details →
        </button>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 10 }}>
          <SecondaryBtn onClick={() => navigate('home')} style={{ flex: 1, width: 'auto' }}>Decline</SecondaryBtn>
          <PrimaryBtn onClick={() => navigate('tool-pickup')} style={{ flex: 2, width: 'auto' }}>Accept Job</PrimaryBtn>
        </div>
      </ScreenBody>
      <BottomNav active="new-job-alert" navigate={navigate} />
    </PhoneFrame>
  )
}
