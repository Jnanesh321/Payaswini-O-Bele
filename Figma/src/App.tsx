import { useState } from 'react'
import { type Screen } from './theme'
import { P, F } from './theme'

import HomeScreen           from './screens/HomeScreen'
import NewJobAlertScreen    from './screens/NewJobAlertScreen'
import JobDetailsScreen     from './screens/JobDetailsScreen'
import ToolPickupScreen     from './screens/ToolPickupScreen'
import EnRouteScreen        from './screens/EnRouteScreen'
import ArrivedScreen        from './screens/ArrivedScreen'
import WorkInProgressScreen from './screens/WorkInProgressScreen'
import WorkCompletedScreen  from './screens/WorkCompletedScreen'
import ReturnToolScreen     from './screens/ReturnToolScreen'
import ReturnInspectionScreen from './screens/ReturnInspectionScreen'
import EarningsScreen       from './screens/EarningsScreen'
import JobHistoryScreen     from './screens/JobHistoryScreen'
import DisputesScreen       from './screens/DisputesScreen'
import ProfileScreen        from './screens/ProfileScreen'
import AvailabilityScreen   from './screens/AvailabilityScreen'

// Ordered job flow for the progress indicator
const JOB_FLOW: Screen[] = [
  'new-job-alert', 'job-details', 'tool-pickup', 'en-route',
  'arrived', 'work-in-progress', 'work-completed',
  'return-tool', 'return-inspection',
]

const SCREEN_LABELS: Record<Screen, string> = {
  'home':              'Home',
  'new-job-alert':     'New Alert',
  'job-details':       'Job Details',
  'tool-pickup':       'Tool Pickup',
  'en-route':          'En Route',
  'arrived':           'Arrived',
  'work-in-progress':  'Working',
  'work-completed':    'Completed',
  'return-tool':       'Return Tools',
  'return-inspection': 'Inspection',
  'earnings':          'Earnings',
  'job-history':       'Job History',
  'disputes':          'Disputes',
  'profile':           'Profile',
  'availability':      'Availability',
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [history, setHistory] = useState<Screen[]>([])

  const navigate = (s: Screen) => {
    setHistory(h => [...h, screen])
    setScreen(s)
  }

  const jobFlowIdx = JOB_FLOW.indexOf(screen)

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#D9D0C0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 16px 40px',
      fontFamily: F.body,
    }}>
      {/* App header */}
      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontFamily: F.heading, fontWeight: 700, color: P.green }}>O~Bele</div>
        <div style={{ fontSize: 11, fontFamily: F.body, color: P.textMuted, marginTop: 2 }}>Operator App · Tulunadu</div>
      </div>

      {/* Screen nav pills */}
      <div style={{
        display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center',
        maxWidth: 760, marginBottom: 20,
      }}>
        {(Object.keys(SCREEN_LABELS) as Screen[]).map(s => (
          <button
            key={s}
            onClick={() => navigate(s)}
            style={{
              padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 11,
              border: `1.5px solid ${screen === s ? P.green : P.borderBrown}`,
              backgroundColor: screen === s ? P.green : P.bgCard,
              color: screen === s ? '#fff' : P.textMid,
              fontFamily: F.body, fontWeight: 600,
            }}
          >
            {SCREEN_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Active job flow progress bar */}
      {jobFlowIdx >= 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, maxWidth: 390 }}>
          {JOB_FLOW.map((s, i) => (
            <div
              key={s}
              title={SCREEN_LABELS[s]}
              style={{
                flex: 1, height: 5, borderRadius: 3,
                backgroundColor: i <= jobFlowIdx ? P.green : P.bgMuted,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onClick={() => navigate(s)}
            />
          ))}
        </div>
      )}

      {/* Active screen */}
      {screen === 'home'              && <HomeScreen           navigate={navigate} />}
      {screen === 'new-job-alert'     && <NewJobAlertScreen    navigate={navigate} />}
      {screen === 'job-details'       && <JobDetailsScreen     navigate={navigate} />}
      {screen === 'tool-pickup'       && <ToolPickupScreen     navigate={navigate} />}
      {screen === 'en-route'          && <EnRouteScreen        navigate={navigate} />}
      {screen === 'arrived'           && <ArrivedScreen        navigate={navigate} />}
      {screen === 'work-in-progress'  && <WorkInProgressScreen navigate={navigate} />}
      {screen === 'work-completed'    && <WorkCompletedScreen  navigate={navigate} />}
      {screen === 'return-tool'       && <ReturnToolScreen     navigate={navigate} />}
      {screen === 'return-inspection' && <ReturnInspectionScreen navigate={navigate} />}
      {screen === 'earnings'          && <EarningsScreen       navigate={navigate} />}
      {screen === 'job-history'       && <JobHistoryScreen     navigate={navigate} />}
      {screen === 'disputes'          && <DisputesScreen       navigate={navigate} />}
      {screen === 'profile'           && <ProfileScreen        navigate={navigate} />}
      {screen === 'availability'      && <AvailabilityScreen   navigate={navigate} />}
    </div>
  )
}
