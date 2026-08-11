import { P, F } from '../theme'
import {
  PhoneFrame, ScreenBody, Section, Card, LeafDivider,
  PrimaryBtn, SecondaryBtn, BottomNav, type NavFn,
} from '../ui'

export default function WorkCompletedScreen({ navigate }: { navigate: NavFn }) {
  return (
    <PhoneFrame title="Work Completed" onBack={() => navigate('work-in-progress')}>
      <ScreenBody>
        {/* Completion banner */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '20px 0 12px', gap: 10,
        }}>
          <div style={{ fontSize: 56 }}>🎉</div>
          <div style={{ fontSize: 21, fontFamily: F.heading, fontWeight: 700, color: P.green }}>Great Work, Prakash!</div>
          <div style={{ fontSize: 12, fontFamily: F.body, color: P.textMuted }}>Shetty Arecanut Estate · Wed, 13 Aug</div>
        </div>

        <LeafDivider />

        {/* Summary stats */}
        <Section label="Work Summary">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { icon: '⏱', label: 'Total Time', value: '6 hrs 48 min' },
              { icon: '✅', label: 'Tasks Completed', value: '5 of 5' },
              { icon: '📸', label: 'Photos Captured', value: '3 photos' },
              { icon: '📝', label: 'Notes Added', value: '1 note' },
            ].map(r => (
              <Card key={r.label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{r.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontFamily: F.body, color: P.textMuted }}>{r.label}</div>
                    <div style={{ fontSize: 14, fontFamily: F.heading, fontWeight: 600, color: P.text }}>{r.value}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        <LeafDivider />

        {/* Earnings preview */}
        <Section label="Earnings">
          <div style={{
            background: `linear-gradient(135deg, ${P.greenMuted} 0%, ${P.goldMuted} 100%)`,
            border: `1.5px solid ${P.border}`, borderRadius: 20, padding: '16px 18px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 28, fontFamily: F.heading, fontWeight: 700, color: P.green }}>₹2,040</div>
              <div style={{ fontSize: 10.5, fontFamily: F.body, color: P.textMuted, marginTop: 2 }}>₹300/hr × 6.8 hrs (actual)</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontFamily: F.body, color: P.textMuted }}>Net after 10% fee</div>
              <div style={{ fontSize: 14, fontFamily: F.body, fontWeight: 700, color: P.brown }}>₹1,836</div>
              <div style={{ fontSize: 9.5, fontFamily: F.body, color: P.textMuted, marginTop: 2 }}>Paid within 24 hrs</div>
            </div>
          </div>
        </Section>

        <LeafDivider />

        {/* Farmer sign-off */}
        <Section label="Farmer Sign-Off">
          <Card style={{ borderColor: P.gold, backgroundColor: P.goldMuted }}>
            <div style={{ fontSize: 12, fontFamily: F.body, color: '#7A5800', lineHeight: 1.5, marginBottom: 12 }}>
              Ask Ravi Shetty to confirm work completion. This locks in your time and earnings.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{
                flex: 1, padding: '10px 0', borderRadius: 14, border: `1px solid ${P.gold}`,
                backgroundColor: P.bgCard, fontFamily: F.body, fontWeight: 700,
                fontSize: 12, color: '#7A5800', cursor: 'pointer',
              }}>
                📲 Send OTP to Farmer
              </button>
            </div>
          </Card>
        </Section>

        <PrimaryBtn onClick={() => navigate('return-tool')}>Return Tools Now →</PrimaryBtn>
        <SecondaryBtn onClick={() => navigate('home')}>Return Tools Later</SecondaryBtn>
      </ScreenBody>
      <BottomNav active="work-completed" navigate={navigate} />
    </PhoneFrame>
  )
}
