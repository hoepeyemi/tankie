import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type { LeaderboardEntry, UserInfo } from '../../shared/types';

export const api = new Hono();

import { getRankIndex, RANK_NAMES } from '../../shared/ranks';

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

// GET /api/profile — current player's own stats (no top-20 limitation)
api.get('/profile', async (c) => {
  const username = context.username;
  if (!username) return c.json({ error: 'Not logged in' }, 401);
  const data = await redis.hGetAll(`player:${username}`);
  return c.json({
    username,
    kills: Number(data['kills'] ?? 0),
    deaths: Number(data['deaths'] ?? 0),
    xp: Number(data['xp'] ?? 0),
    matches: Number(data['matches'] ?? 0),
  });
});

api.post('/score', async (c) => {
  const username = context.username;
  if (!username) return c.json({ error: 'Not logged in' }, 401);

  // Rate limit: 1 score submission per 3 minutes per player
  const rlKey = `rl:score:${username}`;
  const rlCount = await redis.incrBy(rlKey, 1);
  if (rlCount === 1) await redis.expire(rlKey, 180);
  if (rlCount > 1) return c.json({ error: 'Too many requests' }, 429);

  const raw = await c.req.json<{ kills: unknown; deaths: unknown; xp: unknown }>();
  const kills = Number(raw.kills);
  const deaths = Number(raw.deaths);
  const xp = Number(raw.xp);

  if (!Number.isFinite(kills) || !Number.isFinite(deaths) || !Number.isFinite(xp)) {
    return c.json({ error: 'Invalid score values' }, 400);
  }

  // Cap values to realistic per-match maximums
  const safeKills = Math.max(0, Math.min(Math.floor(kills), 50));
  const safeDeaths = Math.max(0, Math.min(Math.floor(deaths), 50));
  const safeXp = Math.max(0, Math.min(Math.floor(xp), 5000));

  const key = `player:${username}`;
  const prev = await redis.hGetAll(key);
  const oldXp = Number(prev['xp'] ?? 0);
  const totalXp = oldXp + safeXp;

  await redis.hSet(key, {
    kills: String(Number(prev['kills'] ?? 0) + safeKills),
    deaths: String(Number(prev['deaths'] ?? 0) + safeDeaths),
    xp: String(totalXp),
    matches: String(Number(prev['matches'] ?? 0) + 1),
  });
  await redis.zAdd('lb:xp', { member: username, score: totalXp });

  // On rank-up: update subreddit flair + post a comment on the thread
  const oldRank = getRankIndex(oldXp);
  const newRank = getRankIndex(totalXp);
  if (newRank > oldRank) {
    const rankKey = `rank:${username}`;
    const storedRank = Number(await redis.get(rankKey) ?? -1);
    if (newRank > storedRank) {
      await redis.set(rankKey, String(newRank));
      const rankLabel = `${RANK_NAMES[newRank]} · ${totalXp} XP`;
      // Set user flair to show their rank in the subreddit
      await reddit.setUserFlair({
        subredditName: context.subredditName,
        username,
        text: rankLabel,
      }).catch(() => {});
      // Post a comment on the game post announcing the rank-up
      if (context.postId) {
        await reddit.submitComment({
          id: context.postId,
          text: `🎖️ **u/${username}** just ranked up to **${RANK_NAMES[newRank]}** in Blast Tanks! (${totalXp.toLocaleString()} XP)`,
        }).catch(() => {});
      }
    }
  }

  return c.json({ ok: true });
});

api.get('/skins', async (c) => {
  const username = context.username;
  if (!username) return c.json({ skins: [] });
  const raw = await redis.get(`skins:${username}`);
  const skins = raw ? raw.split(',').filter(Boolean) : [];
  return c.json({ skins });
});
