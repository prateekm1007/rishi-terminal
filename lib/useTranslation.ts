'use client';

import { useLanguage } from './language';
import { useEffect, useState } from 'react';

export function useTranslation() {
  const { t, locale, setLocale, isLoading } = useLanguage();
  const [, forceUpdate] = useState({});

  // Force re-render when locale changes
  useEffect(() => {
    forceUpdate({});
  }, [locale, isLoading]);

  return { t, locale, setLocale, isLoading };
}