import { useState } from 'react'
import { P, F } from '../theme'
import {
  PhoneFrame, ScreenBody, Section, Card, LeafDivider, CheckItem,
  PrimaryBtn, SourcePill, BottomNav, type NavFn, type ToolSource,
} from '../ui'

const TOOLS: { id: string; label: string; note: string; source: ToolSource }[] = [
  { id: '1', label: 'Arecanut climbing belt', note: 'Your cert. must be on you', source: { kind: 'own' } },
  { id: '2', label: 'Safety helmet & gloves', note: 'Your personal PPE',         source: { kind: 'own' } },
  { id: '3', label: 'Hydraulic sprayer (15L)', note: 'Collect before leaving',   source: { kind: 'owner', name: 'Ganesh Poojari', distance: '2.1 km' } },
]

export default function ToolPickupScreen({ navigate }: { navigate: NavFn }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const allDone = TOOLS.every(t => checked[t.id])

  const toggle = (id: string) => setChecked(c => ({ ...c, [id]: !c[id] }))

  return (
    <PhoneFrame title="Tool Pickup" onBack={() => navigate('job-details')}>
      <ScreenBody>
        <div style={{ fontSize: 13.5, fontFamily: F.body, color: P.textMid, lineHeight: 1.5 }}>
          Confirm you have all required tools before heading out. Tap each item once collected.
        </div>

        <LeafDivider />

        {/* Own tools */}
        <Section label="Your Tools to Bring">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TOOLS.filter(t => t.source.kind === 'own').map(t => (
              <div key={t.id}>
                <CheckItem label={t.label} checked={!!checked[t.id]} onToggle={() => toggle(t.id)} />
                <div style={{ paddingLeft: 46, marginTop: 3 }}>
                  <span style={{ fontSize: 10, fontFamily: F.body, color: P.textMuted }}>{t.note} · </span>
                  <SourcePill source={t.source} />
                </div>
              </div>
            ))}
          </div>
        </Section>

        <LeafDivider />

        {/* External pickup */}
        <Section label="Tools to Collect En Route">
          {TOOLS.filter(t => t.source.kind === 'owner').map(t => {
            const src = t.source as { kind: 'owner'; name: string; distance: string }
            return (
              <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Card style={{ borderColor: P.borderBrown }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontFamily: F.body, fontWeight: 700, color: P.text }}>{t.label}</div>
                      <div style={{ fontSize: 11, fontFamily: F.body, color: P.textMuted, marginTop: 2 }}>
                        Collect from <strong style={{ color: P.brown }}>{src.name}</strong> · {src.distance}
                      </div>
                    </div>
                    <SourcePill source={t.source} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button style={{ flex: 1, padding: '8px 0', borderRadius: 12, border: `1px solid ${P.border}`, backgroundColor: P.greenMuted, color: P.green, fontFamily: F.body, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                      📞 Call Owner
                    </button>
                    <button style={{ flex: 1, padding: '8px 0', borderRadius: 12, border: `1px solid ${P.border}`, backgroundColor: P.brownMuted, color: P.brown, fontFamily: F.body, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                      🗺 Get Directions
                    </button>
                  </div>
                </Card>
                <CheckItem label={`Collected from ${src.name}`} checked={!!checked[t.id]} onToggle={() => toggle(t.id)} />
              </div>
            )
          })}
        </Section>

        <LeafDivider />

        {/* Farmer note */}
        <Card style={{ backgroundColor: P.goldMuted, borderColor: P.gold }}>
          <div style={{ fontSize: 11, fontFamily: F.body, color: '#7A5800', lineHeight: 1.5 }}>
            🌾 <strong>Harvesting sickle</strong> will be provided by Ravi Shetty at the farm. No collection needed.
          </div>
        </Card>

        <PrimaryBtn
          onClick={() => navigate('en-route')}
          style={{ opacity: allDone ? 1 : 0.5 }}
        >
          {allDone ? 'All Collected — Start Journey 🛵' : `Collect all tools to proceed (${Object.values(checked).filter(Boolean).length}/${TOOLS.length})`}
        </PrimaryBtn>
      </ScreenBody>
      <BottomNav active="tool-pickup" navigate={navigate} />
    </PhoneFrame>
  )
}
