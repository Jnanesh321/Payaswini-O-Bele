import { P, F } from '../theme'
import {
  PhoneFrame, ScreenBody, Section, Card, InfoBlock, LeafDivider,
  PrimaryBtn, BottomNav, type NavFn,
} from '../ui'

export default function EnRouteScreen({ navigate }: { navigate: NavFn }) {
  return (
    <PhoneFrame title="En Route" onBack={() => navigate('tool-pickup')}>
      <ScreenBody>
        {/* Map placeholder */}
        <div style={{
          height: 180, borderRadius: 20, overflow: 'hidden',
          background: `linear-gradient(160deg, #c8ddb8 0%, #a4c088 40%, #7aaa60 100%)`,
          border: `1px solid ${P.border}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          position: 'relative',
        }}>
          {/* Route line */}
          <svg style={{ position: 'absolute', inset: 0 }} width="100%" height="180">
            <path d="M60,160 Q140,80 330,40" fill="none" stroke={P.green} strokeWidth="3" strokeDasharray="8 5" strokeLinecap="round" />
            <circle cx="60"  cy="160" r="8" fill={P.brown} stroke="#fff" strokeWidth="2" />
            <circle cx="330" cy="40"  r="8" fill={P.gold}  stroke="#fff" strokeWidth="2" />
          </svg>
          <div style={{ zIndex: 1, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 12, padding: '6px 14px', fontSize: 11, fontFamily: F.body, fontWeight: 700, color: P.green }}>
            🗺 Map · Shetty Arecanut Estate
          </div>
          <div style={{ zIndex: 1, fontSize: 10, fontFamily: F.body, color: P.textMid }}>Route shown for illustration</div>
        </div>

        {/* ETA + distance strip */}
        <div style={{ display: 'flex', gap: 8 }}>
          <InfoBlock icon="🏁" top="Destination" bottom="6.8 km" />
          <InfoBlock icon="⏳" top="ETA" bottom="~18 min" />
          <InfoBlock icon="🛵" top="Via" bottom="NH 66" />
        </div>

        <LeafDivider />

        {/* Farmer contact */}
        <Section label="Farmer Contact">
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 22, width: 44, height: 44, borderRadius: 16, backgroundColor: P.brownMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>👨‍🌾</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontFamily: F.heading, fontWeight: 600, color: P.text }}>Ravi Shetty</div>
                <div style={{ fontSize: 11, fontFamily: F.body, color: P.textMuted }}>+91 98440 12345</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${P.border}`, backgroundColor: P.greenMuted, cursor: 'pointer', fontSize: 18 }}>📞</button>
                <button style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${P.border}`, backgroundColor: P.goldMuted, cursor: 'pointer', fontSize: 18 }}>💬</button>
              </div>
            </div>
          </Card>
        </Section>

        <LeafDivider />

        {/* Job reminder */}
        <Section label="Job Reminder">
          <Card style={{ backgroundColor: P.greenMuted }}>
            <div style={{ fontSize: 12.5, fontFamily: F.body, fontWeight: 700, color: P.green, marginBottom: 6 }}>
              🌾 Arecanut Harvest · Today 6:30 AM
            </div>
            <div style={{ fontSize: 11.5, fontFamily: F.body, color: P.textMid, lineHeight: 1.5 }}>
              Carry all tools. Ravi Shetty will provide the harvesting sickle on arrival. Check in with him before starting.
            </div>
          </Card>
        </Section>

        {/* Safety reminder */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '10px 14px', borderRadius: 14,
          backgroundColor: P.goldMuted, border: `1px solid ${P.gold}`,
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ fontSize: 11, fontFamily: F.body, color: '#7A5800', lineHeight: 1.5 }}>
            Ride safely. Do not use your phone while driving. Pull over to check messages.
          </span>
        </div>

        <PrimaryBtn onClick={() => navigate('arrived')}>Mark as Arrived</PrimaryBtn>
      </ScreenBody>
      <BottomNav active="en-route" navigate={navigate} />
    </PhoneFrame>
  )
}
