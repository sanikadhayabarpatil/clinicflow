import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { Activity, BarChart3, Shield, Zap, ClipboardList } from 'lucide-react'
import Dashboard from './pages/Dashboard.jsx'
import Appointments from './pages/Appointments.jsx'
import Predictions from './pages/Predictions.jsx'
import Monitoring from './pages/Monitoring.jsx'

const NAV = [
  { to: '/', icon: BarChart3, label: 'Dashboard' },
  { to: '/appointments', icon: ClipboardList, label: 'Appointments' },
  { to: '/predictions', icon: Zap, label: 'Predict' },
  { to: '/monitoring', icon: Shield, label: 'Monitoring' },
]

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <aside style={{
          width: 220, background: 'var(--surface)', borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem', position: 'fixed',
          height: '100vh', zIndex: 100,
        }}>
          {/* Logo */}
          <div style={{ marginBottom: '2.5rem', paddingLeft: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={20} color="var(--accent)" />
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text)', letterSpacing: '-0.02em' }}>
                Clinic<span style={{ color: 'var(--accent)' }}>Flow</span>
              </span>
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4, fontFamily: 'DM Mono', paddingLeft: 28 }}>
              DECISION INTELLIGENCE
            </div>
          </div>

          {/* Nav */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {NAV.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10, padding: '0.6rem 0.75rem',
                borderRadius: 8, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600,
                transition: 'all 0.15s',
                background: isActive ? 'rgba(0,229,176,0.08)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                border: isActive ? '1px solid rgba(0,229,176,0.15)' : '1px solid transparent',
              })}>
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div style={{ marginTop: 'auto', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'DM Mono', lineHeight: 1.6 }}>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              MODEL v1.0<br />
              AUROC 0.823<br />
              <span style={{ color: 'var(--accent)' }}>● LIVE</span>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ marginLeft: 220, flex: 1, padding: '2rem', minHeight: '100vh' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/monitoring" element={<Monitoring />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
