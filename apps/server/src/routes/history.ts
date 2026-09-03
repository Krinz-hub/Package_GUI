import { FastifyPluginAsync } from 'fastify';
import { runnerService } from '../services/runner.js';

export const historyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/history', async (req) => {
    const { limit } = req.query as { limit?: string };
    const history = runnerService.getRecentJobs(limit ? parseInt(limit, 10) : 50);
    return { ok: true, history };
  });

  fastify.get('/history/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const job = runnerService.getJob(id);
    if (!job) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: `Job ${id} was not found in audit database`,
        },
      });
    }
    return { ok: true, job };
  });
};
