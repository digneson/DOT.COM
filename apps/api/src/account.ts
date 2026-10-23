import type { FastifyPluginAsync } from 'fastify';
import { supabase } from './supabase.js';
import { authenticate } from './authenticate.js';

const accountRoutes: FastifyPluginAsync = async (app) => {
  app.get('/account', {
    preHandler: authenticate
  }, async (request, reply) => {
    const claims = request.user as {
      sub: string;
      telegramId: string;
    };

    const { data: user, error: userError } = await supabase
      .from('dot_users')
      .select('telegram_id, username, display_name, created_at')
      .eq('telegram_id', claims.telegramId)
      .maybeSingle();

    if (userError) {
      app.log.error({ err: userError }, 'Account lookup failed');
      return reply.code(503).send({
        error: 'Account service temporarily unavailable'
      });
    }

    if (!user) {
      return reply.code(404).send({
        error: 'Account not found'
      });
    }

    const { data: balance, error: balanceError } = await supabase
      .rpc('get_dot_balance', {
        p_telegram_id: claims.telegramId
      });

    if (balanceError) {
      app.log.error({ err: balanceError }, 'Balance lookup failed');
      return reply.code(503).send({
        error: 'Balance service temporarily unavailable'
      });
    }

    return {
      user: {
        telegramId: user.telegram_id,
        username: user.username,
        displayName: user.display_name,
        createdAt: user.created_at
      },
      balance: balance ?? 0
    };
  });
};

export default accountRoutes;
