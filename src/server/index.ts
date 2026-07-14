import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer, getServerPort } from '@devvit/web/server';
import { api } from './routes/api';
import { menu } from './routes/menu';
import { paymentsRouter } from './routes/payments';

const app = new Hono();
const internal = new Hono();

internal.route('/menu', menu);
internal.route('/payments', paymentsRouter);

app.route('/api', api);
app.route('/internal', internal);

serve({
  fetch: app.fetch,
  createServer,
  port: getServerPort(),
});
