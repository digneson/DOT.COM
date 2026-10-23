import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { supabase } from './supabase.js';

const telegramAuth: FastifyPluginAsync = async (app) => {
  app.post<{ Body: { initData?: string } }>(
    '/auth/telegram',
    async (request, reply) => {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const initData = request.body?.initData;

      if (!botToken || !initData || typeof initData !== 'string') {
        return reply.code(400).send({
          error: 'Telegram authentication data is required'
        });
      }

      if (initData.length > 8192) {
        return reply.code(400).send({
          error: 'Authentication data is too large'
        });
      }

      try {
        const params = new URLSearchParams(initData);
        const receivedHash = params.get('hash');
        const authDate = Number(params.get('auth_date'));
        const userData = params.get('user');

        if (
          !receivedHash ||
          !/^[a-f0-9]{64}$/i.test(receivedHash) ||
          !Number.isSafeInteger(authDate) ||
          !userData
        ) {
          return reply.code(401).send({
            error: 'Invalid Telegram authentication data'
          });
        }

        const now = Math.floor(Date.now() / 1000);

        if (authDate > now + 30 || now - authDate > 3600) {
          return reply.code(401).send({
            error: 'Telegram authentication data has expired'
          });
        }

        const dataCheckString = [...params.entries()]
          .filter(([key]) => key !== 'hash' && key !== 'signature')
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');

        const secretKey = createHmac('sha256', 'WebAppData')
          .update(botToken)
          .digest();

        const calculatedHash = createHmac('sha256', secretKey)
          .update(dataCheckString)
          .digest();

        const suppliedHash = Buffer.from(receivedHash, 'hex');

        if (
          suppliedHash.length !== calculatedHash.length ||
          !timingSafeEqual(suppliedHash, calculatedHash)
        ) {
          return reply.code(401).send({
            error: 'Telegram signature verification failed'
          });
        }

        const user = JSON.parse(userData) as {
          id?: number;
          username?: string;
          first_name?: string;
          last_name?: string;
        };

        if (
          !Number.isSafeInteger(user.id) ||
          !user.id ||
          user.id <= 0 ||
          typeof user.first_name !== 'string'
        ) {
          return reply.code(401).send({
            error: 'Invalid Telegram user'
          });
        }

        const displayName = [
          user.first_name,
          user.last_name
        ].filter(Boolean).join(' ');

        const { error } = await supabase
          .from('dot_users')
          .upsert({
            telegram_id: String(user.id),
            username: user.username ?? null,
            display_name: displayName
          }, {
            onConflict: 'telegram_id'
          });

        if (error) {
          app.log.error({ err: error }, 'Could not save Telegram user');
          return reply.code(503).send({
            error: 'Could not save user profile'
          });
        }

        const token = app.jwt.sign(
          { sub: String(user.id), telegramId: String(user.id) },
          { expiresIn: '1h' }
        );

        return {
          authenticated: true,
          token,
          user: {
            telegramId: String(user.id),
            username: user.username ?? null,
            displayName
          }
        };
      } catch (error) {
        app.log.warn({ err: error }, 'Telegram authentication failed');
        return reply.code(401).send({
          error: 'Telegram authentication failed'
        });
      }
    }
  );
};

export default telegramAuth;
