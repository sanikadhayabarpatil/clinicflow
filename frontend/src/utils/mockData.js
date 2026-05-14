// Mock data for frontend-only demo mode
export const MOCK_PREDICTIONS = [
  {
    appointment_id: "A001", no_show_probability: 0.72, risk_tier: "high",
    recommended_intervention: "call",
    uplift_estimates: [
      { intervention: "sms", delta_noshowprob: 0.08, expected_gain_usd: 12.0, intervention_cost_usd: 0.05, net_value_usd: 11.95 },
      { intervention: "call", delta_noshowprob: 0.15, expected_gain_usd: 22.5, intervention_cost_usd: 0.50, net_value_usd: 22.0 },
      { intervention: "overbook", delta_noshowprob: 0.12, expected_gain_usd: 18.0, intervention_cost_usd: 2.0, net_value_usd: 16.0 },
    ],
    feature_importances: { historical_noshow_rate: 0.38, lead_time_days: 0.22, hour_of_day: 0.12, day_of_week: 0.10, clinic_load_pct: 0.09, has_chronic_condition: 0.05, prior_appointments: 0.04 },
    decision_rationale: "No-show probability: 72% (high risk). Top factors: historical no-show rate (38%), lead time (22%), hour of day (12%). Decision: a phone call is warranted given the high no-show risk.",
    predicted_at: new Date().toISOString(),
  },
  {
    appointment_id: "A002", no_show_probability: 0.23, risk_tier: "medium",
    recommended_intervention: "sms",
    uplift_estimates: [
      { intervention: "sms", delta_noshowprob: 0.08, expected_gain_usd: 12.0, intervention_cost_usd: 0.05, net_value_usd: 11.95 },
      { intervention: "call", delta_noshowprob: 0.11, expected_gain_usd: 16.5, intervention_cost_usd: 0.50, net_value_usd: 16.0 },
      { intervention: "overbook", delta_noshowprob: 0.06, expected_gain_usd: 9.0, intervention_cost_usd: 2.0, net_value_usd: 7.0 },
    ],
    feature_importances: { historical_noshow_rate: 0.28, lead_time_days: 0.25, day_of_week: 0.18, clinic_load_pct: 0.14, hour_of_day: 0.08, prior_appointments: 0.04, has_chronic_condition: 0.03 },
    decision_rationale: "No-show probability: 23% (medium risk). Top factors: historical no-show rate (28%), lead time (25%), day of week (18%). Decision: an SMS reminder is the most cost-effective intervention.",
    predicted_at: new Date().toISOString(),
  },
  {
    appointment_id: "A003", no_show_probability: 0.08, risk_tier: "low",
    recommended_intervention: "none",
    uplift_estimates: [
      { intervention: "sms", delta_noshowprob: 0.03, expected_gain_usd: 4.5, intervention_cost_usd: 0.05, net_value_usd: 4.45 },
      { intervention: "call", delta_noshowprob: 0.05, expected_gain_usd: 7.5, intervention_cost_usd: 0.50, net_value_usd: 7.0 },
      { intervention: "overbook", delta_noshowprob: 0.02, expected_gain_usd: 3.0, intervention_cost_usd: 2.0, net_value_usd: 1.0 },
    ],
    feature_importances: { historical_noshow_rate: 0.15, lead_time_days: 0.20, day_of_week: 0.22, clinic_load_pct: 0.18, hour_of_day: 0.12, prior_appointments: 0.08, has_chronic_condition: 0.05 },
    decision_rationale: "No-show probability: 8% (low risk). Top factors: day of week (22%), lead time (20%), clinic load (18%). Decision: no action is cost-effective at this risk level.",
    predicted_at: new Date().toISOString(),
  },
]

export const MOCK_MONITORING = {
  model_version: "20240515_1430",
  total_predictions_7d: 825,
  avg_no_show_prob_7d: 0.23,
  intervention_distribution: { none: 412, sms: 287, call: 95, overbook: 31 },
  psi_reports: [
    { feature: "historical_noshow_rate", psi_score: 0.18, status: "alert" },
    { feature: "lead_time_days", psi_score: 0.07, status: "stable" },
    { feature: "clinic_load_pct", psi_score: 0.05, status: "stable" },
    { feature: "day_of_week", psi_score: 0.03, status: "stable" },
    { feature: "hour_of_day", psi_score: 0.04, status: "stable" },
    { feature: "prior_appointments", psi_score: 0.02, status: "stable" },
  ],
  fairness_reports: [
    { subgroup: "18-30", attribute: "patient_age_group", auroc: 0.791, brier_score: 0.158, calibration_error: 0.042, n_samples: 1240 },
    { subgroup: "31-45", attribute: "patient_age_group", auroc: 0.823, brier_score: 0.141, calibration_error: 0.031, n_samples: 2180 },
    { subgroup: "46-60", attribute: "patient_age_group", auroc: 0.836, brier_score: 0.135, calibration_error: 0.028, n_samples: 1890 },
    { subgroup: "61+",   attribute: "patient_age_group", auroc: 0.818, brier_score: 0.147, calibration_error: 0.035, n_samples: 1540 },
  ],
}

export const WEEKLY_TREND = [
  { day: "Mon", predictions: 142, noshows: 31, interventions: 58 },
  { day: "Tue", predictions: 158, noshows: 28, interventions: 64 },
  { day: "Wed", predictions: 134, noshows: 35, interventions: 52 },
  { day: "Thu", predictions: 167, noshows: 29, interventions: 71 },
  { day: "Fri", predictions: 121, noshows: 41, interventions: 48 },
  { day: "Sat", predictions: 63,  noshows: 22, interventions: 26 },
  { day: "Sun", predictions: 40,  noshows: 18, interventions: 15 },
]
