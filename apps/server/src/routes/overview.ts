import { FastifyPluginAsync } from 'fastify';
import { providerRegistry } from '../providers/registry.js';
import { doctorService } from '../services/doctor.js';
import { processService } from '../services/process.js';
import { portScanner } from '../platform/ports.js';

export const overviewRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/overview', async () => {
    const overview = await providerRegistry.getOverview();
    const [checks, processes, ports] = await Promise.all([
      doctorService.runDiagnostics().catch(() => []),
      processService.getDevProcesses().catch(() => []),
      portScanner.scanListeningPorts().catch(() => []),
    ]);

    const issues = checks.filter((c) => c.status === 'warning' || c.status === 'error').length;
    overview.doctorIssuesCount = issues;
    overview.runningProcessesCount = processes.length;
    overview.totalPorts = ports.length;

    return overview;
  });

  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
};
