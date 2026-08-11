import { useState } from 'react'
import { P, F } from '../theme'
import {
  PhoneFrame, ScreenBody, Section, Card, LeafDivider, CheckItem,
  PrimaryBtn, BottomNav, type NavFn, type ToolSource,
} from '../ui'

const RETURNS: { id: string; label: string; returnTo: ToolSource; address: string }[] = [
  { id: 'r1', label: 'Hydraulic sprayer (15L)', returnTo: { kind: 'owner', name: 'Ganesh Poojari', distance: '2.1 km' }, address: 'Near Padubidri Junction, Udupi' },
  { id: 'r2', label: 'Harvesting sickle',        returnTo: { kind: 'farmer' },                                              address: 'Leave at farm shed — Ravi confirmed' },
  { id: 'r3', label: 'Arecanut climbing belt',   returnTo: { kind: 'own' },                                                address: 'Take home with you' },
  { id: 'r4', label: 'Safety helmet & gloves',   returnTo: { kind: 'own' },                                                address: 'Take home with you' },
]


export default function ReturnToolScreen({ navigate }: { navigate: NavFn }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const allDone = RETURNS.every(r => checked[r.id])
  const toggle = (id: string) => setChecked(c => ({ ...c, [id]: !c[id] }))

  return (
    <PhoneFrame title="Return Tools" onBack={() => navigate('work-completed')}>
      <ScreenBody>
        <div style={{ fontSize: 13, fontFamily: F.body, color: P.textMid, lineHeight: 1.5 }}>
          Return every tool to its owner. Tap each when done to log the handover.
        </div>

        <LeafDivider />

        {/* Return to external owner */}
        <Section label="Return to Tool Owner">
          {RETURNS.filter(r => r.returnTo.kind === 'owner').map(r => {
            const cfg = sourceLabel(r.returnTo)
            const owner = r.returnTo as { kind: 'owner'; name: string; distance: string }
            return (
              <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Card style={{ borderColor: P.borderBrown }}>
                  <div style={{ fontSize: 13, fontFamily: F.body, fontWeight: 700, color: P.text }}>{r.label}</div>
                  <div style={{ fontSize: 11, fontFamily: F.body, color: P.textMuted, marginTop: 2 }}>{r.address}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button style={{ flex: 1, padding: '8px 0', borderRadius: 12, border: `1px solid ${P.border}`, backgroundColor: P.greenMuted, color: P.green, fontFamily: F.body, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                      📞 Call {owner.name}
                    </button>
                    <button style={{ flex: 1, padding: '8px 0', borderRadius: 12, border: `1px solid ${P.border}`, backgroundColor: P.brownMuted, color: P.brown, fontFamily: F.body, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                      🗺 Directions ({owner.distance})
                    </button>
                  </div>
                </Card>
                <CheckItem label={`Returned to ${owner.name}`} checked={!!checked[r.id]} onToggle={() => toggle(r.id)} />
              </div>
            )
          })}
        </Section>

        <LeafDivider />

        {/* Return to farmer */}
        <Section label="Return to Farmer">
          {RETURNS.filter(r => r.returnTo.kind === 'farmer').map(r => {
            return (
              <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ padding: '8px 12px', borderRadius: 14, backgroundColor: P.goldMuted, fontSize: 11.5, fontFamily: F.body, color: '#7A5800' }}>
                  🌾 {r.address}
                </div>
                <CheckItem label={`Returned: ${r.label}`} checked={!!checked[r.id]} onToggle={() => toggle(r.id)} />
              </div>
            )
          })}
        </Section>

        <LeafDivider />

        {/* Own tools */}
        <Section label="Your Tools">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {RETURNS.filter(r => r.returnTo.kind === 'own').map(r => (
              <CheckItem key={r.id} label={r.label} checked={!!checked[r.id]} onToggle={() => toggle(r.id)} />
            ))}
          </div>
        </Section>

        <PrimaryBtn
          onClick={() => navigate('return-inspection')}
          style={{ opacity: allDone ? 1 : 0.5 }}
        >
          {allDone ? 'All Returned — Proceed to Inspection' : `Log all returns to continue (${Object.values(checked).filter(Boolean).length}/${RETURNS.length})`}
        </PrimaryBtn>
      </ScreenBody>
      <BottomNav active="return-tool" navigate={navigate} />
    </PhoneFrame>
  )
}
