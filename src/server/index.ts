import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer, getServerPort } from '@devvit/web/server';
import { api } from './routes/api';
import { menu } from './routes/menu';
import { paymentsRouter } from './routes/payments';
import { gameRouter } from './routes/game';
import { wagerRouter } from './routes/wager';
import { challengesRouter } from './routes/challenges';

const app = new Hono();
const internal = new Hono();

internal.route('/menu', menu);
internal.route('/payments', paymentsRouter);

app.route('/api', api);
app.route('/api/game', gameRouter);
app.route('/api/wager', wagerRouter);
app.route('/api/challenges', challengesRouter);
app.route('/internal', internal);

serve({
  fetch: app.fetch,
  createServer,
  port: getServerPort(),
});
