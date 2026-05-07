import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  // Get locale from localStorage (client-side) or default to 'en'
  const locale = 'en'; // Server default, client will override
  
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});