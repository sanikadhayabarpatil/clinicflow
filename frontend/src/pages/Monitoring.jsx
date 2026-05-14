import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, XCircle, BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, Cell } from 'recharts'
import { MOCK_MONITORING } from '../utils/mockData.js'

const PSI_STATUS_COLORS = { stable: '#00e5b0', alert: '#f59e0b', critical: '#ff4d6d' }
const PSI_STATUS_ICONS = { stable: CheckCircle, alert: AlertTriangle, critical: XCircle }

function PSICard({ report }) {
  const color = PSI_STATUS_COLORS[report.status]
  const Icon = PSI_STATUS_ICONS[report.status]
  const barPct = Math.min((report.psi_score / 0.3) * 100, 100)

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{report.feature.replace(/_/g, ' ')}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon size={13} color={color} />
          <span style={{ fontSize: '0.65rem', fontFamily: 'DM Mono', color }}>{report.status.toUpperCase()}</span>
        </div>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${barPct}%`, background: color, borderRadius: 3, transition: 'width 0.5s ease', boxShadow: `0 0 6px ${color}60` }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'DM Mono' }}>PSI: {report.psi_score}</span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'DM Mono' }}>
          {'< 0.1 stable · < 0.2 alert · > 0.2 critical'}
        </span>
      </div>
    </div>
  )
}

function FairnessTable({ reports }) {
  const maxAUROC = Math.max(...reports.map(r => r.auroc))
  const minAUROC = Math.min(...reports.map(r => r.auroc))
  const gap = ((maxAUROC - minAUROC) * 100).toFixed(1)

  return (
    <div>
      <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Per-Subgroup Fairness (Age Group)</span>
        <span style={{ fontSize: '0.7rem', fontFamily: 'DM Mono', color: parseFloat(gap) < 5 ? '#00e5b0' : '#f59e0b' }}>
          AUROC GAP: {gap}pp
        </span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Subgroup', 'AUROC', 'Brier', 'Cal. Error', 'N'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontSize: '0.65rem', fontFamily: 'DM Mono', fontWeight: 600, letterSpacing: '0.06em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {reports.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '8px', fontWeight: 700 }}>{r.subgroup}</td>
              <td style={{ padding: '8px', fontFamily: 'DM Mono' }}>
                <span style={{ color: r.auroc === maxAUROC ? '#00e5b0' : r.auroc === minAUROC ? '#f59e0b' : 'var(--text)' }}>
                  {r.auroc}
                </span>
              </td>
              <td style={{ padding: '8px', fontFamily: 'DM Mono', color: 'var(--text-muted)' }}>{r.brier_score}</td>
              <td style={{ padding: '8px', fontFamily: 'DM Mono', color: r.calibration_error > 0.04 ? '#f59e0b' : 'var(--text-muted)' }}>{r.calibration_error}</td>
              <td style={{ padding: '8px', fontFamily: 'DM Mono', color: 'var(--text-muted)' }}>{r.n_samples.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Monitoring() {
  const data = MOCK_MONITORING
  const alertCount = data.psi_reports.filter(r => r.status !== 'stable').length

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
          Model <span style={{ color: 'var(--accent)' }}>Monitoring</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: '0.875rem' }}>
          Feature drift · Fairness · Calibration · Governance
        </p>
      </div>

      {/* Model status bar */}
      <div className="card" style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', background: 'rgba(0,229,176,0.03)', borderColor: 'rgba(0,229,176,0.15)' }}>
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'DM Mono', letterSpacing: '0.08em' }}>MODEL VERSION</div>
          <div style={{ fontSize: '0.9rem', fontFamily: 'DM Mono', fontWeight: 500, marginTop: 2 }}>{data.model_version}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'DM Mono', letterSpacing: '0.08em' }}>PREDICTIONS (7D)</div>
          <div style={{ fontSize: '0.9rem', fontFamily: 'DM Mono', fontWeight: 500, marginTop: 2 }}>{data.total_predictions_7d.toLocaleString()}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'DM Mono', letterSpacing: '0.08em' }}>AVG NO-SHOW PROB</div>
          <div style={{ fontSize: '0.9rem', fontFamily: 'DM Mono', fontWeight: 500, marginTop: 2, color: '#00e5b0' }}>{(data.avg_no_show_prob_7d * 100).toFixed(1)}%</div>
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'DM Mono', letterSpacing: '0.08em' }}>DRIFT ALERTS</div>
          <div style={{ fontSize: '0.9rem', fontFamily: 'DM Mono', fontWeight: 500, marginTop: 2, color: alertCount > 0 ? '#f59e0b' : '#00e5b0' }}>{alertCount} FEATURE{alertCount !== 1 ? 'S' : ''}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* PSI grid */}
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            Feature Drift (PSI)
            {alertCount > 0 && (
              <span style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem', fontFamily: 'DM Mono' }}>
                {alertCount} ALERT
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.psi_reports.map((r, i) => <PSICard key={i} report={r} />)}
          </div>
        </div>

        {/* Fairness + audit */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <FairnessTable reports={data.fairness_reports} />
          </div>

          <div className="card" style={{ background: 'rgba(124,106,240,0.04)', borderColor: 'rgba(124,106,240,0.15)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem' }}>Governance Checklist</div>
            {[
              ['Calibrated probabilities', true],
              ['Temporal train/val split', true],
              ['Subgroup fairness analysis', true],
              ['Feature drift monitoring (PSI)', true],
              ['Full audit log of decisions', true],
              ['Model version pinning', true],
              ['Feedback loop (outcomes recording)', true],
            ].map(([item, done]) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: '0.78rem' }}>
                <CheckCircle size={13} color={done ? '#00e5b0' : '#6b7494'} />
                <span style={{ color: done ? 'var(--text)' : 'var(--text-muted)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
