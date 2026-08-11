import { useState } from 'react'
import { P, F, type Screen } from '../theme'
import {
  PhoneFrame, ScreenBody, Section, Card, StatTile, LeafDivider,
  PrimaryBtn, AvailToggle, ListRow, Badge, BottomNav, type NavFn,
} from '../ui'

export default function HomeScreen({ navigate }: { navigate: NavFn }) {
  const [available, setAvailable] = useState(true)

  return (
    <PhoneFrame
      title="O~Bele"
      navRight={
        <button style={{ width: 32, height: 32, borderRadius: 12, border: 'none', backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 16, cursor: 'pointer' }}>
          🔔
        </button>
      }
    >
      <ScreenBody>
        {/* Greeting */}
        <div style={{ paddingTop: 4 }}>
          <div style={{ fontSize: 20, fontFamily: F.heading, fontWeight: 600, color: P.text }}>
            Good morning, Prakash 👋
          </div>
          <div style={{ fontSize: 11.5, fontFamily: F.body, color: P.textMuted, marginTop: 3 }}>
            Wed, 13 Aug 2025 · Udupi Taluk
          </div>
        </div>

        {/* Availability toggle card */}
        <Card style={{ backgroundColor: available ? P.greenMuted : P.bgMuted }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13.5, fontFamily: F.body, fontWeight: 700, color: available ? P.green : P.textMid }}>
                {available ? 'You are Available' : 'You are Unavailable'}
              </div>
              <div style={{ fontSize: 11, fontFamily: F.body, color: P.textMuted, marginTop: 2 }}>
                {available ? 'Receiving new job alerts' : 'No alerts while off'}
              </div>
            </div>
            <AvailToggle on={available} onToggle={() => setAvailable(v => !v)} />
          </div>
        </Card>

        {/* New job alert banner */}
        <button
          onClick={() => navigate('new-job-alert')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px', border: `2px solid ${P.gold}`,
            borderRadius: 20, backgroundColor: P.goldMuted, cursor: 'pointer', textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 24 }}>⚡</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontFamily: F.body, fontWeight: 700, color: '#7A5800' }}>New Job Alert!</div>
            <div style={{ fontSize: 11, fontFamily: F.body, color: P.textMid, marginTop: 1 }}>
              Arecanut harvest · Ravi Shetty · 6.8 km · ₹2,100
            </div>
          </div>
          <span style={{ fontSize: 20, animation: 'pulse 1s infinite' }}>›</span>
        </button>

        <LeafDivider />

        {/* Stats row */}
        <Section label="This Week">
          <div style={{ display: 'flex', gap: 10 }}>
            <StatTile label="Earned" value="₹5,640" sub="4 jobs done" icon="💰" />
            <StatTile label="Rating" value="4.8 ★" sub="32 reviews" icon="🏅" />
            <StatTile label="On-Time" value="96%" sub="last 30 days" icon="⏱" />
          </div>
        </Section>

        <LeafDivider />

        {/* Upcoming jobs */}
        <Section label="Upcoming Jobs">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ListRow
              icon="🌾"
              title="Coconut Harvest · Lakshmi Rai"
              sub="Fri, 15 Aug · 7:00 AM · ₹1,800"
              onClick={() => navigate('job-details')}
            />
            <ListRow
              icon="🌿"
              title="Pepper Pruning · Suresh Bhat"
              sub="Sat, 16 Aug · 8:00 AM · ₹1,200"
              onClick={() => navigate('job-details')}
            />
          </div>
        </Section>

        <LeafDivider />

        {/* Quick links */}
        <Section label="Quick Access">
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { icon: '📜', label: 'Job History', screen: 'job-history' as Screen },
              { icon: '⚖️', label: 'Disputes', screen: 'disputes' as Screen },
              { icon: '📅', label: 'Availability', screen: 'availability' as Screen },
            ].map(q => (
              <button
                key={q.label}
                onClick={() => navigate(q.screen)}
                style={{
                  flex: 1, border: `1px solid ${P.border}`, borderRadius: 16,
                  backgroundColor: P.bgCard, padding: '12px 8px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                }}
              >
                <span style={{ fontSize: 22 }}>{q.icon}</span>
                <span style={{ fontSize: 10, fontFamily: F.body, fontWeight: 700, color: P.textMid }}>{q.label}</span>
              </button>
            ))}
          </div>
        </Section>

        <PrimaryBtn onClick={() => navigate('new-job-alert')}>Browse Open Jobs</PrimaryBtn>
      </ScreenBody>

      <BottomNav active="home" navigate={navigate} />
    </PhoneFrame>
  )
}
