import { useState, useEffect, useCallback } from 'react';
import Constants from 'expo-constants';

const CURRENT_BUILD = (Constants.expoConfig?.extra as any)?.buildNumber || 0;

interface CheckResult {
  updateAvailable: boolean;
  latestBuild: number | null;
  latestUrl: string | null;
}

export function useAppUpdate() {
  const [latestBuild, setLatestBuild] = useState<number | null>(null);
  const [latestUrl, setLatestUrl] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const updateAvailable = latestBuild !== null && latestBuild > CURRENT_BUILD;

  const check = useCallback(async (): Promise<CheckResult> => {
    setChecking(true);
    try {
      const res = await fetch('https://www.sahla4eco.com/api/mobile/download');
      if (res.ok) {
        const data = await res.json();
        if (data.build_number && data.download_url) {
          setLatestBuild(data.build_number);
          setLatestUrl(data.download_url);
          const avail = data.build_number > CURRENT_BUILD;
          return { updateAvailable: avail, latestBuild: data.build_number, latestUrl: data.download_url };
        }
      }
    } catch {
      // silent
    } finally {
      setChecking(false);
    }
    return { updateAvailable: false, latestBuild: null, latestUrl: null };
  }, []);

  useEffect(() => { check(); }, []);

  return { updateAvailable, latestBuild, latestUrl, checking, check, CURRENT_BUILD };
}
