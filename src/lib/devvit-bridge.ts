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

export type DailyChallenge = {
  id: string;
  type: 'kills' | 'survive' | 'wager_win' | 'matches';
  target: number;
  description: string;
  bonusXp: number;
};

export async function getDailyChallenge(): Promise<{ challenge: DailyChallenge; progress: number; completed: boolean; streak: number } | null> {
  try {
    return await api('/api/challenges/today');
  } catch { return null; }
}

export async function reportChallengeProgress(type: DailyChallenge['type'], amount: number): Promise<{ bonusAwarded: boolean; streak: number }> {
  if (!isInReddit()) return { bonusAwarded: false, streak: 0 };
  try {
    return await api('/api/challenges/progress', { method: 'POST', body: JSON.stringify({ type, amount }) });
  } catch { return { bonusAwarded: false, streak: 0 }; }
}

// Uses dedicated /api/profile endpoint — not limited to top-20 leaderboard
export async function getMyXp(): Promise<number> {
  if (!isInReddit()) return 999;
  try {
    const res = await api<{ xp: number }>('/api/profile');
    return res.xp ?? 0;
  } catch { return 0; }
}

export async function createWager(code: string, amount: number): Promise<{ ok: boolean; error?: string; hostXp?: number }> {
  if (!isInReddit()) return { ok: true, hostXp: 999 - amount };
  return api('/api/wager/create', { method: 'POST', body: JSON.stringify({ code, amount }) });
}

export async function joinWager(code: string): Promise<{ ok: boolean; error?: string; amount?: number; host?: string; challengerXp?: number }> {
  if (!isInReddit()) return { ok: true, amount: 50, host: 'TestHost' };
  return api('/api/wager/join', { method: 'POST', body: JSON.stringify({ code }) });
}

export async function getWagerInfo(code: string): Promise<{ host: string; challenger: string | null; amount: number; status: string } | null> {
  if (!isInReddit()) return null;
  try { return await api(`/api/wager/info/${code}`); } catch { return null; }
}

// hostWon: true if the host (current user who calls settle) won the match
export async function settleWager(code: string, hostWon: boolean): Promise<{ winner: string; prize: number } | null> {
  if (!isInReddit()) return null;
  return api('/api/wager/settle', { method: 'POST', body: JSON.stringify({ code, hostWon }) });
}

export async function cancelWager(code: string): Promise<void> {
  if (!isInReddit()) return;
  await api('/api/wager/cancel', { method: 'POST', body: JSON.stringify({ code }) }).catch(() => {});
}

export async function purchaseSkin(skinKey: string): Promise<boolean> {
  if (!isInReddit()) {
    console.log('[DevvitBridge] purchaseSkin (mock):', skinKey);
    return false;
  }
  const result = await purchase(`skin_${skinKey}`);
  return result.status === OrderResultStatus.STATUS_SUCCESS;
}
