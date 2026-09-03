import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { processService } from '../services/process.js';
import { serviceInspector } from '../services/services.js';

const StopProcessSchema = z.object({
  pid: z.number().int().positive(),
});

export const processRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/processes', async () => {
    const processes = await processService.getDevProcesses();
    return { processes, total: processes.length };
  });

  fastify.get('/services', async () => {
    const services = await serviceInspector.getServices();
    return { services, total: services.length };
  });

  fastify.post('/processes/stop', async (req, reply) => {
    const parse = StopProcessSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.code(400).send({ error: parse.error.format() });
    }
    const result = await processService.stopProcess(parse.data.pid);
    return result;
  });
};
