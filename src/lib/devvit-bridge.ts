// Devvit bridge — client-side fetch calls to the Devvit HTTP server.
// Falls back to mock data when running outside of a Reddit web view.
import { purchase, OrderResultStatus } from '@devvit/payments/client';
import type { LeaderboardEntry, UserInfo } from '@/shared/types';

export type { LeaderboardEntry, UserInfo };

// Detect if we're running inside a Reddit web view (iframe)
export const isInReddit = (): boolean =>
  typeof window !== 'undefined' && window.parent !== window;

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

// --- Public API ---

export async function getUserInfo(): Promise<UserInfo> {
  if (!isInReddit()) {
    return { username: 'RedditUser', isLoggedIn: false };
  }
  return api<UserInfo>('/api/me');
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!isInReddit()) {
    return [
      { username: 'TankCommander', kills: 42, deaths: 5, xp: 420, matches: 10 },
      { username: 'BlastKing', kills: 35, deaths: 12, xp: 350, matches: 8 },
      { username: 'ArmadilloX', kills: 28, deaths: 9, xp: 280, matches: 7 },
    ];
  }
  const res = await api<{ entries: LeaderboardEntry[] }>('/api/leaderboard');
  return res.entries;
}

export async function submitScore(kills: number, deaths: number, xp: number): Promise<void> {
  if (!isInReddit()) {
    console.log('[DevvitBridge] submitScore (mock):', { kills, deaths, xp });
    return;
  }
  await api('/api/score', {
    method: 'POST',
    body: JSON.stringify({ kills, deaths, xp }),
  });
}

export async function getOwnedSkins(): Promise<string[]> {
  if (!isInReddit()) {
    return ['default'];
  }
  const res = await api<{ skins: string[] }>('/api/skins');
  return res.skins;
}

export async function purchaseSkin(skinKey: string): Promise<boolean> {
  if (!isInReddit()) {
    console.log('[DevvitBridge] purchaseSkin (mock):', skinKey);
    return false;
  }
  const result = await purchase(`skin_${skinKey}`);
  return result.status === OrderResultStatus.STATUS_SUCCESS;
}
