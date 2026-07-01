import { useState, useEffect, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, uploadScreenshot, logActivity } from '@/lib/supabase';

interface TimerHook {
  elapsedMs: number;
  isRunning: boolean;
  isPaused: boolean;
  projectId: string | null;
  timeEntryId: string | null;
  memo: string;
  activityPercent: number;
  lastIdleWarning: boolean;
  setMemo: (memo: string) => void;
  setProjectId: (id: string) => void;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
}

export function useTimer(session: Session | null): TimerHook {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [timeEntryId, setTimeEntryId] = useState<string | null>(null);
  const [memo, setMemo] = useState('');
  const [activityPercent, setActivityPercent] = useState(0);
  const [lastIdleWarning, setLastIdleWarning] = useState(false);

  const startedAtRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTick = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  };

  const startTick = useCallback(() => {
    clearTick();
    tickRef.current = setInterval(() => {
      if (startedAtRef.current) {
        setElapsedMs(accumulatedRef.current + (Date.now() - startedAtRef.current));
      }
    }, 1000);
  }, []);

  useEffect(() => {
    if (!window.hourly) return;

    const unsubScreenshot = window.hourly.onScreenshot(async (path) => {
      if (timeEntryId && session?.user.id) {
        await uploadScreenshot(timeEntryId, path, session.user.id);
      }
    });

    const unsubActivity = window.hourly.onActivity(async (data) => {
      setActivityPercent(data.activityPercent);
      if (timeEntryId) {
        await logActivity(timeEntryId, data.keysCount, data.clicksCount, data.activityPercent);
      }
    });

    const unsubIdle = window.hourly.onIdle(async () => {
      if (isRunning && !isPaused) {
        setLastIdleWarning(true);
        await pause();
      }
    });

    const unsubTrayStart = window.hourly.onTrayStart(() => {
      if (!isRunning) start();
    });

    const unsubTrayStop = window.hourly.onTrayStop(() => {
      if (isRunning) stop();
    });

    return () => {
      unsubScreenshot();
      unsubActivity();
      unsubIdle();
      unsubTrayStart();
      unsubTrayStop();
    };
  }, [timeEntryId, session, isRunning, isPaused]);

  const start = async () => {
    if (!session || !projectId) return;

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        project_id: projectId,
        user_id: session.user.id,
        start: new Date().toISOString(),
        memo: memo || null,
        status: 'running',
      })
      .select()
      .single();

    if (error || !data) return;

    setTimeEntryId(data.id);
    setIsRunning(true);
    setIsPaused(false);
    setLastIdleWarning(false);
    startedAtRef.current = Date.now();
    accumulatedRef.current = 0;
    setElapsedMs(0);
    startTick();
    await window.hourly?.startTracking();
  };

  const pause = async () => {
    if (!timeEntryId || !isRunning || isPaused) return;

    if (startedAtRef.current) {
      accumulatedRef.current += Date.now() - startedAtRef.current;
      startedAtRef.current = null;
    }
    clearTick();
    setIsPaused(true);

    await supabase
      .from('time_entries')
      .update({ status: 'paused', duration_seconds: Math.floor(accumulatedRef.current / 1000) })
      .eq('id', timeEntryId);
  };

  const resume = async () => {
    if (!timeEntryId || !isPaused) return;

    startedAtRef.current = Date.now();
    setIsPaused(false);
    setLastIdleWarning(false);
    startTick();

    await supabase.from('time_entries').update({ status: 'running' }).eq('id', timeEntryId);
  };

  const stop = async () => {
    if (!timeEntryId) return;

    let totalMs = accumulatedRef.current;
    if (startedAtRef.current) {
      totalMs += Date.now() - startedAtRef.current;
    }

    clearTick();
    await window.hourly?.stopTracking();

    await supabase
      .from('time_entries')
      .update({
        status: 'stopped',
        end: new Date().toISOString(),
        duration_seconds: Math.floor(totalMs / 1000),
        memo: memo || null,
      })
      .eq('id', timeEntryId);

    setIsRunning(false);
    setIsPaused(false);
    setTimeEntryId(null);
    startedAtRef.current = null;
    accumulatedRef.current = 0;
    setElapsedMs(0);
    setActivityPercent(0);
  };

  return {
    elapsedMs,
    isRunning,
    isPaused,
    projectId,
    timeEntryId,
    memo,
    activityPercent,
    lastIdleWarning,
    setMemo,
    setProjectId,
    start,
    pause,
    resume,
    stop,
  };
}
