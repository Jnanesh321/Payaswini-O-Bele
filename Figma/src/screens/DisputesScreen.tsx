import { useState } from 'react'
import { P, F } from '../theme'
import {
  PhoneFrame, ScreenBody, Section, Card, LeafDivider,
  PrimaryBtn, BottomNav, type NavFn,
} from '../ui'

const DISPUTES = [
  {
    id: 'D-2408-01', jobDate: 'Fri, 1 Aug', farm: 'Shetty Arecanut Estate', issue: 'Farmer disputes hours logged (7h vs 5.5h claimed)', status: 'under-review', updated: '2 days ago',
  },
]

const statusCfg = (s: string) => ({
  open:          { color: P.red,     bg: P.redMuted,   label: 'Open' },
  'under-review': { color: P.brown,  bg: P.brownMuted, label: 'Under Review' },
  resolved:       { color: P.green,  bg: P.greenMuted, label: 'Resolved' },
}[s] ?? { color: P.textMuted, bg: P.bgMuted, label: s })

type NewDispute = { job: string; issue: string; detail: string }

export default function DisputesScreen({ navigate }: { navigate: NavFn }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<NewDispute>({ job: '', issue: '', detail: '' })

  return (
    <PhoneFrame title="Disputes" onBack={() => navigate('home')}>
      <ScreenBody>
        {/* Summary strip */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Open', value: '0', color: P.red },
            { label: 'Under Review', value: '1', color: P.brown },
            { label: 'Resolved', value: '3', color: P.green },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, borderRadius: 16, padding: '12px 10px', textAlign: 'center',
              backgroundColor: P.bgCard, border: `1px solid ${P.border}`,
            }}>
              <div style={{ fontSize: 22, fontFamily: F.heading, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9.5, fontFamily: F.body, color: P.textMuted, marginTop: 2, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <LeafDivider />

        {/* Active disputes */}
        <Section label="Active Disputes">
          {DISPUTES.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, fontFamily: F.body, color: P.textMuted }}>No active disputes 🎉</div>
          )}
          {DISPUTES.map(d => {
            const sc = statusCfg(d.status)
            return (
              <Card key={d.id} style={{ borderColor: P.borderBrown }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontFamily: F.body, fontWeight: 700, color: P.textMuted }}>#{d.id}</span>
                  <span style={{ fontSize: 10, fontFamily: F.body, fontWeight: 700, color: sc.color, backgroundColor: sc.bg, borderRadius: 10, padding: '2px 8px' }}>{sc.label}</span>
                </div>
                <div style={{ fontSize: 13, fontFamily: F.body, fontWeight: 700, color: P.text }}>{d.farm}</div>
                <div style={{ fontSize: 11, fontFamily: F.body, color: P.textMuted, marginTop: 2 }}>{d.jobDate}</div>
                <div style={{ fontSize: 12, fontFamily: F.body, color: P.textMid, marginTop: 8, lineHeight: 1.5, padding: '8px 10px', backgroundColor: P.redMuted, borderRadius: 10 }}>
                  ⚠️ {d.issue}
                </div>
                <div style={{ fontSize: 10, fontFamily: F.body, color: P.textMuted, marginTop: 8 }}>Updated {d.updated}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button style={{ flex: 1, padding: '8px 0', borderRadius: 12, border: `1px solid ${P.border}`, backgroundColor: P.greenMuted, color: P.green, fontFamily: F.body, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Add Evidence</button>
                  <button style={{ flex: 1, padding: '8px 0', borderRadius: 12, border: `1px solid ${P.border}`, backgroundColor: P.bgCard, color: P.textMid, fontFamily: F.body, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Contact Support</button>
                </div>
              </Card>
            )
          })}
        </Section>

        <LeafDivider />

        {/* Raise new dispute */}
        {!showForm ? (
          <PrimaryBtn onClick={() => setShowForm(true)}>+ Raise New Dispute</PrimaryBtn>
        ) : (
          <Section label="New Dispute">
            <Card>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  value={form.job}
                  onChange={e => setForm(f => ({ ...f, job: e.target.value }))}
                  placeholder="Job reference / date"
                  style={{ borderRadius: 12, border: `1px solid ${P.border}`, padding: '9px 12px', fontFamily: F.body, fontSize: 12.5, color: P.text, outline: 'none' }}
                />
                <select
                  value={form.issue}
                  onChange={e => setForm(f => ({ ...f, issue: e.target.value }))}
                  style={{ borderRadius: 12, border: `1px solid ${P.border}`, padding: '9px 12px', fontFamily: F.body, fontSize: 12.5, color: P.text, outline: 'none', backgroundColor: P.bgCard }}
                >
                  <option value="">Select issue type…</option>
                  <option>Hours dispute</option>
                  <option>Payment not received</option>
                  <option>Tool damage claim</option>
                  <option>Farmer behaviour</option>
                  <option>Other</option>
                </select>
                <textarea
                  value={form.detail}
                  onChange={e => setForm(f => ({ ...f, detail: e.target.value }))}
                  placeholder="Describe the issue in detail…"
                  rows={3}
                  style={{ borderRadius: 12, border: `1px solid ${P.border}`, padding: '9px 12px', fontFamily: F.body, fontSize: 12.5, color: P.text, outline: 'none', resize: 'none' }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 14, border: `1px solid ${P.border}`, backgroundColor: P.bgCard, fontFamily: F.body, fontWeight: 700, fontSize: 12, color: P.textMid, cursor: 'pointer' }}>Cancel</button>
                  <button style={{ flex: 2, padding: '10px 0', borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${P.gold}, ${P.goldLight})`, color: P.green, fontFamily: F.body, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Submit Dispute</button>
                </div>
              </div>
            </Card>
          </Section>
        )}
      </ScreenBody>
      <BottomNav active="disputes" navigate={navigate} />
    </PhoneFrame>
  )
}
