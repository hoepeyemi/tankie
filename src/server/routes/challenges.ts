import { Hono } from 'hono';
import { redis, context, reddit } from '@devvit/web/server';
import { getRankIndex, RANK_NAMES } from '../../shared/ranks';

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
	let hash = 0;
	for (const c of dateStr) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;

	const challenges: DailyChallenge[] = [
		{ id: `kills5-${dateStr}`, type: 'kills', target: 5, description: 'Destroy 5 enemy tanks today', bonusXp: 100 },
		{ id: `kills10-${dateStr}`, type: 'kills', target: 10, description: 'Destroy 10 enemy tanks today', bonusXp: 200 },
		{ id: `survive120-${dateStr}`, type: 'survive', target: 120, description: 'Survive for 2 minutes in a single match', bonusXp: 150 },
		{ id: `survive180-${dateStr}`, type: 'survive', target: 180, description: 'Survive for 3 minutes in a single match', bonusXp: 250 },
		{ id: `matches3-${dateStr}`, type: 'matches', target: 3, description: 'Complete 3 matches today', bonusXp: 120 },
		{ id: `matches5-${dateStr}`, type: 'matches', target: 5, description: 'Complete 5 matches today', bonusXp: 200 },
		{ id: `wager1-${dateStr}`, type: 'wager_win', target: 1, description: 'Win a wager match today', bonusXp: 300 },
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

	// Rate limit: max 20 progress reports per minute
	const rlKey = `rl:progress:${username}`;
	const rlCount = await redis.incrBy(rlKey, 1);
	if (rlCount === 1) await redis.expire(rlKey, 60);
	if (rlCount > 20) return c.json({ error: 'Too many requests' }, 429);

	const { type, amount } = await c.req.json<{ type: ChallengeType; amount: number }>();

	// Validate amount — cap to prevent inflated reports
	const safeAmount = Math.max(0, Math.min(Math.floor(Number(amount)), 1000));
	if (!Number.isFinite(safeAmount)) return c.json({ error: 'Invalid amount' }, 400);

	const date = todayStr();
	const challenge = getDailyChallenge(date);

	const progressKey = `challenge:${date}:${username}`;
	const streakKey = `streak:${username}`;
	const lastPlayKey = `lastplay:${username}`;

	// Update streak for any play activity, regardless of challenge type
	const lastPlayBefore = await redis.get(lastPlayKey);
	const yesterday = new Date();
	yesterday.setUTCDate(yesterday.getUTCDate() - 1);
	const yesterdayStr = yesterday.toISOString().slice(0, 10);
	let currentStreak = 1;
	if (lastPlayBefore === date) {
		currentStreak = Number(await redis.get(streakKey) ?? 1);
	} else if (lastPlayBefore === yesterdayStr) {
		currentStreak = Number(await redis.get(streakKey) ?? 0) + 1;
	}
	await redis.set(streakKey, String(currentStreak));
	await redis.set(lastPlayKey, date);
	await redis.expire(streakKey, 2592000);
	await redis.expire(lastPlayKey, 172800);

	// Only track progress if the type matches today's challenge
	if (challenge.type !== type) {
		return c.json({ ok: true, progress: 0, completed: false, bonusAwarded: false, streak: currentStreak });
	}

	const prevProgress = Number(await redis.get(progressKey) ?? 0);
	const alreadyCompleted = prevProgress >= challenge.target;
	const newProgress = Math.min(prevProgress + safeAmount, challenge.target);

	await redis.set(progressKey, String(newProgress));
	await redis.expire(progressKey, 172800); // 2 days TTL

	let bonusAwarded = false;
	if (!alreadyCompleted && newProgress >= challenge.target) {
		const playerData = await redis.hGetAll(`player:${username}`);
		const oldXp = Number(playerData['xp'] ?? 0);
		const newXp = oldXp + challenge.bonusXp;
		await redis.hSet(`player:${username}`, { xp: String(newXp) });
		await redis.zAdd('lb:xp', { member: username, score: newXp });
		bonusAwarded = true;

		// Check for rank-up triggered by challenge bonus XP
		const oldRank = getRankIndex(oldXp);
		const newRank = getRankIndex(newXp);
		if (newRank > oldRank) {
			const rankKey = `rank:${username}`;
			const storedRank = Number(await redis.get(rankKey) ?? -1);
			if (newRank > storedRank) {
				await redis.set(rankKey, String(newRank));
				await reddit.setUserFlair({
					subredditName: context.subredditName,
					username,
					text: `${RANK_NAMES[newRank]} · ${newXp} XP`,
				}).catch(() => {});
				if (context.postId) {
					await reddit.submitComment({
						id: context.postId,
						text: `🎖️ **u/${username}** just ranked up to **${RANK_NAMES[newRank]}** in Blast Tanks! (${newXp.toLocaleString()} XP)`,
					}).catch(() => {});
				}
			}
		}
	}

	return c.json({ ok: true, progress: newProgress, completed: newProgress >= challenge.target, bonusAwarded, streak: currentStreak });
});
