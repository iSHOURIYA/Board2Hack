import { useCallback, useMemo, useState } from 'react';
import { soundManager } from '../services/soundManager';

export const useSound = () => {
  const [enabled, setEnabledState] = useState(soundManager.isEnabled());

  const setEnabled = useCallback((next: boolean) => {
    soundManager.setEnabled(next);
    setEnabledState(next);
  }, []);

  const toggle = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
  }, [enabled, setEnabled]);

  const play = useCallback((event: Parameters<typeof soundManager.play>[0]) => {
    soundManager.play(event);
  }, []);

  const ambient = useMemo(() => ({
    start: () => soundManager.startAmbient(),
    stop: () => soundManager.stopAmbient(),
  }), []);

  return { enabled, setEnabled, toggle, play, ambient };
};
