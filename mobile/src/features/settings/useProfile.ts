import { useCallback, useEffect, useState } from 'react';

import { loadProfile, saveProfile, type Profile } from '@/lib/db/profile-store';

// One hook for every Settings subscreen: the profile, read once on mount (off the render
// path), and `update`, which writes the change and reflects it — the screens have no
// Save button, so each tap is a save.

export function useProfile(): [Profile | null, (patch: Partial<Profile>) => void] {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setProfile(loadProfile()), 0);
    return () => clearTimeout(id);
  }, []);
  const update = useCallback((patch: Partial<Profile>) => {
    saveProfile(patch);
    setProfile(loadProfile());
  }, []);
  return [profile, update];
}
