import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { doctorService } from '../services/doctor.js';
import { actionRunner } from '../services/action-runner.js';

const RunActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['launch-app', 'command', 'install-package']),
  application: z.string().optional(),
  command: z.string().optional(),
  manager: z.enum(['brew', 'npm', 'pip', 'cargo', 'docker', 'android', 'winget', 'chocolatey', 'scoop', 'apt', 'dnf', 'pacman']).optional(),
  packageName: z.string().optional(),
  isPrivileged: z.boolean().optional(),
  requiresTerminal: z.boolean().optional(),
});

export const doctorRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/doctor', async () => {
    const checks = await doctorService.runDiagnostics();
    const healthyCount = checks.filter((c) => c.status === 'healthy').length;
    const warningCount = checks.filter((c) => c.status === 'warning').length;
    const errorCount = checks.filter((c) => c.status === 'error').length;
    return {
      checks,
      summary: {
        total: checks.length,
        healthy: healthyCount,
        warning: warningCount,
        error: errorCount,
      },
    };
  });

  fastify.post('/doctor/run-action', async (req, reply) => {
    const parse = RunActionSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.code(400).send({ error: parse.error.format() });
    }
    const result = await actionRunner.executeAction(parse.data as any);
    return result;
  });
};
