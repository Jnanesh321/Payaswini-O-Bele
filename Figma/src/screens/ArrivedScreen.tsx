import { useState } from 'react'
import { P, F } from '../theme'
import {
  PhoneFrame, ScreenBody, Section, Card, LeafDivider, CheckItem,
  PrimaryBtn, BottomNav, type NavFn,
} from '../ui'

const PRE_CHECKS = [
  { id: 'id', label: 'Showed Operator ID to farmer' },
  { id: 'tools', label: 'All tools present and functional' },
  { id: 'ppe', label: 'PPE (helmet + gloves) on' },
  { id: 'brief', label: 'Received work briefing from Ravi Shetty' },
]

export default function ArrivedScreen({ navigate }: { navigate: NavFn }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const allDone = PRE_CHECKS.every(c => checked[c.id])
  const toggle = (id: string) => setChecked(c => ({ ...c, [id]: !c[id] }))

  return (
    <PhoneFrame title="Arrived at Farm" onBack={() => navigate('en-route')}>
      <ScreenBody>
        {/* Arrival confirmation */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '20px 0 12px', gap: 10,
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: P.greenMuted, border: `3px solid ${P.green}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
          }}>✅</div>
          <div style={{ fontSize: 20, fontFamily: F.heading, fontWeight: 700, color: P.green }}>
            {"You've Arrived!"}
          </div>
          <div style={{ fontSize: 12, fontFamily: F.body, color: P.textMuted, textAlign: 'center', lineHeight: 1.5 }}>
            Shetty Arecanut Estate, Udupi · 6:28 AM
          </div>
        </div>

        <LeafDivider />

        {/* Farmer greeting card */}
        <Section label="Your Farmer">
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 26, width: 50, height: 50, borderRadius: 18, backgroundColor: P.brownMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>👨‍🌾</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontFamily: F.heading, fontWeight: 600, color: P.text }}>Ravi Shetty</div>
                <div style={{ fontSize: 11.5, fontFamily: F.body, color: P.textMuted }}>Arecanut Harvest · 7 hrs · ₹2,100</div>
              </div>
              <button style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${P.border}`, backgroundColor: P.greenMuted, cursor: 'pointer', fontSize: 18 }}>📞</button>
            </div>
          </Card>
        </Section>

        <LeafDivider />

        {/* Pre-work checklist */}
        <Section label="Pre-Work Checklist">
          <div style={{ fontSize: 11.5, fontFamily: F.body, color: P.textMuted, marginBottom: 4, lineHeight: 1.5 }}>
            Complete all checks before starting the clock.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PRE_CHECKS.map(c => (
              <CheckItem key={c.id} label={c.label} checked={!!checked[c.id]} onToggle={() => toggle(c.id)} />
            ))}
          </div>
        </Section>

        <LeafDivider />

        {/* Note to operator */}
        <Card style={{ backgroundColor: P.goldMuted, borderColor: P.gold }}>
          <div style={{ fontSize: 11.5, fontFamily: F.body, color: '#7A5800', lineHeight: 1.5 }}>
            <strong>Farmer's note:</strong> "Start from the eastern plot first. About 40 trees to harvest. Tea break around 9 AM."
          </div>
        </Card>

        <PrimaryBtn
          onClick={() => navigate('work-in-progress')}
          style={{ opacity: allDone ? 1 : 0.5 }}
        >
          {allDone ? 'Start Work — Clock is Running ⏱' : `Complete checklist to start (${Object.values(checked).filter(Boolean).length}/${PRE_CHECKS.length})`}
        </PrimaryBtn>
      </ScreenBody>
      <BottomNav active="arrived" navigate={navigate} />
    </PhoneFrame>
  )
}
