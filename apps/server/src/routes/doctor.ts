import { FastifyPluginAsync } from 'fastify';
import { doctorService } from '../services/doctor.js';

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
};
