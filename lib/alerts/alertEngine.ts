// ============================================================
// ALERT ENGINE — Multi-condition price & Rishi score alerts
// ============================================================

import { resolveTickerAlias } from '../registry/tickerRegistry'; // N1: pure alias-chain migration (client-safe)

export type AlertType = 
  | 'price_above' 
  | 'price_below' 
  | 'percent_change_up' 
  | 'percent_change_down'
  | 'volume_spike'
  | 'rishi_score_above'
  | 'rishi_score_below';

export interface Alert {
  id: string;
  symbol: string;
  type: AlertType;
  targetValue: number;
  currentValue?: number;
  isActive: boolean;
  triggered: boolean;
  triggeredAt?: string;
  createdAt: string;
  note?: string;
}

const ALERTS_KEY = 'rishi_alerts';

export function loadAlerts(): Alert[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    if (!raw) return [];
    // T12: silently migrate renamed/legacy tickers to canonical symbols
    return (JSON.parse(raw) as Alert[]).map(a => {
      const canonical = resolveTickerAlias(a.symbol);
      return canonical && canonical !== a.symbol ? { ...a, symbol: canonical } : a;
    });
  } catch {
    return [];
  }
}

export function saveAlerts(alerts: Alert[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

export function createAlert(
  symbol: string,
  type: AlertType,
  targetValue: number,
  note?: string
): Alert {
  const alert: Alert = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
    symbol: symbol.toUpperCase(),
    type,
    targetValue,
    isActive: true,
    triggered: false,
    createdAt: new Date().toISOString(),
    note,
  };
  const alerts = loadAlerts();
  saveAlerts([...alerts, alert]);
  return alert;
}

export function deleteAlert(id: string): void {
  const alerts = loadAlerts().filter(a => a.id !== id);
  saveAlerts(alerts);
}

export function toggleAlert(id: string): void {
  const alerts = loadAlerts().map(a =>
    a.id === id ? { ...a, isActive: !a.isActive } : a
  );
  saveAlerts(alerts);
}

/** G6: a price snapshot may carry null for any field the provider did not
 *  report. An unobserved metric can never satisfy a comparison — the alert
 *  is skipped, never evaluated against a coerced 0 (a 0% move is a real
 *  observation; unavailability is not). */
export interface AlertPriceSnapshot {
  price: number | null;
  changePercent24h?: number | null;
  change?: number | null;
}

export function checkAlerts(
  alerts: Alert[],
  prices: Record<string, AlertPriceSnapshot>,
  rishiScores?: Record<string, number>
): Alert[] {
  const triggered: Alert[] = [];

  alerts.forEach(alert => {
    if (!alert.isActive || alert.triggered) return;
    const priceData = prices[alert.symbol];
    if (!priceData) return;

    const { price, changePercent24h } = priceData;
    let shouldTrigger = false;

    switch (alert.type) {
      case 'price_above':
        shouldTrigger = price !== null && price >= alert.targetValue;
        break;
      case 'price_below':
        shouldTrigger = price !== null && price <= alert.targetValue;
        break;
      // G6: only a genuinely reported percent change may trigger a percent
      // alert (the old `?? change ?? 0` chain coerced an unobserved move to
      // 0% and could falsely fire). An absolute Δ is never stand-in for a %.
      case 'percent_change_up':
        shouldTrigger = typeof changePercent24h === 'number' && changePercent24h >= alert.targetValue;
        break;
      case 'percent_change_down':
        shouldTrigger = typeof changePercent24h === 'number' && changePercent24h <= -alert.targetValue;
        break;
      case 'rishi_score_above':
        const scoreAbove = rishiScores?.[alert.symbol] ?? 0;
        shouldTrigger = scoreAbove >= alert.targetValue;
        break;
      case 'rishi_score_below':
        const scoreBelow = rishiScores?.[alert.symbol] ?? 100;
        shouldTrigger = scoreBelow <= alert.targetValue;
        break;
    }

    if (shouldTrigger) {
      triggered.push({
        ...alert,
        triggered: true,
        triggeredAt: new Date().toISOString(),
        currentValue: price ?? undefined,
      });
    }
  });

  return triggered;
}

export function getAlertTypeLabel(type: AlertType): string {
  const labels: Record<AlertType, string> = {
    price_above: 'Price Above',
    price_below: 'Price Below',
    percent_change_up: '% Change Up',
    percent_change_down: '% Change Down',
    volume_spike: 'Volume Spike',
    rishi_score_above: 'Rishi Score Above',
    rishi_score_below: 'Rishi Score Below',
  };
  return labels[type];
}

export function getAlertEmoji(type: AlertType): string {
  const emojis: Record<AlertType, string> = {
    price_above: '📈',
    price_below: '📉',
    percent_change_up: '🚀',
    percent_change_down: '💥',
    volume_spike: '📊',
    rishi_score_above: '🧘',
    rishi_score_below: '⚠️',
  };
  return emojis[type];
}