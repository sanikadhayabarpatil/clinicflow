const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  return res.json()
}

export const api = {
  health: () => req('/health'),
  seedDemo: (n = 20) => req(`/api/admin/seed-demo?n=${n}`, { method: 'POST' }),
  listAppointments: (clinicId) => req(`/api/appointments/clinic/${clinicId}`),
  createAppointment: (data) => req('/api/appointments/', { method: 'POST', body: JSON.stringify(data) }),
  predict: (appointmentId) => req(`/api/predictions/${appointmentId}`, { method: 'POST' }),
  predictClinic: (clinicId) => req(`/api/predictions/bulk/clinic/${clinicId}`, { method: 'POST' }),
  monitoring: () => req('/api/monitoring/dashboard'),
  modelInfo: () => req('/api/monitoring/model-info'),
  recordOutcome: (id, outcome) => req(`/api/appointments/${id}/outcome?outcome=${outcome}`, { method: 'PATCH' }),
}
