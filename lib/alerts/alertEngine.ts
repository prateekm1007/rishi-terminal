// ============================================================
// ALERT ENGINE — Multi-condition price & Rishi score alerts
// ============================================================

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
    return raw ? JSON.parse(raw) : [];
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

export function checkAlerts(
  alerts: Alert[],
  prices: Record<string, { price: number; changePercent24h?: number; change?: number }>,
  rishiScores?: Record<string, number>
): Alert[] {
  const triggered: Alert[] = [];

  alerts.forEach(alert => {
    if (!alert.isActive || alert.triggered) return;
    const priceData = prices[alert.symbol];
    if (!priceData) return;

    const { price, changePercent24h, change } = priceData;
    let shouldTrigger = false;

    switch (alert.type) {
      case 'price_above':
        shouldTrigger = price >= alert.targetValue;
        break;
      case 'price_below':
        shouldTrigger = price <= alert.targetValue;
        break;
      case 'percent_change_up':
        shouldTrigger = (changePercent24h ?? change ?? 0) >= alert.targetValue;
        break;
      case 'percent_change_down':
        shouldTrigger = (changePercent24h ?? change ?? 0) <= -alert.targetValue;
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
        currentValue: price,
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