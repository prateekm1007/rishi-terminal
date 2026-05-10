'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  loadAlerts, saveAlerts, createAlert, deleteAlert, toggleAlert,
  checkAlerts, getAlertTypeLabel, getAlertEmoji,
  type Alert, type AlertType,
} from '../../lib/alerts/alertEngine';
import { useLivePrices } from '../../hooks/useLivePrices';

const ALERT_TYPES: AlertType[] = [
  'price_above', 'price_below', 'percent_change_up',
  'percent_change_down', 'rishi_score_above', 'rishi_score_below',
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [formSymbol, setFormSymbol] = useState('');
  const [formType, setFormType] = useState<AlertType>('price_above');
  const [formValue, setFormValue] = useState('');
  const [formNote, setFormNote] = useState('');
  const [triggeredToday, setTriggeredToday] = useState<Alert[]>([]);

  useEffect(() => {
    setAlerts(loadAlerts());
  }, []);

  const symbols = useMemo(() => {
    const unique = [...new Set(alerts.map(a => a.symbol))];
    return unique;
  }, [alerts]);

  const { prices, lastUpdated } = useLivePrices(symbols);

  // Check alerts against live prices
  useEffect(() => {
    if (Object.keys(prices).length === 0) return;
    const triggered = checkAlerts(alerts, prices);
    if (triggered.length > 0) {
      setTriggeredToday(prev => [...prev, ...triggered]);
      // Mark as triggered in storage
      const updated = alerts.map(a => {
        const t = triggered.find(tr => tr.id === a.id);
        return t ? { ...a, triggered: true, triggeredAt: t.triggeredAt } : a;
      });
      saveAlerts(updated);
      setAlerts(updated);
    }
  }, [prices]);

  function handleCreate() {
    if (!formSymbol || !formValue) return;
    createAlert(formSymbol, formType, Number(formValue), formNote || undefined);
    setAlerts(loadAlerts());
    setFormSymbol(''); setFormType('price_above'); setFormValue(''); setFormNote('');
    setShowAdd(false);
  }

  function handleDelete(id: string) {
    deleteAlert(id);
    setAlerts(loadAlerts());
  }

  function handleToggle(id: string) {
    toggleAlert(id);
    setAlerts(loadAlerts());
  }

  const activeAlerts = alerts.filter(a => a.isActive && !a.triggered);
  const triggeredAlerts = alerts.filter(a => a.triggered);
  const pausedAlerts = alerts.filter(a => !a.isActive && !a.triggered);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '32px 24px', color: 'var(--text-primary)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 36, color: 'var(--text-primary)', marginBottom: 8 }}>
              🔔 Price Alerts
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Multi-condition alerts — price targets, % moves, Rishi score changes
            </p>
            {lastUpdated && (
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 8 }}>
                ⚡ Live · Last checked {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              padding: '12px 24px', borderRadius: 10,
              background: 'linear-gradient(135deg,#A88B20,#D4AF37)',
              border: 'none', color: '#0A0F1C', fontWeight: 700,
              fontSize: 14, cursor: 'pointer',
            }}
          >
            + New Alert
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'ACTIVE', count: activeAlerts.length, color: '#22C55E' },
            { label: 'TRIGGERED TODAY', count: triggeredToday.length, color: '#F59E0B' },
            { label: 'PAUSED', count: pausedAlerts.length, color: '#64748B' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(30,41,59,0.8)',
              borderRadius: 12, padding: '20px 24px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: '0.1em', marginBottom: 8 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>
                {s.count}
              </div>
            </div>
          ))}
        </div>

        {/* Triggered Banner */}
        {triggeredToday.length > 0 && (
          <div style={{
            marginBottom: 24, padding: '16px 20px', borderRadius: 12,
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', marginBottom: 8 }}>
              🔔 {triggeredToday.length} Alert{triggeredToday.length > 1 ? 's' : ''} Triggered
            </div>
            {triggeredToday.map(a => (
              <div key={a.id} style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>
                {getAlertEmoji(a.type)} <strong style={{ color: '#F8FAFC' }}>{a.symbol}</strong>{' '}
                {getAlertTypeLabel(a.type)} {a.targetValue}
                {a.currentValue ? ` — Current: ${a.currentValue.toFixed(2)}` : ''}
              </div>
            ))}
          </div>
        )}

        {/* Alert Lists */}
        {alerts.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            color: '#64748B', fontSize: 14,
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔔</div>
            <div>No alerts yet. Create one to get notified on price moves.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alerts.map(alert => {
              const livePrice = prices[alert.symbol]?.price;
              const isClose = livePrice && alert.type === 'price_above'
                ? livePrice >= alert.targetValue * 0.98
                : livePrice && alert.type === 'price_below'
                ? livePrice <= alert.targetValue * 1.02
                : false;

              return (
                <div key={alert.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '16px 20px', borderRadius: 12,
                  background: alert.triggered
                    ? 'rgba(245,158,11,0.08)'
                    : alert.isActive
                    ? 'rgba(17,24,39,0.85)'
                    : 'rgba(17,24,39,0.4)',
                  border: `1px solid ${alert.triggered ? 'rgba(245,158,11,0.3)' : alert.isActive ? 'rgba(30,41,59,0.8)' : 'rgba(51,65,85,0.3)'}`,
                }}>
                  <div style={{ fontSize: 20 }}>{getAlertEmoji(alert.type)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#D4AF37', fontFamily: 'monospace' }}>
                        {alert.symbol}
                      </span>
                      <span style={{ fontSize: 12, color: '#94A3B8' }}>
                        {getAlertTypeLabel(alert.type)} {alert.targetValue}
                      </span>
                      {isClose && !alert.triggered && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 6px',
                          borderRadius: 4, background: 'rgba(245,158,11,0.15)',
                          color: '#F59E0B',
                        }}>
                          CLOSE
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', display: 'flex', gap: 12 }}>
                      {livePrice && (
                        <span>Live: {livePrice.toFixed(2)}</span>
                      )}
                      {alert.note && <span>· {alert.note}</span>}
                      {alert.triggered && alert.triggeredAt && (
                        <span style={{ color: '#F59E0B' }}>
                          · Triggered {new Date(alert.triggeredAt).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    {!alert.triggered && (
                      <button
                        onClick={() => handleToggle(alert.id)}
                        style={{
                          padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                          cursor: 'pointer',
                          background: alert.isActive ? 'rgba(51,65,85,0.5)' : 'rgba(34,197,94,0.1)',
                          border: alert.isActive ? '1px solid rgba(51,65,85,0.5)' : '1px solid rgba(34,197,94,0.3)',
                          color: alert.isActive ? '#64748B' : '#22C55E',
                        }}
                      >
                        {alert.isActive ? 'Pause' : 'Resume'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(alert.id)}
                      style={{
                        padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                        cursor: 'pointer',
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        color: '#EF4444',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Alert Modal */}
        {showAdd && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}>
            <div style={{
              background: '#0A0F1C', border: '1px solid rgba(212,175,55,0.3)',
              borderRadius: 16, padding: 28, width: '440px',
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#F8FAFC', marginBottom: 20 }}>
                🔔 New Alert
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#64748B', fontWeight: 700, display: 'block', marginBottom: 6 }}>SYMBOL</label>
                  <input
                    type="text" placeholder="e.g., TCS, RELIANCE, BTC"
                    value={formSymbol} onChange={e => setFormSymbol(e.target.value.toUpperCase())}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
                      background: 'rgba(17,24,39,0.8)', border: '1px solid rgba(51,65,85,0.6)',
                      color: '#F8FAFC', fontSize: 14,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#64748B', fontWeight: 700, display: 'block', marginBottom: 6 }}>ALERT TYPE</label>
                  <select
                    value={formType} onChange={e => setFormType(e.target.value as AlertType)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8,
                      background: 'rgba(17,24,39,0.8)', border: '1px solid rgba(51,65,85,0.6)',
                      color: '#F8FAFC', fontSize: 14,
                    }}
                  >
                    {ALERT_TYPES.map(t => (
                      <option key={t} value={t}>{getAlertEmoji(t)} {getAlertTypeLabel(t)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#64748B', fontWeight: 700, display: 'block', marginBottom: 6 }}>TARGET VALUE</label>
                  <input
                    type="number" placeholder={formType.includes('rishi') ? "Score (0-100)" : formType.includes('percent') ? "% change" : "Price ()"}
                    value={formValue} onChange={e => setFormValue(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
                      background: 'rgba(17,24,39,0.8)', border: '1px solid rgba(51,65,85,0.6)',
                      color: '#F8FAFC', fontSize: 14,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#64748B', fontWeight: 700, display: 'block', marginBottom: 6 }}>NOTE (OPTIONAL)</label>
                  <input
                    type="text" placeholder="e.g., Support level, take profit"
                    value={formNote} onChange={e => setFormNote(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
                      background: 'rgba(17,24,39,0.8)', border: '1px solid rgba(51,65,85,0.6)',
                      color: '#F8FAFC', fontSize: 14,
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleCreate}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 8,
                    background: 'linear-gradient(135deg,#A88B20,#D4AF37)',
                    border: 'none', color: '#0A0F1C', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  }}
                >
                  Create Alert
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 8,
                    background: 'rgba(31,41,59,0.6)', border: '1px solid rgba(51,65,85,0.4)',
                    color: '#64748B', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}