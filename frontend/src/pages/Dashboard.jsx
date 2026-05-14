import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { TrendingDown, AlertTriangle, DollarSign, Activity, Zap, Users } from 'lucide-react'
import { WEEKLY_TREND, MOCK_MONITORING } from '../utils/mockData.js'

const RISK_COLORS = { low: '#00e5b0', medium: '#f59e0b', high: '#ff6b8a', critical: '#ff2d55' }

const INTERVENTION_PIE = [
  { name: 'No Action', value: 412, color: '#6b7494' },
  { name: 'SMS', value: 287, color: '#00e5b0' },
  { name: 'Call', value: 95, color: '#7c6af0' },
  { name: 'Overbook', value: 31, color: '#f59e0b' },
]

function StatCard({ icon: Icon, label, value, sub, color = 'var(--accent)', glow }) {
  return (
    <div className={`card ${glow ? 'glow-accent' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
        <Icon size={16} color={color} />
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem', fontSize: '0.8rem' }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, fontFamily: 'DM Mono' }}>{p.name}: {p.value}</div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [animIn, setAnimIn] = useState(false)
  useEffect(() => { setTimeout(() => setAnimIn(true), 50) }, [])

  const totalRevenueSaved = MOCK_MONITORING.intervention_distribution.sms * 12 +
    MOCK_MONITORING.intervention_distribution.call * 22 +
    MOCK_MONITORING.intervention_distribution.overbook * 16

  return (
    <div style={{ opacity: animIn ? 1 : 0, transform: animIn ? 'none' : 'translateY(12px)', transition: 'all 0.4s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
          Operations <span style={{ color: 'var(--accent)' }}>Dashboard</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: '0.875rem' }}>
          Real-time decision intelligence across all clinic appointments
        </p>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard icon={Activity} label="Predictions (7d)" value="825" sub="↑ 12% vs last week" glow />
        <StatCard icon={TrendingDown} label="Avg No-Show Risk" value="23%" sub="Below 25% threshold" color="var(--accent)" />
        <StatCard icon={DollarSign} label="Est. Revenue Saved" value={`$${(totalRevenueSaved).toLocaleString()}`} sub="From interventions (7d)" color="#7c6af0" />
        <StatCard icon={AlertTriangle} label="High-Risk Today" value="34" sub="Require immediate action" color="var(--danger)" />
        <StatCard icon={Users} label="Interventions Sent" value="413" sub="SMS: 287 · Call: 95 · OB: 31" color="#f59e0b" />
        <StatCard icon={Zap} label="Model Accuracy" value="0.823" sub="AUROC · Brier: 0.141" color="var(--accent)" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        {/* Weekly trend */}
        <div className="card">
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>Weekly Prediction Volume</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'DM Mono' }}>PREDICTIONS · NO-SHOWS · INTERVENTIONS</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={WEEKLY_TREND} barCategoryGap="30%">
              <XAxis dataKey="day" tick={{ fill: '#6b7494', fontSize: 11, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7494', fontSize: 11, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="predictions" fill="#1e2640" radius={[4,4,0,0]} />
              <Bar dataKey="interventions" fill="#7c6af0" radius={[4,4,0,0]} />
              <Bar dataKey="noshows" fill="#ff4d6d" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Intervention pie */}
        <div className="card">
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>Intervention Mix</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'DM Mono' }}>DECISION POLICY OUTPUT</div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={INTERVENTION_PIE} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" stroke="none">
                {INTERVENTION_PIE.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.8rem' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {INTERVENTION_PIE.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                {d.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk distribution bar */}
      <div className="card">
        <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 700 }}>
          Risk Tier Distribution — Today's Queue
        </div>
        <div style={{ display: 'flex', gap: 3, height: 24, borderRadius: 6, overflow: 'hidden' }}>
          {[['low', '48%', 192], ['medium', '31%', 124], ['high', '15%', 60], ['critical', '6%', 24]].map(([tier, pct, count]) => (
            <div key={tier} style={{ flex: count, background: RISK_COLORS[tier], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.6rem', fontFamily: 'DM Mono', fontWeight: 700, color: '#0a0d14' }}>{pct}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: 10 }}>
          {[['low', 'LOW', 192], ['medium', 'MEDIUM', 124], ['high', 'HIGH', 60], ['critical', 'CRITICAL', 24]].map(([tier, label, count]) => (
            <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: RISK_COLORS[tier] }} />
              <span style={{ fontSize: '0.7rem', fontFamily: 'DM Mono', color: 'var(--text-muted)' }}>{label} ({count})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
