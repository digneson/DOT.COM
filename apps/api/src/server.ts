import cors from '@fastify/cors';
import accountRoutes from './account.js';
import fastifyJwt from '@fastify/jwt';
import telegramAuth from './telegram-auth.js';
import 'dotenv/config';
import Fastify from 'fastify';

const app = Fastify({ logger: true });
if (!process.env.APP_SESSION_SECRET) {
  throw new Error('APP_SESSION_SECRET is missing from apps/api/.env');
}
app.register(fastifyJwt, {
  secret: process.env.APP_SESSION_SECRET
});
app.register(cors, { origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173', 'http://127.0.0.1:4173'] });
app.register(telegramAuth);
app.register(accountRoutes);
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

app.get('/health', async () => ({
  status: 'ok',
  service: 'dot-com-api',
  timestamp: new Date().toISOString()
}));

app.get('/', async () => ({
  name: 'DOT.COM API',
  message: 'The DOT.COM backend is running.',
  health: '/health'
}));

async function start() {
  try {
    await app.listen({ port, host });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();

app.get('/health/database', async (_request, reply) => {
  const { error } = await (await import('./supabase.js')).supabase
    .from('dot_settings')
    .select('key')
    .limit(1);

  if (error) {
    app.log.error({ err: error }, 'Supabase database check failed');
    return reply.code(503).send({
      status: 'error',
      service: 'dot-com-api',
      database: 'unavailable'
    });
  }

  return {
    status: 'ok',
    service: 'dot-com-api',
    database: 'connected'
  };
});
