import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type { LeaderboardEntry, UserInfo } from '../../shared/types';

export const api = new Hono();

api.get('/me', async (c) => {
  const username = await reddit.getCurrentUsername();
  return c.json<UserInfo>({
    username: username ?? context.username ?? 'Guest',
    isLoggedIn: !!username,
  });
});

api.get('/leaderboard', async (c) => {
  const rows = await redis.zRange('lb:xp', 0, 19, { by: 'rank', reverse: true });
  const entries: LeaderboardEntry[] = [];
  for (const row of rows) {
    const data = await redis.hGetAll(`player:${row.member}`);
    entries.push({
      username: row.member,
      kills: Number(data['kills'] ?? 0),
      deaths: Number(data['deaths'] ?? 0),
      xp: Number(data['xp'] ?? 0),
      matches: Number(data['matches'] ?? 0),
    });
  }
  return c.json({ entries });
});

api.post('/score', async (c) => {
  const username = context.username;
  if (!username) return c.json({ error: 'Not logged in' }, 401);

  const { kills, deaths, xp } = await c.req.json<{ kills: number; deaths: number; xp: number }>();
  const key = `player:${username}`;
  const prev = await redis.hGetAll(key);
  const totalXp = Number(prev['xp'] ?? 0) + xp;

  await redis.hSet(key, {
    kills: String(Number(prev['kills'] ?? 0) + kills),
    deaths: String(Number(prev['deaths'] ?? 0) + deaths),
    xp: String(totalXp),
    matches: String(Number(prev['matches'] ?? 0) + 1),
  });
  await redis.zAdd('lb:xp', { member: username, score: totalXp });

  return c.json({ ok: true });
});

api.get('/skins', async (c) => {
  const username = context.username;
  if (!username) return c.json({ skins: [] });
  const skins = await redis.sMembers(`skins:${username}`);
  return c.json({ skins });
});
