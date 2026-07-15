import { Hono } from 'hono';
import { redis, realtime, context } from '@devvit/web/server';
import type { PeerData } from '../../../game/network/NetworkEvents';

export const gameRouter = new Hono();

const TTL = 3600; // 1 hour

function roomKey(code: string) { return `room:${code}:players`; }

async function getPlayers(code: string): Promise<PeerData[]> {
	const map = await redis.hGetAll(roomKey(code));
	return Object.values(map).map(v => JSON.parse(v) as PeerData);
}

// POST /api/game/host — create a room
gameRouter.post('/host', async (c) => {
	const { code, metadata } = await c.req.json<{ code: string; metadata: PeerData['metadata'] }>();
	const username = context.username ?? 'Player';
	const uuid = `${username}-${Date.now()}`;
	const player: PeerData = { uuid, metadata };

	await redis.hSet(roomKey(code), { [uuid]: JSON.stringify(player) });
	await redis.expire(roomKey(code), TTL);

	return c.json({ uuid, players: [player] });
});

// POST /api/game/join — join an existing room
gameRouter.post('/join', async (c) => {
	const { code, metadata } = await c.req.json<{ code: string; metadata: PeerData['metadata'] }>();
	const username = context.username ?? 'Player';
	const uuid = `${username}-${Date.now()}`;
	const player: PeerData = { uuid, metadata };

	const existing = await getPlayers(code);
	if (existing.length === 0) return c.json({ error: 'Room not found' }, 404);

	await redis.hSet(roomKey(code), { [uuid]: JSON.stringify(player) });

	const allPlayers = [...existing, player];
	await realtime.send(`game_${code}`, {
		channel: 'join',
		peer: uuid,
		data: { peer: player, peers: allPlayers },
	});

	return c.json({ uuid, players: allPlayers });
});

// POST /api/game/send — relay a message to all room members
gameRouter.post('/send', async (c) => {
	const { code, uuid, channel, data } = await c.req.json<{
		code: string;
		uuid: string;
		channel: string;
		data: unknown;
	}>();
	await realtime.send(`game_${code}`, { channel, peer: uuid, data });
	return c.json({ ok: true });
});

// POST /api/game/disconnect — leave a room
gameRouter.post('/disconnect', async (c) => {
	const { code, uuid } = await c.req.json<{ code: string; uuid: string }>();

	const playerJson = await redis.hGet(roomKey(code), uuid);
	const player: PeerData = playerJson
		? (JSON.parse(playerJson) as PeerData)
		: { uuid, metadata: { name: 'Unknown', tank: 'heig' } };

	await redis.hDel(roomKey(code), uuid);
	const remaining = await getPlayers(code);

	await realtime.send(`game_${code}`, {
		channel: 'leave',
		peer: uuid,
		data: { peer: player, peers: remaining },
	});

	return c.json({ ok: true });
});
