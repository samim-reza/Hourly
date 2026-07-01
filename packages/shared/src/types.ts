export type UserRole = 'freelancer' | 'client';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  hourly_rate: number;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  client_id: string | null;
  freelancer_id: string;
  created_at: string;
}

export type TimeEntryStatus = 'running' | 'paused' | 'stopped';

export interface TimeEntry {
  id: string;
  project_id: string;
  user_id: string;
  start: string;
  end: string | null;
  duration_seconds: number;
  memo: string | null;
  status: TimeEntryStatus;
  created_at: string;
}

export interface Screenshot {
  id: string;
  time_entry_id: string;
  storage_path: string;
  taken_at: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  time_entry_id: string;
  interval_start: string;
  keys_count: number;
  clicks_count: number;
  activity_percent: number;
  created_at: string;
}

export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  startedAt: number | null;
  pausedAt: number | null;
  accumulatedMs: number;
  projectId: string | null;
  timeEntryId: string | null;
  memo: string;
}

export interface ActivitySnapshot {
  keysCount: number;
  clicksCount: number;
  activityPercent: number;
}
