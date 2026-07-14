import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer, getServerPort, context } from '@devvit/web/server';
import { redis } from '@devvit/web/server';
import { reddit } from '@devvit/web/server';
import { payments } from '@devvit/web/server';

// ─── Types ────────────────────────────────────────────────────────────────────

type LeaderboardEntry = {
  username: string;
  kills: number;
  deaths: number;
  xp: number;
  matches: number;
};

// ─── Redis helpers ─────────────────────────────────────────────────────────────

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const rows = await redis.zRange('lb:xp', 0, 19, { by: 'rank', reverse: true });
  const entries: LeaderboardEntry[] = [];
  for (const row of rows) {
    const username = row.member;
    const data = await redis.hGetAll(`player:${username}`);
    entries.push({
      username,
      kills: Number(data.kills ?? 0),
      deaths: Number(data.deaths ?? 0),
      xp: Number(data.xp ?? 0),
      matches: Number(data.matches ?? 0),
    });
  }
  return entries;
}

async function submitScore(username: string, kills: number, deaths: number, xp: number): Promise<void> {
  const key = `player:${username}`;
  const prev = await redis.hGetAll(key);
  await redis.hSet(key, {
    kills: String(Number(prev.kills ?? 0) + kills),
    deaths: String(Number(prev.deaths ?? 0) + deaths),
    xp: String(Number(prev.xp ?? 0) + xp),
    matches: String(Number(prev.matches ?? 0) + 1),
  });
  await redis.zAdd('lb:xp', { member: username, score: Number(prev.xp ?? 0) + xp });
}

async function getOwnedSkins(username: string): Promise<string[]> {
  return redis.sMembers(`skins:${username}`);
}

async function unlockSkin(username: string, skinKey: string): Promise<void> {
  await redis.sAdd(`skins:${username}`, skinKey);
}

// ─── API routes (called by the React web view via fetch) ───────────────────────

const api = new Hono();

api.get('/me', async (c) => {
  const username = context.username ?? 'Guest';
  return c.json({ username, isLoggedIn: !!context.username });
});

api.get('/leaderboard', async (c) => {
  const entries = await getLeaderboard();
  return c.json({ entries });
});

api.post('/score', async (c) => {
  const username = context.username;
  if (!username) return c.json({ error: 'Not logged in' }, 401);
  const { kills, deaths, xp } = await c.req.json<{ kills: number; deaths: number; xp: number }>();
  await submitScore(username, kills, deaths, xp);
  return c.json({ ok: true });
});

api.get('/skins', async (c) => {
  const username = context.username;
  if (!username) return c.json({ skins: [] });
  const skins = await getOwnedSkins(username);
  return c.json({ skins });
});

// ─── Internal routes ──────────────────────────────────────────────────────────

const internal = new Hono();

internal.post('/menu/create-post', async (c) => {
  try {
    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitPost({
      title: 'Blast Tanks — Play Now! 💥',
      subredditName: subreddit.name,
      textFallback: { text: 'Click to play Blast Tanks — a 3D multiplayer tank battle game!' },
    });
    return c.json({ navigateTo: `https://reddit.com/r/${subreddit.name}/comments/${post.id}` });
  } catch (err) {
    console.error('[menu/create-post]', err);
    return c.json({ toast: 'Failed to create post' }, 400);
  }
});

internal.post('/payments/fulfill', async (c) => {
  try {
    const body = await c.req.json<{ orderId: string; sku: string }>();
    const username = context.username;
    if (!username) return c.json({ error: 'Not logged in' }, 401);
    const skinKey = body.sku.replace('skin_', '');
    await unlockSkin(username, skinKey);
    await payments.acknowledgeOrderDelivery(body.orderId);
    return c.json({ ok: true });
  } catch (err) {
    console.error('[payments/fulfill]', err);
    return c.json({ error: 'Fulfillment failed' }, 500);
  }
});

// ─── Server ───────────────────────────────────────────────────────────────────

const app = new Hono();
app.route('/api', api);
app.route('/internal', internal);

serve({
  fetch: app.fetch,
  createServer,
  port: getServerPort(),
});
