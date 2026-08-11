import { useState } from 'react'
import { P, F } from '../theme'
import {
  PhoneFrame, ScreenBody, Section, Card, LeafDivider,
  BottomNav, type NavFn,
} from '../ui'

const ALL_JOBS = [
  { date: 'Wed, 13 Aug', farm: 'Shetty Arecanut Estate', type: 'Arecanut Harvest', hrs: 6.8, net: 1836, status: 'completed' },
  { date: 'Mon, 11 Aug', farm: 'Rai Coconut Garden',     type: 'Coconut Harvest',  hrs: 6.0, net: 1620, status: 'completed' },
  { date: 'Sat, 9 Aug',  farm: 'Bhat Pepper Farm',       type: 'Pepper Pruning',   hrs: 4.0, net: 1080, status: 'completed' },
  { date: 'Thu, 7 Aug',  farm: 'Alva Paddy Fields',      type: 'Paddy Transplant', hrs: 5.3, net: 1440, status: 'completed' },
  { date: 'Mon, 4 Aug',  farm: 'Naik Cashew Estate',     type: 'Cashew Picking',   hrs: 3.0, net:  810, status: 'completed' },
  { date: 'Fri, 1 Aug',  farm: 'Shetty Arecanut Estate', type: 'Arecanut Harvest', hrs: 7.0, net: 1890, status: 'disputed' },
  { date: 'Tue, 29 Jul', farm: 'Poojari Coconut Farm',   type: 'Coconut Harvest',  hrs: 0,   net:    0, status: 'cancelled' },
]

const FILTERS = ['All', 'Completed', 'Disputed', 'Cancelled'] as const
type Filter = typeof FILTERS[number]

const statusCfg = (s: string) => ({
  completed: { color: P.green,  bg: P.greenMuted,  label: 'Completed' },
  disputed:  { color: P.brown,  bg: P.brownMuted,  label: 'Disputed'  },
  cancelled: { color: P.textMuted, bg: P.bgMuted,  label: 'Cancelled' },
}[s] ?? { color: P.textMuted, bg: P.bgMuted, label: s })

export default function JobHistoryScreen({ navigate }: { navigate: NavFn }) {
  const [filter, setFilter] = useState<Filter>('All')
  const [search, setSearch] = useState('')

  const visible = ALL_JOBS.filter(j => {
    const matchFilter = filter === 'All' || j.status === filter.toLowerCase()
    const matchSearch = !search || j.farm.toLowerCase().includes(search.toLowerCase()) || j.type.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <PhoneFrame title="Job History">
      <ScreenBody>
        {/* Search bar */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search farm or job type…"
          style={{
            width: '100%', borderRadius: 14, border: `1px solid ${P.border}`,
            padding: '11px 14px', fontFamily: F.body, fontSize: 12.5, color: P.text,
            backgroundColor: P.bgCard, outline: 'none', boxSizing: 'border-box',
          }}
        />

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                flexShrink: 0, padding: '6px 16px', borderRadius: 20,
                border: `1.5px solid ${filter === f ? P.green : P.border}`,
                backgroundColor: filter === f ? P.greenMuted : P.bgCard,
                color: filter === f ? P.green : P.textMuted,
                fontFamily: F.body, fontWeight: 700, fontSize: 11.5, cursor: 'pointer',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        <LeafDivider />

        <Section label={`${visible.length} Jobs`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visible.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 0', fontSize: 13, fontFamily: F.body, color: P.textMuted }}>
                No jobs found
              </div>
            )}
            {visible.map((j, i) => {
              const sc = statusCfg(j.status)
              return (
                <Card key={i} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontFamily: F.body, fontWeight: 700, color: P.text }}>{j.type}</span>
                        <span style={{ fontSize: 9.5, fontFamily: F.body, fontWeight: 700, color: sc.color, backgroundColor: sc.bg, borderRadius: 10, padding: '2px 8px' }}>
                          {sc.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, fontFamily: F.body, color: P.textMuted, marginTop: 3 }}>{j.farm}</div>
                      <div style={{ fontSize: 10.5, fontFamily: F.body, color: P.textMuted, marginTop: 2 }}>
                        {j.date}{j.hrs > 0 ? ` · ${j.hrs} hrs` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {j.net > 0 && (
                        <div style={{ fontSize: 14, fontFamily: F.heading, fontWeight: 700, color: P.green }}>
                          ₹{j.net.toLocaleString('en-IN')}
                        </div>
                      )}
                      {j.status === 'disputed' && (
                        <button
                          onClick={() => navigate('disputes')}
                          style={{ marginTop: 6, padding: '4px 10px', borderRadius: 10, border: `1px solid ${P.brown}`, backgroundColor: P.brownMuted, color: P.brown, fontFamily: F.body, fontWeight: 700, fontSize: 10, cursor: 'pointer' }}
                        >
                          View →
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </Section>
      </ScreenBody>
      <BottomNav active="job-history" navigate={navigate} />
    </PhoneFrame>
  )
}
