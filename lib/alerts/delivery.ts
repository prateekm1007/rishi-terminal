// lib/alerts/delivery.ts (X3-08) — pluggable delivery with an honest
// no-provider gate.
//
// FD-5 (email/push/WhatsApp provider) is still a FOUNDER DECISION. Until
// it is made, delivery FAILS CLOSED in the honest direction: no provider
// is configured -> the event is recorded as 'skipped_no_provider', never
// as "sent" (Constitution 1/5: no stubbed success). The provider adapter
// surface below is what an FD-5 choice plugs into — one interface, one
// selection function, no vendor code shipped.
//
// Every email body MUST carry the unsubscribe link (founder acceptance),
// regardless of provider.

export interface AlertDeliveryPayload {
  to: string;
  subject: string;
  body: string;
  unsubscribeUrl: string;
}

export interface AlertDeliveryProvider {
  /** Vendor identifier for the delivery log (e.g. 'resend'). */
  readonly name: string;
  sendAlertEmail(payload: AlertDeliveryPayload): Promise<{
    ok: boolean;
    providerEventId?: string;
    error?: string;
  }>;
}

/**
 * The no-provider sentinel: explicit, named, and never mistaken for a
 * working delivery channel.
 */
export const NO_PROVIDER: AlertDeliveryProvider | null = null;

/** The configured provider, or null when FD-5 has not been decided.
 *  Selection is env-driven so an FD-5 decision lands as configuration,
 *  not code: ALERT_PROVIDER + the vendor's own credentials. */
export function getAlertProvider(): AlertDeliveryProvider | null {
  // FD-5 undecided: no vendor is wired. When the founder decides, this
  // function returns the matching adapter (one file, one switch arm).
  return null;
}

/** The unsubscribe URL that must appear in every delivery. */
export function buildUnsubscribeUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, '')}/api/alerts/unsubscribe?token=${encodeURIComponent(token)}`;
}

/** The alert email body — plain text, unsubscribe link first-class. */
export function buildAlertEmailBody(args: {
  symbol: string;
  kind: string;
  observed: number;
  threshold: number;
  unsubscribeUrl: string;
}): string {
  const describe: Record<string, string> = {
    price_above: 'rose above',
    price_below: 'fell below',
    score_above: 'rose above',
    score_below: 'fell below',
    filing_new: 'has a new filing',
  };
  const unit: Record<string, string> = {
    price_above: 'INR',
    price_below: 'INR',
    score_above: 'points',
    score_below: 'points',
    filing_new: '',
  };
  const verb = describe[args.kind] ?? 'triggered';
  const u = unit[args.kind] ?? '';
  const value =
    args.kind === 'filing_new'
      ? ''
      : `${args.observed} ${u} (threshold ${args.threshold} ${u})`;

  return [
    `Rishi Terminal alert`,
    ``,
    `${args.symbol} ${verb} ${value}`.trim(),
    ``,
    `Manage or stop these alerts:`,
    `${args.unsubscribeUrl}`,
    ``,
    `— Rishi Terminal`,
  ].join('\n');
}
