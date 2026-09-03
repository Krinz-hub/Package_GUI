import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { processService } from '../services/process.js';
import { serviceInspector } from '../services/services.js';

const StopProcessSchema = z.object({
  pid: z.number().int().positive(),
});

export const processRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/processes
  fastify.get('/processes', async () => {
    const processes = await processService.getDevProcesses();
    return { ok: true, processes, total: processes.length };
  });

  // GET /api/services
  fastify.get('/services', async () => {
    const services = await serviceInspector.getServices();
    return { ok: true, services, total: services.length };
  });

  // POST /api/processes/stop (JSON body variant)
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
      const statusCode = result.code === 'PROCESS_PERMISSION_DENIED' ? 403 : 400;
      return reply.code(statusCode).send({
        ok: false,
        error: {
          code: result.code || 'PROCESS_STOP_FAILED',
          message: result.message,
          pid: result.pid,
        },
      });
    }
    return { ok: true, success: true, pid: result.pid, status: result.status, message: result.message };
  });

  // POST /api/processes/:pid/stop (REST URL param variant - No body required)
  fastify.post('/processes/:pid/stop', async (req, reply) => {
    const { pid } = req.params as { pid: string };
    const numericPid = parseInt(pid, 10);
    if (isNaN(numericPid) || numericPid <= 0) {
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
      const statusCode = result.code === 'PROCESS_PERMISSION_DENIED' ? 403 : 400;
      return reply.code(statusCode).send({
        ok: false,
        error: {
          code: result.code || 'PROCESS_STOP_FAILED',
          message: result.message,
          pid: result.pid,
        },
      });
    }
    return { ok: true, success: true, pid: result.pid, status: result.status, message: result.message };
  });
};
