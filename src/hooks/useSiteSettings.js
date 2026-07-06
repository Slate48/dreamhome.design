import { useState, useEffect } from 'react';
import { publicContent } from '@/api/publicContent';

let cached = null;
const listeners = new Set();

export function useSiteSettings() {
  const [settings, setSettings] = useState(cached);

  useEffect(() => {
    if (cached) { setSettings(cached); return; }
    publicContent.SiteSettings.filter({ key: 'main' }).then(data => {
      if (data.length) {
        cached = data[0];
        setSettings(cached);
        listeners.forEach(fn => fn(cached));
      }
    });
  }, []);

  return settings;
}