'use client';
import { useLanguage } from '@/lib/language';

export function LegalDisclaimer() {
  const { t } = useLanguage();
  return (
    <div style={{
      borderTop: '1px solid rgba(30,41,59,0.8)',
      background: '#0A0F1C',
      padding: '24px 16px',
      textAlign: 'center',
      fontSize: '11px',
      color: '#64748B',
      lineHeight: 1.6,
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <strong style={{ color: '#D4AF37' }}>⚠️ Important Disclaimer:</strong> This is an educational and entertainment platform only.
        {t("legal.rishiDisclaimer")} <strong>{t("legal.fictional")}</strong> {t("legal.inspired")}
        and public statements of real investors. <strong>No investment advice is being given.</strong>{' '}
        Past performance is not indicative of future results. Always do your own research and consult a licensed financial advisor.
        <div style={{ marginTop: '12px', fontSize: '9px', opacity: 0.7 }}>
          Rishi Terminal © 2025 — Not affiliated with any living or deceased investor. All scores are algorithmic opinions, not recommendations.
        </div>
      </div>
    </div>
  );
}