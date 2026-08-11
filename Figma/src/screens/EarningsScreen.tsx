import { P, F } from '../theme'
import {
  PhoneFrame, ScreenBody, Section, Card, StatTile, LeafDivider,
  PrimaryBtn, BottomNav, Badge, type NavFn,
} from '../ui'

const RECENT = [
  { date: 'Wed, 13 Aug', farm: 'Shetty Arecanut Estate', type: 'Arecanut Harvest', gross: 2040, net: 1836, status: 'paid' },
  { date: 'Mon, 11 Aug', farm: 'Rai Coconut Garden',     type: 'Coconut Harvest',  gross: 1800, net: 1620, status: 'paid' },
  { date: 'Sat, 9 Aug',  farm: 'Bhat Pepper Farm',       type: 'Pepper Pruning',   gross: 1200, net: 1080, status: 'paid' },
  { date: 'Thu, 7 Aug',  farm: 'Alva Paddy Fields',      type: 'Paddy Transplant', gross: 1600, net: 1440, status: 'pending' },
  { date: 'Mon, 4 Aug',  farm: 'Naik Cashew Estate',     type: 'Cashew Picking',   gross: 900,  net: 810,  status: 'paid' },
]

const statusColor = (s: string) => s === 'paid'
  ? { color: P.green, bg: P.greenMuted, label: 'Paid' }
  : { color: P.brown, bg: P.goldMuted, label: 'Pending' }

export default function EarningsScreen({ navigate }: { navigate: NavFn }) {
  const totalMonth  = RECENT.reduce((a, r) => a + r.net, 0)
  const totalPaid   = RECENT.filter(r => r.status === 'paid').reduce((a, r) => a + r.net, 0)
  const totalPending = RECENT.filter(r => r.status === 'pending').reduce((a, r) => a + r.net, 0)

  return (
    <PhoneFrame title="Earnings">
      <ScreenBody>
        {/* Month total */}
        <div style={{
          background: `linear-gradient(135deg, ${P.green} 0%, ${P.greenLight} 100%)`,
          borderRadius: 22, padding: '20px 20px', color: '#fff',
        }}>
          <div style={{ fontSize: 11, fontFamily: F.body, fontWeight: 700, letterSpacing: '0.1em', opacity: 0.8, textTransform: 'uppercase' }}>August 2025</div>
          <div style={{ fontSize: 36, fontFamily: F.heading, fontWeight: 700, marginTop: 6 }}>
            ₹{totalMonth.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 11, fontFamily: F.body, opacity: 0.75, marginTop: 4 }}>
            Net earnings · {RECENT.length} jobs completed
          </div>
          <PrimaryBtn onClick={() => {}} style={{ marginTop: 16, backgroundColor: P.goldLight, color: P.green, boxShadow: 'none' }}>
            Withdraw to Bank Account
          </PrimaryBtn>
        </div>

        {/* Paid / Pending tiles */}
        <div style={{ display: 'flex', gap: 10 }}>
          <StatTile label="Paid" value={`₹${totalPaid.toLocaleString('en-IN')}`} sub={`${RECENT.filter(r=>r.status==='paid').length} jobs`} icon="✅" />
          <StatTile label="Pending" value={`₹${totalPending.toLocaleString('en-IN')}`} sub="Clears in 24 hrs" icon="⏳" />
        </div>

        <LeafDivider />

        {/* Monthly trend bar (simple) */}
        <Section label="Last 6 Months">
          <Card>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 60 }}>
              {[
                { m: 'Mar', pct: 0.45 },
                { m: 'Apr', pct: 0.60 },
                { m: 'May', pct: 0.55 },
                { m: 'Jun', pct: 0.72 },
                { m: 'Jul', pct: 0.65 },
                { m: 'Aug', pct: 0.90 },
              ].map(b => (
                <div key={b.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: '100%', borderRadius: '6px 6px 0 0',
                    height: `${b.pct * 52}px`,
                    backgroundColor: b.m === 'Aug' ? P.gold : P.greenMuted,
                    border: `1px solid ${b.m === 'Aug' ? P.gold : P.border}`,
                  }} />
                  <span style={{ fontSize: 9, fontFamily: F.body, color: P.textMuted }}>{b.m}</span>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        <LeafDivider />

        {/* Recent breakdown */}
        <Section label="Recent Jobs">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {RECENT.map((r, i) => {
              const sc = statusColor(r.status)
              return (
                <Card key={i}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontFamily: F.body, fontWeight: 700, color: P.text }}>{r.type}</div>
                      <div style={{ fontSize: 11, fontFamily: F.body, color: P.textMuted, marginTop: 2 }}>{r.farm}</div>
                      <div style={{ fontSize: 10.5, fontFamily: F.body, color: P.textMuted, marginTop: 1 }}>{r.date}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontFamily: F.heading, fontWeight: 700, color: P.green }}>₹{r.net.toLocaleString('en-IN')}</div>
                      <div style={{ fontSize: 10, fontFamily: F.body, color: P.textMuted, marginTop: 1 }}>of ₹{r.gross.toLocaleString('en-IN')}</div>
                      <span style={{
                        display: 'inline-block', marginTop: 4, fontSize: 9.5, fontFamily: F.body, fontWeight: 700,
                        color: sc.color, backgroundColor: sc.bg, borderRadius: 10, padding: '2px 8px',
                      }}>
                        {sc.label}
                      </span>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </Section>
      </ScreenBody>
      <BottomNav active="earnings" navigate={navigate} />
    </PhoneFrame>
  )
}
