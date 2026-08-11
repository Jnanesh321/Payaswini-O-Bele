import { useState } from 'react'
import { P, F } from '../theme'
import {
  PhoneFrame, ScreenBody, Section, LeafDivider,
  PrimaryBtn, BottomNav, type NavFn,
} from '../ui'

const ITEMS = [
  { id: 'i1', label: 'Hydraulic sprayer (15L)', owner: 'Ganesh Poojari' },
  { id: 'i2', label: 'Harvesting sickle',        owner: 'Ravi Shetty (farm)' },
  { id: 'i3', label: 'Arecanut climbing belt',   owner: 'Own' },
  { id: 'i4', label: 'Safety helmet & gloves',   owner: 'Own' },
]

type Condition = 'good' | 'damaged' | null

export default function ReturnInspectionScreen({ navigate }: { navigate: NavFn }) {
  const [conditions, setConditions] = useState<Record<string, Condition>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const allSet = ITEMS.every(i => conditions[i.id] !== undefined && conditions[i.id] !== null)

  const setCondition = (id: string, c: Condition) => setConditions(prev => ({ ...prev, [id]: c }))
  const setNote = (id: string, n: string) => setNotes(prev => ({ ...prev, [id]: n }))

  return (
    <PhoneFrame title="Return Inspection" onBack={() => navigate('return-tool')}>
      <ScreenBody>
        <div style={{ fontSize: 13, fontFamily: F.body, color: P.textMid, lineHeight: 1.5 }}>
          Record the condition of each tool after use. This protects you and the tool owner.
        </div>

        <LeafDivider />

        <Section label="Tool Condition Report">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ITEMS.map(item => {
              const cond = conditions[item.id]
              return (
                <div key={item.id} style={{
                  padding: '14px', borderRadius: 18, border: `1px solid ${
                    cond === 'good' ? P.green : cond === 'damaged' ? P.red : P.border
                  }`,
                  backgroundColor: cond === 'good' ? P.greenMuted : cond === 'damaged' ? P.redMuted : P.bgCard,
                }}>
                  <div style={{ fontSize: 13, fontFamily: F.body, fontWeight: 700, color: P.text }}>{item.label}</div>
                  <div style={{ fontSize: 10.5, fontFamily: F.body, color: P.textMuted, marginTop: 2, marginBottom: 10 }}>
                    Owner: {item.owner}
                  </div>

                  {/* Condition selector */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: cond === 'damaged' ? 10 : 0 }}>
                    {(['good', 'damaged'] as const).map(opt => (
                      <button
                        key={opt}
                        onClick={() => setCondition(item.id, opt)}
                        style={{
                          flex: 1, padding: '9px 0', borderRadius: 12, cursor: 'pointer',
                          border: `1.5px solid ${cond === opt ? (opt === 'good' ? P.green : P.red) : P.border}`,
                          backgroundColor: cond === opt ? (opt === 'good' ? P.greenMuted : P.redMuted) : P.bgCard,
                          color: cond === opt ? (opt === 'good' ? P.green : P.red) : P.textMuted,
                          fontFamily: F.body, fontWeight: 700, fontSize: 12,
                        }}
                      >
                        {opt === 'good' ? '✓ Good condition' : '⚠ Damaged / worn'}
                      </button>
                    ))}
                  </div>

                  {/* Damage note + photo */}
                  {cond === 'damaged' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <input
                        value={notes[item.id] ?? ''}
                        onChange={e => setNote(item.id, e.target.value)}
                        placeholder="Describe the damage…"
                        style={{
                          flex: 1, borderRadius: 10, border: `1px solid ${P.red}`,
                          padding: '8px 10px', fontFamily: F.body, fontSize: 12, color: P.text,
                          backgroundColor: P.bgCard, outline: 'none',
                        }}
                      />
                      <button style={{
                        width: 44, height: 44, borderRadius: 12, border: `1px dashed ${P.border}`,
                        backgroundColor: P.bgMuted, cursor: 'pointer', fontSize: 18,
                      }}>📷</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>

        <LeafDivider />

        {/* Operator declaration */}
        <div style={{ padding: '12px 14px', borderRadius: 16, backgroundColor: P.goldMuted, border: `1px solid ${P.gold}` }}>
          <div style={{ fontSize: 11, fontFamily: F.body, color: '#7A5800', lineHeight: 1.6 }}>
            By submitting, you confirm this report is accurate. Any damage not reported now cannot be disputed later.
          </div>
        </div>

        <PrimaryBtn
          onClick={() => navigate('earnings')}
          style={{ opacity: allSet ? 1 : 0.5 }}
        >
          {allSet ? 'Submit Inspection Report' : `Rate all tools to submit (${Object.values(conditions).filter(Boolean).length}/${ITEMS.length})`}
        </PrimaryBtn>
      </ScreenBody>
      <BottomNav active="return-inspection" navigate={navigate} />
    </PhoneFrame>
  )
}
