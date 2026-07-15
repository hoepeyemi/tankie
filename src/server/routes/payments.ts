import { Hono } from 'hono';
import { context, redis, payments } from '@devvit/web/server';

export const paymentsRouter = new Hono();

paymentsRouter.post('/fulfill', async (c) => {
  try {
    const { orderId, sku } = await c.req.json<{ orderId: string; sku: string }>();
    const username = context.username;
    if (!username) return c.json({ error: 'Not logged in' }, 401);

    const skinKey = sku.replace('skin_', '');
    const raw = await redis.get(`skins:${username}`);
    const existing = raw ? raw.split(',').filter(Boolean) : [];
    if (!existing.includes(skinKey)) {
      await redis.set(`skins:${username}`, [...existing, skinKey].join(','));
    }
    await payments.acknowledgeOrderDelivery(orderId);

    return c.json({ ok: true });
  } catch (err) {
    console.error('[payments/fulfill]', err);
    return c.json({ error: 'Fulfillment failed' }, 500);
  }
});
