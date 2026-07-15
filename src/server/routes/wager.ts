import { Hono } from 'hono';
import { redis, context } from '@devvit/web/server';

export const wagerRouter = new Hono();

const MIN_WAGER = 10;
const MAX_WAGER = 5000;

function wagerKey(code: string) { return `wager:${code}`; }

// POST /api/wager/create — host creates a wager room
wagerRouter.post('/create', async (c) => {
	const { code, amount } = await c.req.json<{ code: string; amount: number }>();
	const username = context.username;
	if (!username) return c.json({ error: 'Not logged in' }, 401);
	if (amount < MIN_WAGER || amount > MAX_WAGER) {
		return c.json({ error: `Wager must be between ${MIN_WAGER} and ${MAX_WAGER} XP` }, 400);
	}

	// Check host has enough XP
	const hostData = await redis.hGetAll(`player:${username}`);
	const hostXp = Number(hostData['xp'] ?? 0);
	if (hostXp < amount) {
		return c.json({ error: `Not enough XP. You have ${hostXp} XP.` }, 400);
	}

	// Reserve XP (hold it)
	await redis.hSet(`player:${username}`, { xp: String(hostXp - amount) });
	await redis.hSet(wagerKey(code), {
		host: username,
		amount: String(amount),
		status: 'waiting',
	});
	await redis.expire(wagerKey(code), 3600);

	return c.json({ ok: true, amount, hostXp: hostXp - amount });
});

// POST /api/wager/join — challenger joins a wager room
wagerRouter.post('/join', async (c) => {
	const { code } = await c.req.json<{ code: string }>();
	const username = context.username;
	if (!username) return c.json({ error: 'Not logged in' }, 401);

	const wager = await redis.hGetAll(wagerKey(code));
	if (!wager['host']) return c.json({ error: 'Wager not found' }, 404);
	if (wager['status'] !== 'waiting') return c.json({ error: 'Wager already started or settled' }, 400);
	if (wager['host'] === username) return c.json({ error: 'Cannot join your own wager' }, 400);

	const amount = Number(wager['amount']);
	const challengerData = await redis.hGetAll(`player:${username}`);
	const challengerXp = Number(challengerData['xp'] ?? 0);
	if (challengerXp < amount) {
		return c.json({ error: `Not enough XP. You have ${challengerXp} XP, need ${amount}.` }, 400);
	}

	// Reserve challenger XP
	await redis.hSet(`player:${username}`, { xp: String(challengerXp - amount) });
	await redis.hSet(wagerKey(code), {
		challenger: username,
		status: 'active',
	});

	return c.json({ ok: true, amount, host: wager['host'], challengerXp: challengerXp - amount });
});

// GET /api/wager/info/:code — get wager info (amount, status)
wagerRouter.get('/info/:code', async (c) => {
	const code = c.req.param('code');
	const wager = await redis.hGetAll(wagerKey(code));
	if (!wager['host']) return c.json({ error: 'Wager not found' }, 404);
	return c.json({
		host: wager['host'],
		challenger: wager['challenger'] ?? null,
		amount: Number(wager['amount']),
		status: wager['status'],
	});
});

// POST /api/wager/settle — host reports the winner after match ends
wagerRouter.post('/settle', async (c) => {
	const { code, winner } = await c.req.json<{ code: string; winner: string }>();
	const username = context.username;
	if (!username) return c.json({ error: 'Not logged in' }, 401);

	const wager = await redis.hGetAll(wagerKey(code));
	if (!wager['host']) return c.json({ error: 'Wager not found' }, 404);
	if (wager['status'] !== 'active') return c.json({ error: 'Wager not active' }, 400);
	// Only host or challenger can settle
	if (username !== wager['host'] && username !== wager['challenger']) {
		return c.json({ error: 'Not a participant' }, 403);
	}

	const amount = Number(wager['amount']);
	const prize = amount * 2;

	// Give winner double the wager
	const winnerData = await redis.hGetAll(`player:${winner}`);
	const winnerXp = Number(winnerData['xp'] ?? 0);
	await redis.hSet(`player:${winner}`, { xp: String(winnerXp + prize) });
	await redis.zAdd('lb:xp', { member: winner, score: winnerXp + prize });

	await redis.hSet(wagerKey(code), { status: 'settled', winner });

	return c.json({ ok: true, winner, prize });
});

// POST /api/wager/cancel — cancel a wager and refund XP
wagerRouter.post('/cancel', async (c) => {
	const { code } = await c.req.json<{ code: string }>();
	const username = context.username;
	if (!username) return c.json({ error: 'Not logged in' }, 401);

	const wager = await redis.hGetAll(wagerKey(code));
	if (!wager['host']) return c.json({ error: 'Wager not found' }, 404);
	if (username !== wager['host']) return c.json({ error: 'Only host can cancel' }, 403);
	if (wager['status'] === 'settled') return c.json({ error: 'Already settled' }, 400);

	const amount = Number(wager['amount']);

	// Refund host
	const hostData = await redis.hGetAll(`player:${wager['host']}`);
	await redis.hSet(`player:${wager['host']}`, { xp: String(Number(hostData['xp'] ?? 0) + amount) });

	// Refund challenger if they joined
	if (wager['challenger']) {
		const challengerData = await redis.hGetAll(`player:${wager['challenger']}`);
		await redis.hSet(`player:${wager['challenger']}`, {
			xp: String(Number(challengerData['xp'] ?? 0) + amount),
		});
	}

	await redis.hSet(wagerKey(code), { status: 'cancelled' });
	return c.json({ ok: true });
});
