import { useState, useEffect } from 'react'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { api } from '../utils/api.js'

const RISK_COLORS = { low: '#00e5b0', medium: '#f59e0b', high: '#ff6b8a', critical: '#ff2d55' }
const RISK_LABELS = { low: 'LOW RISK', medium: 'MEDIUM RISK', high: 'HIGH RISK', critical: 'CRITICAL' }
const IV_COLORS = { none: '#6b7494', sms: '#00e5b0', call: '#7c6af0', overbook: '#f59e0b' }
const IV_ICONS = { none: '—', sms: '📱', call: '📞', overbook: '🔄' }

function RiskGauge({ prob }) {
  const color = prob < 0.2 ? '#00e5b0' : prob < 0.4 ? '#f59e0b' : prob < 0.65 ? '#ff6b8a' : '#ff2d55'
  const cx = 90, cy = 90, r = 70
  const rad = (a) => (a * Math.PI) / 180
  const angle = prob * 180 - 90
  const x = cx + r * Math.cos(rad(angle - 90))
  const y = cy + r * Math.sin(rad(angle - 90))
  return (
    <svg viewBox="0 0 180 100" style={{ width: 160, height: 90 }}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#1e2640" strokeWidth="12" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth="12"
        strokeLinecap="round" strokeDasharray={`${prob * 220} 220`} />
      <line x1={cx} y1={cy} x2={x} y2={y} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={4} fill={color} />
      <text x={cx} y={cy + 18} textAnchor="middle" fill={color} fontSize={18} fontWeight={800} fontFamily="Syne">
        {(prob * 100).toFixed(0)}%
      </text>
    </svg>
  )
}

function UpliftBar({ estimates }) {
  const data = estimates.map(u => ({
    name: u.intervention.toUpperCase(),
    net: parseFloat(u.net_value_usd.toFixed(2)),
    color: IV_COLORS[u.intervention],
  }))
  return (
    <ResponsiveContainer width="100%" height={130}>
      <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
        <XAxis type="number" tick={{ fill: '#6b7494', fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fill: '#6b7494', fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} width={55} />
        <Tooltip formatter={(v) => [`$${v}`, 'Net Value']} contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.8rem' }} />
        <Bar dataKey="net" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function FeatureChart({ importances }) {
  const data = Object.entries(importances)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k, v]) => ({ name: k.replace(/_/g, ' ').slice(0, 18), value: parseFloat((v * 100).toFixed(1)) }))
  return (
    <ResponsiveContainer width="100%" height={130}>
      <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
        <XAxis type="number" tick={{ fill: '#6b7494', fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} unit="%" />
        <YAxis type="category" dataKey="name" tick={{ fill: '#6b7494', fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} width={115} />
        <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.8rem' }} />
        <Bar dataKey="value" fill="#7c6af0" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function Predictions() {
  const [appointments, setAppointments] = useState([])
  const [predictions, setPredictions] = useState({})
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [predicting, setPredicting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { loadAppointments() }, [])

  async function loadAppointments() {
    setLoading(true); setError(null)
    try {
      const data = await api.listAppointments('CLINIC_001')
      setAppointments(data.slice(0, 10))
      if (data.length > 0) { await runPrediction(data[0].id); setSelected(data[0].id) }
    } catch (e) {
      setError('Could not load appointments. Is the backend running on port 8002?')
    } finally { setLoading(false) }
  }

  async function runPrediction(id) {
    if (predictions[id]) { setSelected(id); return }
    setPredicting(true)
    try {
      const pred = await api.predict(id)
      setPredictions(prev => ({ ...prev, [id]: pred }))
      setSelected(id)
    } catch (e) { console.error('Prediction failed', e) }
    finally { setPredicting(false) }
  }

  const pred = selected ? predictions[selected] : null
  const riskColor = pred ? RISK_COLORS[pred.risk_tier] : 'var(--acc)'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', padding: '3rem' }}>
      <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading live appointments...
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--danger)', padding: '3rem' }}>
      <AlertCircle size={16} /> {error}
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
          Prediction <span style={{ color: 'var(--accent)' }}>Engine</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: '0.875rem' }}>
          Live XGBoost predictions · {appointments.length} appointments loaded from API
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {appointments.map((appt) => {
            const p = predictions[appt.id]
            const isSelected = selected === appt.id
            return (
              <button key={appt.id} onClick={() => runPrediction(appt.id)} style={{
                background: isSelected ? 'rgba(0,229,176,0.06)' : 'var(--surface)',
                border: isSelected ? '1px solid rgba(0,229,176,0.2)' : '1px solid var(--border)',
                borderRadius: 10, padding: '0.875rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <div style={{ fontSize: '0.65rem', fontFamily: 'DM Mono', color: 'var(--text-muted)', marginBottom: 4 }}>
                  {appt.id.slice(0, 8)}...
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  {appt.appointment_type?.replace('_', ' ')} · {appt.patient_age_group}
                </div>
                {p ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem', fontFamily: 'DM Mono', fontWeight: 700, background: `${RISK_COLORS[p.risk_tier]}15`, color: RISK_COLORS[p.risk_tier], border: `1px solid ${RISK_COLORS[p.risk_tier]}30` }}>
                      {p.risk_tier.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: RISK_COLORS[p.risk_tier] }}>
                      {(p.no_show_probability * 100).toFixed(0)}%
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'DM Mono' }}>click to predict</div>
                )}
              </button>
            )
          })}
        </div>

        <div>
          {predicting && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', padding: '2rem' }}>
              <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Running prediction...
            </div>
          )}
          {pred && !predicting && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '2rem', background: `linear-gradient(135deg, var(--surface) 0%, ${riskColor}08 100%)`, borderColor: `${riskColor}25` }}>
                <RiskGauge prob={pred.no_show_probability} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.65rem', fontFamily: 'DM Mono', color: 'var(--text-muted)', marginBottom: 6 }}>
                    LIVE · {new Date(pred.predicted_at).toLocaleTimeString()}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ padding: '4px 12px', borderRadius: 6, fontSize: '0.75rem', fontFamily: 'DM Mono', fontWeight: 700, background: `${riskColor}15`, color: riskColor, border: `1px solid ${riskColor}30` }}>
                      {RISK_LABELS[pred.risk_tier]}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 6 }}>
                    Recommended: <span style={{ color: IV_COLORS[pred.recommended_intervention] }}>
                      {IV_ICONS[pred.recommended_intervention]} {pred.recommended_intervention.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    {pred.decision_rationale}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="card">
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Net Value by Intervention</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'DM Mono', marginBottom: '0.75rem' }}>UPLIFT × REVENUE − COST</div>
                  <UpliftBar estimates={pred.uplift_estimates} />
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {pred.uplift_estimates.map(u => (
                      <div key={u.intervention} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'DM Mono', padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ color: IV_COLORS[u.intervention] }}>{u.intervention.toUpperCase()}</span>
                        <span>Δ{(u.delta_noshowprob * 100).toFixed(1)}% | <span style={{ color: u.net_value_usd > 0 ? '#00e5b0' : '#ff4d6d' }}>Net ${u.net_value_usd}</span></span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Feature Importances</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'DM Mono', marginBottom: '0.75rem' }}>MODEL ATTRIBUTION (%)</div>
                  <FeatureChart importances={pred.feature_importances} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}