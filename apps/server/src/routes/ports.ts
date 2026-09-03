import { FastifyPluginAsync } from 'fastify';
import { portScanner } from '../platform/ports.js';

export const portRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/ports', async () => {
    const ports = await portScanner.scanListeningPorts();
    return { ports, total: ports.length };
  });
};
