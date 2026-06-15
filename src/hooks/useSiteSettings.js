import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

let cached = null;
const listeners = new Set();

export function useSiteSettings() {
  const [settings, setSettings] = useState(cached);

  useEffect(() => {
    if (cached) { setSettings(cached); return; }
    base44.entities.SiteSettings.filter({ key: 'main' }).then(data => {
      if (data.length) {
        cached = data[0];
        setSettings(cached);
        listeners.forEach(fn => fn(cached));
      }
    });
  }, []);

  return settings;
}