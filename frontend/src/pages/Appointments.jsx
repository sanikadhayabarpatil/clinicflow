import { useState } from 'react'
import { Calendar, User, Clock, AlertCircle } from 'lucide-react'

const DEMO_APPOINTMENTS = [
  { id: 'A001', patient_id: 'P0042', clinic_id: 'CLINIC_001', appointment_type: 'specialist', patient_age_group: '31-45', has_chronic_condition: true, prior_noshows: 3, prior_appointments: 8, day_of_week: 0, hour_of_day: 9, clinic_load_pct: 0.85, risk: 'high', prob: 0.72 },
  { id: 'A002', patient_id: 'P0118', clinic_id: 'CLINIC_001', appointment_type: 'follow_up', patient_age_group: '61+', has_chronic_condition: true, prior_noshows: 1, prior_appointments: 12, day_of_week: 2, hour_of_day: 14, clinic_load_pct: 0.60, risk: 'medium', prob: 0.23 },
  { id: 'A003', patient_id: 'P0355', clinic_id: 'CLINIC_002', appointment_type: 'primary_care', patient_age_group: '18-30', has_chronic_condition: false, prior_noshows: 0, prior_appointments: 2, day_of_week: 3, hour_of_day: 11, clinic_load_pct: 0.72, risk: 'low', prob: 0.08 },
  { id: 'A004', patient_id: 'P0789', clinic_id: 'CLINIC_002', appointment_type: 'procedure', patient_age_group: '46-60', has_chronic_condition: false, prior_noshows: 0, prior_appointments: 6, day_of_week: 1, hour_of_day: 10, clinic_load_pct: 0.78, risk: 'low', prob: 0.11 },
  { id: 'A005', patient_id: 'P0234', clinic_id: 'CLINIC_001', appointment_type: 'telehealth', patient_age_group: '18-30', has_chronic_condition: false, prior_noshows: 4, prior_appointments: 7, day_of_week: 4, hour_of_day: 16, clinic_load_pct: 0.91, risk: 'critical', prob: 0.81 },
]

const RISK_COLORS = { low: '#00e5b0', medium: '#f59e0b', high: '#ff6b8a', critical: '#ff2d55' }
const IV_REC = { low: 'none', medium: 'sms', high: 'call', critical: 'call' }
const IV_ICONS = { none: '—', sms: '📱 SMS', call: '📞 Call', overbook: '🔄 Overbook' }

export default function Appointments() {
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? DEMO_APPOINTMENTS : DEMO_APPOINTMENTS.filter(a => a.risk === filter)

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
          Appointment <span style={{ color: 'var(--accent)' }}>Queue</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: '0.875rem' }}>
          Upcoming appointments with pre-computed risk scores and intervention recommendations
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
        {['all', 'critical', 'high', 'medium', 'low'].map(tier => (
          <button key={tier} onClick={() => setFilter(tier)} style={{
            padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
            fontFamily: 'DM Mono', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.05em',
            background: filter === tier ? (tier === 'all' ? 'rgba(0,229,176,0.12)' : `${RISK_COLORS[tier]}20`) : 'var(--surface)',
            color: filter === tier ? (tier === 'all' ? 'var(--accent)' : RISK_COLORS[tier]) : 'var(--text-muted)',
            border: filter === tier ? `1px solid ${tier === 'all' ? 'rgba(0,229,176,0.3)' : `${RISK_COLORS[tier]}40`}` : '1px solid var(--border)',
            transition: 'all 0.15s',
          }}>
            {tier.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
              {['Appointment', 'Patient', 'Type', 'Risk Score', 'Key Signals', 'Intervention'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--text-muted)', fontSize: '0.65rem', fontFamily: 'DM Mono', fontWeight: 600, letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((appt, i) => (
              <tr key={appt.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontFamily: 'DM Mono', fontSize: '0.75rem', color: 'var(--accent)' }}>{appt.id}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{appt.clinic_id}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontFamily: 'DM Mono', fontSize: '0.8rem' }}>{appt.patient_id}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{appt.patient_age_group} {appt.has_chronic_condition ? '· 🏥 chronic' : ''}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{appt.appointment_type.replace('_', ' ')}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ position: 'relative', width: 36, height: 36 }}>
                      <svg viewBox="0 0 36 36" style={{ width: 36, height: 36, transform: 'rotate(-90deg)' }}>
                        <circle cx={18} cy={18} r={15} fill="none" stroke="var(--border)" strokeWidth={3} />
                        <circle cx={18} cy={18} r={15} fill="none" stroke={RISK_COLORS[appt.risk]} strokeWidth={3}
                          strokeDasharray={`${appt.prob * 94.2} 94.2`} strokeLinecap="round" />
                      </svg>
                      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontFamily: 'DM Mono', fontWeight: 700, color: RISK_COLORS[appt.risk] }}>
                        {(appt.prob * 100).toFixed(0)}
                      </span>
                    </div>
                    <span className={`badge-${appt.risk}`} style={{ padding: '3px 8px', borderRadius: 4, fontSize: '0.62rem', fontFamily: 'DM Mono', fontWeight: 700 }}>
                      {appt.risk.toUpperCase()}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'DM Mono', lineHeight: 1.8 }}>
                    {appt.prior_noshows > 0 && <div style={{ color: '#ff6b8a' }}>↑ {appt.prior_noshows} prev no-shows</div>}
                    {appt.clinic_load_pct > 0.8 && <div style={{ color: '#f59e0b' }}>⚡ clinic at {(appt.clinic_load_pct * 100).toFixed(0)}% capacity</div>}
                    {appt.day_of_week === 4 && <div>Friday slot</div>}
                    {appt.hour_of_day >= 16 && <div>Late afternoon</div>}
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    display: 'inline-block', padding: '4px 12px', borderRadius: 6, fontSize: '0.72rem', fontFamily: 'DM Mono', fontWeight: 600,
                    background: `${RISK_COLORS[appt.risk]}15`, color: RISK_COLORS[appt.risk],
                    border: `1px solid ${RISK_COLORS[appt.risk]}30`,
                  }}>
                    {IV_ICONS[IV_REC[appt.risk]]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
