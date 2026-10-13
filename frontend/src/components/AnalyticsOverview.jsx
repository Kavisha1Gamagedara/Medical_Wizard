import React from 'react';
import { Activity, BarChart2, TrendingUp, Users, Clock, ShieldCheck, HeartPulse } from 'lucide-react';

export default function AnalyticsOverview() {
  return (
    <div className="citycare-subpage-container">
      <div className="citycare-subpage-header">
        <div>
          <span className="citycare-subpage-badge">
            <Activity size={14} />
            Clinical Telemetry &amp; Performance
          </span>
          <h2>Hospital Intelligence &amp; Analytics</h2>
          <p>
            Real-time department efficiency, patient recovery rates, and bed occupancy telemetry.
          </p>
        </div>
      </div>

      {/* Analytics 3-Card Summary */}
      <div className="citycare-patient-metrics-row">
        <div className="citycare-metric-box">
          <span className="label">Bed Occupancy</span>
          <span className="val" style={{ color: '#0f172a' }}>86%</span>
          <span className="sub">128 of 150 Active Beds</span>
        </div>
        <div className="citycare-metric-box">
          <span className="label">Avg Patient Wait</span>
          <span className="val" style={{ color: '#0284c7' }}>13 min</span>
          <span className="sub">-4 min from last week</span>
        </div>
        <div className="citycare-metric-box">
          <span className="label">Care Efficiency</span>
          <span className="val" style={{ color: '#10b981' }}>92%</span>
          <span className="sub">Benchmark Target: 90%</span>
        </div>
        <div className="citycare-metric-box">
          <span className="label">Weekly Admissions</span>
          <span className="val" style={{ color: '#f59e0b' }}>1,740</span>
          <span className="sub">+12% surge handled</span>
        </div>
      </div>

      {/* Deep Dive Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '22px', marginTop: '10px' }}>
        {/* Dept Efficiency Breakdown */}
        <div className="citycare-stat-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
            Department Operational Index
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { name: 'Neurology Department', score: 97, patients: 72, color: '#22c55e' },
              { name: 'Cardiology Center', score: 95, patients: 87, color: '#06b6d4' },
              { name: 'Pediatric Care', score: 91, patients: 58, color: '#f59e0b' },
              { name: 'Dental & Oral Surgery', score: 89, patients: 64, color: '#8b5cf6' },
              { name: 'General Diagnostics', score: 94, patients: 112, color: '#3b82f6' },
            ].map((d) => (
              <div key={d.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                  <span style={{ color: '#1e293b' }}>{d.name}</span>
                  <span style={{ color: '#0f172a', fontWeight: 800 }}>{d.score}% ({d.patients} pts)</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${d.score}%`, height: '100%', background: d.color, borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clinical Alerts Telemetry */}
        <div className="citycare-stat-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
            Equipment &amp; Inventory Status
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Ventilators Active', value: '38/40 Operational', status: 'optimal' },
              { label: 'ICU Beds Occupancy', value: '92% Full', status: 'warning' },
              { label: 'Blood Bank Reserves', value: 'O- Negative Low', status: 'critical' },
              { label: 'MRI Scanner #2', value: 'Online & Calibrated', status: 'optimal' },
              { label: 'Oxygen Main Tank', value: '98% Pressure', status: 'optimal' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>{item.label}</span>
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: item.status === 'optimal' ? 'rgba(16, 185, 129, 0.15)' : (item.status === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(244, 63, 94, 0.15)'),
                  color: item.status === 'optimal' ? '#059669' : (item.status === 'warning' ? '#d97706' : '#e11d48')
                }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
