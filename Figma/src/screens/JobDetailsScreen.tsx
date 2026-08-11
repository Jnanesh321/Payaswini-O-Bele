import { P, F } from '../theme'
import {
  PhoneFrame, ScreenBody, Section, Card, InfoBlock, Badge, LeafDivider,
  PrimaryBtn, SecondaryBtn, SourcePill, BottomNav, type NavFn, type ToolSource,
} from '../ui'

const tools: { label: string; note: string; required?: boolean; source: ToolSource }[] = [
  { label: 'Arecanut climbing belt', note: 'Operator cert. required', required: true, source: { kind: 'own' } },
  { label: 'Harvesting sickle',      note: 'Standard curved blade',                  source: { kind: 'farmer' } },
  { label: 'Hydraulic sprayer',      note: '15L capacity',           required: true, source: { kind: 'owner', name: 'Ganesh Poojari', distance: '2.1 km' } },
  { label: 'Safety helmet & gloves', note: 'Must bring own PPE',     required: true, source: { kind: 'own' } },
]

export default function JobDetailsScreen({ navigate }: { navigate: NavFn }) {
  return (
    <PhoneFrame title="Job Details" onBack={() => navigate('new-job-alert')}>
      <ScreenBody>
        {/* Job type */}
        <Section label="Job Type">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Badge color="green">🌾 Harvesting</Badge>
            <Badge color="gold">Seasonal</Badge>
          </div>
        </Section>

        <LeafDivider />

        {/* Farmer */}
        <Section label="Farmer">
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 20, backgroundColor: P.brownMuted,
                border: `2px solid ${P.borderBrown}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
              }}>👨‍🌾</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontFamily: F.heading, fontWeight: 600, color: P.text }}>Ravi Shetty</div>
                <div style={{ fontSize: 11, fontFamily: F.body, color: P.textMuted, marginTop: 2 }}>Shetty Arecanut Estate</div>
                <div style={{ fontSize: 11, fontFamily: F.body, color: P.green, fontWeight: 600, marginTop: 4 }}>📍 6.8 km away</div>
              </div>
              <button style={{
                fontSize: 10.5, fontFamily: F.body, fontWeight: 700, color: P.green,
                backgroundColor: P.greenMuted, border: `1px solid ${P.border}`,
                borderRadius: 12, padding: '6px 10px', cursor: 'pointer',
              }}>Map →</button>
            </div>
          </Card>
        </Section>

        <LeafDivider />

        {/* Schedule */}
        <Section label="Scheduled Time">
          <div style={{ display: 'flex', gap: 8 }}>
            <InfoBlock icon="📅" top="Date" bottom="Wed, 13 Aug" />
            <InfoBlock icon="🕖" top="Start" bottom="6:30 AM" />
            <InfoBlock icon="⏱" top="Duration" bottom="~7 hrs" />
          </div>
        </Section>

        <LeafDivider />

        {/* Tools */}
        <Section label="Tools & Equipment">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tools.map(t => (
              <div key={t.label} style={{
                padding: '10px 14px', border: `1px solid ${P.border}`, borderRadius: 16, backgroundColor: P.bgCard,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12.5, fontFamily: F.body, fontWeight: 600, color: P.text }}>{t.label}</span>
                  {t.required && (
                    <span style={{ fontSize: 8.5, fontFamily: F.body, fontWeight: 700, color: P.brown, backgroundColor: P.brownMuted, borderRadius: 4, padding: '1px 5px' }}>REQ</span>
                  )}
                </div>
                <div style={{ fontSize: 10.5, fontFamily: F.body, color: P.textMuted, marginTop: 3 }}>{t.note}</div>
                <div style={{ marginTop: 5 }}><SourcePill source={t.source} /></div>
              </div>
            ))}
          </div>
        </Section>

        <LeafDivider />

        {/* Earnings */}
        <Section label="Estimated Earnings">
          <div style={{
            background: `linear-gradient(135deg, ${P.greenMuted} 0%, ${P.goldMuted} 100%)`,
            border: `1.5px solid ${P.border}`, borderRadius: 20, padding: '16px 18px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 26, fontFamily: F.heading, fontWeight: 700, color: P.green }}>₹2,100</div>
              <div style={{ fontSize: 10.5, fontFamily: F.body, color: P.textMuted, marginTop: 3 }}>₹300/hr × 7 hrs</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontFamily: F.body, color: P.textMuted }}>After platform fee</div>
              <div style={{ fontSize: 11.5, fontFamily: F.body, fontWeight: 700, color: P.brown, marginTop: 2 }}>Net: ₹1,890 →</div>
            </div>
          </div>
        </Section>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 10 }}>
          <SecondaryBtn onClick={() => navigate('home')} style={{ flex: 1, width: 'auto' }}>Decline</SecondaryBtn>
          <PrimaryBtn onClick={() => navigate('tool-pickup')} style={{ flex: 2, width: 'auto' }}>Accept Job</PrimaryBtn>
        </div>
      </ScreenBody>
      <BottomNav active="job-details" navigate={navigate} />
    </PhoneFrame>
  )
}
