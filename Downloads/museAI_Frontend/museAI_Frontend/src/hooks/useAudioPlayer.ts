import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Only one MuseAI player plays at a time. */
const PLAY_EVENT = 'museai:player-play';

export interface AudioPlayerControls {
  playing: boolean;
  currentTime: number;
  duration: number;
  ready: boolean;
  error: string | null;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (t: number) => void;
  element: HTMLAudioElement;
}

export function useAudioPlayer(src: string | null | undefined, knownDuration?: number): AudioPlayerControls {
  const element = useMemo(() => new Audio(), []);
  const idRef = useRef(Math.random().toString(36));
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(knownDuration ?? 0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    element.preload = 'metadata';
    let raf = 0;
    const tick = () => {
      setCurrentTime(element.currentTime);
      if (!element.paused) raf = requestAnimationFrame(tick);
    };
    const onPlay = () => {
      setPlaying(true);
      window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: idRef.current }));
      raf = requestAnimationFrame(tick);
    };
    const onPause = () => { setPlaying(false); cancelAnimationFrame(raf); setCurrentTime(element.currentTime); };
    const onMeta = () => { if (Number.isFinite(element.duration)) setDuration(element.duration); setReady(true); };
    const onTime = () => setCurrentTime(element.currentTime);
    const onErr = () => setError('Playback failed for this audio.');
    const onOther = (e: Event) => { if ((e as CustomEvent).detail !== idRef.current) element.pause(); };
    element.addEventListener('play', onPlay);
    element.addEventListener('pause', onPause);
    element.addEventListener('ended', onPause);
    element.addEventListener('loadedmetadata', onMeta);
    element.addEventListener('timeupdate', onTime);
    element.addEventListener('error', onErr);
    window.addEventListener(PLAY_EVENT, onOther);
    return () => {
      cancelAnimationFrame(raf);
      element.removeEventListener('play', onPlay);
      element.removeEventListener('pause', onPause);
      element.removeEventListener('ended', onPause);
      element.removeEventListener('loadedmetadata', onMeta);
      element.removeEventListener('timeupdate', onTime);
      element.removeEventListener('error', onErr);
      window.removeEventListener(PLAY_EVENT, onOther);
    };
  }, [element]);

  useEffect(() => {
    element.pause();
    setReady(false);
    setError(null);
    setCurrentTime(0);
    if (src) {
      element.src = src;
      element.load();
    } else {
      element.removeAttribute('src');
    }
  }, [element, src]);

  useEffect(() => { if (knownDuration) setDuration(knownDuration); }, [knownDuration]);
  useEffect(() => () => { element.pause(); }, [element]);

  const play = useCallback(() => { element.play().catch(() => setError('Playback was blocked or failed.')); }, [element]);
  const pause = useCallback(() => element.pause(), [element]);
  const toggle = useCallback(() => (element.paused ? play() : pause()), [element, play, pause]);
  const seek = useCallback((t: number) => {
    const d = Number.isFinite(element.duration) ? element.duration : duration;
    element.currentTime = Math.max(0, Math.min(d || 0, t));
    setCurrentTime(element.currentTime);
  }, [element, duration]);

  return { playing, currentTime, duration, ready, error, play, pause, toggle, seek, element };
}
