import { useState, useEffect } from 'react'
import { P, F } from '../theme'
import {
  PhoneFrame, ScreenBody, Section, Card, LeafDivider, CheckItem,
  PrimaryBtn, BottomNav, type NavFn,
} from '../ui'

const TASKS = [
  { id: 't1', label: 'Harvest eastern plot (~40 trees)' },
  { id: 't2', label: 'Bundle & stack cut fronds' },
  { id: 't3', label: 'Spray pesticide on northern plot' },
  { id: 't4', label: 'Clear fallen debris from pathways' },
  { id: 't5', label: 'Final walkthrough with Ravi Shetty' },
]

export default function WorkInProgressScreen({ navigate }: { navigate: NavFn }) {
  const [elapsed, setElapsed] = useState(5820) // start 1h 37m in
  const [tasks, setTasks] = useState<Record<string, boolean>>({ t1: true })
  const [note, setNote] = useState('')

  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const hrs = Math.floor(elapsed / 3600)
  const mins = Math.floor((elapsed % 3600) / 60)
  const secs = elapsed % 60
  const earned = Math.floor((elapsed / 3600) * 300)
  const done = Object.values(tasks).filter(Boolean).length

  const toggle = (id: string) => setTasks(t => ({ ...t, [id]: !t[id] }))

  return (
    <PhoneFrame title="Work In Progress" onBack={() => navigate('arrived')}>
      <ScreenBody>
        {/* Live timer */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '16px 0', gap: 6,
          background: `linear-gradient(135deg, ${P.greenMuted} 0%, ${P.goldMuted} 100%)`,
          borderRadius: 22, border: `1.5px solid ${P.border}`,
        }}>
          <div style={{ fontSize: 11, fontFamily: F.body, fontWeight: 700, color: P.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Time Elapsed</div>
          <div style={{ fontSize: 40, fontFamily: F.heading, fontWeight: 700, color: P.green, letterSpacing: '0.04em' }}>
            {String(hrs).padStart(2,'0')}:{String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
          </div>
          <div style={{ fontSize: 12.5, fontFamily: F.body, color: P.brown, fontWeight: 700 }}>
            ≈ ₹{earned.toLocaleString('en-IN')} earned so far
          </div>
        </div>

        <LeafDivider />

        {/* Task checklist */}
        <Section label={`Tasks (${done}/${TASKS.length} done)`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TASKS.map(t => (
              <CheckItem key={t.id} label={t.label} checked={!!tasks[t.id]} onToggle={() => toggle(t.id)} />
            ))}
          </div>
        </Section>

        <LeafDivider />

        {/* Notes + photo */}
        <Section label="Field Notes">
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a note (e.g. tool issue, extra work requested…)"
              style={{
                flex: 1, height: 70, borderRadius: 14, border: `1px solid ${P.border}`,
                padding: '10px 12px', fontFamily: F.body, fontSize: 12.5,
                color: P.text, backgroundColor: P.bgCard, resize: 'none',
                outline: 'none',
              }}
            />
            <button style={{
              width: 70, height: 70, borderRadius: 14, border: `1px dashed ${P.border}`,
              backgroundColor: P.bgMuted, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              <span style={{ fontSize: 22 }}>📷</span>
              <span style={{ fontSize: 9, fontFamily: F.body, color: P.textMuted }}>Photo</span>
            </button>
          </div>
        </Section>

        <LeafDivider />

        {/* Farmer contact strip */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, fontFamily: F.body, fontWeight: 700, color: P.text }}>Need help?</div>
              <div style={{ fontSize: 11, fontFamily: F.body, color: P.textMuted }}>Contact Ravi Shetty</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${P.border}`, backgroundColor: P.greenMuted, cursor: 'pointer', fontSize: 18 }}>📞</button>
              <button style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${P.border}`, backgroundColor: P.goldMuted, cursor: 'pointer', fontSize: 18 }}>💬</button>
            </div>
          </div>
        </Card>

        <PrimaryBtn onClick={() => navigate('work-completed')}>Mark Work as Completed</PrimaryBtn>
      </ScreenBody>
      <BottomNav active="work-in-progress" navigate={navigate} />
    </PhoneFrame>
  )
}
