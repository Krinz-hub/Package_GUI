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
    return { ok: true, processes, total: processes.length };
  });

  fastify.get('/services', async () => {
    const services = await serviceInspector.getServices();
    return { ok: true, services, total: services.length };
  });

  fastify.post('/processes/stop', async (req, reply) => {
    const parse = StopProcessSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid PID supplied',
          details: parse.error.format(),
        },
      });
    }
    const result = await processService.stopProcess(parse.data.pid);
    if (!result.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'PROCESS_STOP_FAILED',
          message: result.message,
        },
      });
    }
    return { ok: true, success: true, message: result.message };
  });

  fastify.post('/processes/:pid/stop', async (req, reply) => {
    const { pid } = req.params as { pid: string };
    const numericPid = parseInt(pid, 10);
    if (isNaN(numericPid) || numericPid <= 1) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_PID',
          message: `Invalid PID: ${pid}`,
        },
      });
    }
    const result = await processService.stopProcess(numericPid);
    if (!result.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'PROCESS_STOP_FAILED',
          message: result.message,
        },
      });
    }
    return { ok: true, success: true, message: result.message };
  });
};
