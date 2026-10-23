import type { FastifyRequest, FastifyReply } from 'fastify';

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();

    const claims = request.user as {
      sub?: string;
      telegramId?: string;
    };

    if (
      !claims.sub ||
      !claims.telegramId ||
      claims.sub !== claims.telegramId
    ) {
      return reply.code(401).send({
        error: 'Invalid session identity'
      });
    }
  } catch {
    return reply.code(401).send({
      error: 'Authentication required'
    });
  }
}
