import { Hono } from 'hono';
import { redis, context } from '@devvit/web/server';

export const challengesRouter = new Hono();

export type ChallengeType = 'kills' | 'survive' | 'wager_win' | 'matches';

export type DailyChallenge = {
	id: string;
	type: ChallengeType;
	target: number;
	description: string;
	bonusXp: number;
};

// Deterministic daily challenge generation — no scheduler needed
function getDailyChallenge(dateStr: string): DailyChallenge {
	// Simple hash of the date string to pick challenge variant
	let hash = 0;
	for (const c of dateStr) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;

	const challenges: DailyChallenge[] = [
		{ id: `kills-${dateStr}`, type: 'kills', target: 5, description: 'Destroy 5 enemy tanks today', bonusXp: 100 },
		{ id: `kills-${dateStr}`, type: 'kills', target: 10, description: 'Destroy 10 enemy tanks today', bonusXp: 200 },
		{ id: `survive-${dateStr}`, type: 'survive', target: 120, description: 'Survive for 2 minutes in a single match', bonusXp: 150 },
		{ id: `survive-${dateStr}`, type: 'survive', target: 180, description: 'Survive for 3 minutes in a single match', bonusXp: 250 },
		{ id: `matches-${dateStr}`, type: 'matches', target: 3, description: 'Complete 3 matches today', bonusXp: 120 },
		{ id: `matches-${dateStr}`, type: 'matches', target: 5, description: 'Complete 5 matches today', bonusXp: 200 },
		{ id: `wager-${dateStr}`, type: 'wager_win', target: 1, description: 'Win a wager match today', bonusXp: 300 },
	];

	return challenges[hash % challenges.length];
}

function todayStr() {
	return new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
}

// GET /api/challenges/today — get today's challenge + user progress
challengesRouter.get('/today', async (c) => {
	const username = context.username;
	const date = todayStr();
	const challenge = getDailyChallenge(date);

	if (!username) {
		return c.json({ challenge, progress: 0, completed: false, streak: 0 });
	}

	const progressKey = `challenge:${date}:${username}`;
	const streakKey = `streak:${username}`;
	const lastPlayKey = `lastplay:${username}`;

	const [progressRaw, streakRaw, lastPlayRaw] = await Promise.all([
		redis.get(progressKey),
		redis.get(streakKey),
		redis.get(lastPlayKey),
	]);

	const progress = Number(progressRaw ?? 0);
	const streak = Number(streakRaw ?? 0);

	return c.json({
		challenge,
		progress,
		completed: progress >= challenge.target,
		streak,
		lastPlay: lastPlayRaw ?? null,
	});
});

// POST /api/challenges/progress — report progress toward today's challenge
challengesRouter.post('/progress', async (c) => {
	const username = context.username;
	if (!username) return c.json({ error: 'Not logged in' }, 401);

	const { type, amount } = await c.req.json<{ type: ChallengeType; amount: number }>();
	const date = todayStr();
	const challenge = getDailyChallenge(date);

	// Only track if the type matches today's challenge
	if (challenge.type !== type) {
		return c.json({ ok: true, progress: 0, completed: false, bonusAwarded: false });
	}

	const progressKey = `challenge:${date}:${username}`;
	const streakKey = `streak:${username}`;
	const lastPlayKey = `lastplay:${username}`;

	const prevProgress = Number(await redis.get(progressKey) ?? 0);
	const alreadyCompleted = prevProgress >= challenge.target;
	const newProgress = Math.min(prevProgress + amount, challenge.target);

	await redis.set(progressKey, String(newProgress));
	await redis.expire(progressKey, 172800); // 2 days TTL

	let bonusAwarded = false;
	if (!alreadyCompleted && newProgress >= challenge.target) {
		// Award bonus XP
		const playerData = await redis.hGetAll(`player:${username}`);
		const currentXp = Number(playerData['xp'] ?? 0) + challenge.bonusXp;
		await redis.hSet(`player:${username}`, { xp: String(currentXp) });
		await redis.zAdd('lb:xp', { member: username, score: currentXp });
		bonusAwarded = true;
	}

	// Update streak — if last play was yesterday, increment; if today, keep; if older, reset to 1
	const lastPlay = await redis.get(lastPlayKey);
	const yesterday = new Date();
	yesterday.setUTCDate(yesterday.getUTCDate() - 1);
	const yesterdayStr = yesterday.toISOString().slice(0, 10);

	let newStreak = 1;
	if (lastPlay === date) {
		newStreak = Number(await redis.get(streakKey) ?? 1);
	} else if (lastPlay === yesterdayStr) {
		newStreak = Number(await redis.get(streakKey) ?? 0) + 1;
	}
	await redis.set(streakKey, String(newStreak));
	await redis.set(lastPlayKey, date);
	await redis.expire(streakKey, 2592000); // 30 days
	await redis.expire(lastPlayKey, 172800); // 2 days

	return c.json({ ok: true, progress: newProgress, completed: newProgress >= challenge.target, bonusAwarded, streak: newStreak });
});
