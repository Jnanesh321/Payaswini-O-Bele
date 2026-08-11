import { P, F } from '../theme'
import {
  PhoneFrame, ScreenBody, Section, Card, ListRow, LeafDivider,
  DangerBtn, BottomNav, type NavFn,
} from '../ui'

const SKILLS = ['Arecanut Harvest', 'Coconut Harvest', 'Pepper Pruning', 'Paddy Transplant', 'Cashew Picking']

const DOCS = [
  { label: 'Aadhaar Card',           status: 'verified' },
  { label: 'Operator ID (O~Bele)',    status: 'verified' },
  { label: 'Climbing Belt Cert.',     status: 'verified' },
  { label: 'Pesticide Applicator Lic.', status: 'pending' },
]

const docIcon = (s: string) => s === 'verified' ? '✅' : '⏳'
const docColor = (s: string) => s === 'verified' ? P.green : P.brown

export default function ProfileScreen({ navigate }: { navigate: NavFn }) {
  return (
    <PhoneFrame title="My Profile">
      <ScreenBody>
        {/* Avatar + stats */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '12px 0' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 80, height: 80, borderRadius: 30, backgroundColor: P.brownMuted,
              border: `3px solid ${P.green}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40,
            }}>👨‍🌾</div>
            <button style={{
              position: 'absolute', bottom: -4, right: -4, width: 28, height: 28,
              borderRadius: 10, border: 'none', backgroundColor: P.gold, cursor: 'pointer', fontSize: 14,
            }}>✏️</button>
          </div>
          <div style={{ fontSize: 20, fontFamily: F.heading, fontWeight: 700, color: P.text }}>Prakash K. Shetty</div>
          <div style={{ fontSize: 12, fontFamily: F.body, color: P.textMuted }}>ID: OB-2024-UDU-0341</div>
          <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
            {[
              { v: '4.8 ★', l: 'Rating' },
              { v: '32', l: 'Reviews' },
              { v: '47', l: 'Jobs Done' },
            ].map(s => (
              <div key={s.l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontFamily: F.heading, fontWeight: 700, color: P.green }}>{s.v}</div>
                <div style={{ fontSize: 10, fontFamily: F.body, color: P.textMuted }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <LeafDivider />

        {/* Skills / Specialisations */}
        <Section label="Skills & Specialisations">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SKILLS.map(s => (
              <span key={s} style={{
                padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${P.green}`,
                backgroundColor: P.greenMuted, color: P.green, fontFamily: F.body, fontWeight: 700, fontSize: 11.5,
              }}>{s}</span>
            ))}
            <span style={{
              padding: '5px 12px', borderRadius: 20, border: `1.5px dashed ${P.border}`,
              color: P.textMuted, fontFamily: F.body, fontWeight: 700, fontSize: 11.5, cursor: 'pointer',
            }}>+ Add skill</span>
          </div>
        </Section>

        <LeafDivider />

        {/* Zone */}
        <Section label="Operating Zone">
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13.5, fontFamily: F.body, fontWeight: 700, color: P.text }}>Udupi Taluk</div>
                <div style={{ fontSize: 11, fontFamily: F.body, color: P.textMuted, marginTop: 2 }}>Udupi District, Karnataka · up to 15 km</div>
              </div>
              <button style={{ padding: '6px 12px', borderRadius: 12, border: `1px solid ${P.border}`, backgroundColor: P.greenMuted, color: P.green, fontFamily: F.body, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Edit</button>
            </div>
          </Card>
        </Section>

        <LeafDivider />

        {/* Documents */}
        <Section label="Documents & Certifications">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DOCS.map(d => (
              <div key={d.label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 14, border: `1px solid ${P.border}`, backgroundColor: P.bgCard,
              }}>
                <span style={{ fontSize: 12.5, fontFamily: F.body, fontWeight: 600, color: P.text }}>{d.label}</span>
                <span style={{ fontSize: 11, fontFamily: F.body, fontWeight: 700, color: docColor(d.status) }}>
                  {docIcon(d.status)} {d.status === 'verified' ? 'Verified' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <LeafDivider />

        {/* Account settings */}
        <Section label="Account">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ListRow icon="📞" title="Phone" sub="+91 98440 12345" onClick={() => {}} />
            <ListRow icon="🏦" title="Bank Account" sub="SBI ···· 8812 · Verified" onClick={() => {}} />
            <ListRow icon="📅" title="Availability" sub="Mon–Sat · 6AM–6PM" onClick={() => navigate('availability')} />
            <ListRow icon="⚖️" title="Disputes" sub="1 under review" onClick={() => navigate('disputes')} />
          </div>
        </Section>

        <DangerBtn>Sign Out</DangerBtn>
      </ScreenBody>
      <BottomNav active="profile" navigate={navigate} />
    </PhoneFrame>
  )
}
