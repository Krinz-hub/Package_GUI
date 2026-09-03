import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { providerRegistry } from '../providers/registry.js';
import { runnerService } from '../services/runner.js';
import { PackageManagerType } from '@stuff-manager/shared';

const ActionSchema = z.object({
  manager: z.enum(['brew', 'npm', 'pip', 'cargo', 'docker', 'android']),
  name: z.string().min(1),
  isCask: z.boolean().optional(),
  global: z.boolean().optional(),
  forceTerminalPrivilege: z.boolean().optional(),
});

export const packageRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/packages
  fastify.get('/packages', async (req) => {
    const { manager } = req.query as { manager?: PackageManagerType };
    const packages = await providerRegistry.listAll(manager);
    return { packages, total: packages.length };
  });

  // GET /api/packages/:id
  fastify.get('/packages/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const pkg = await providerRegistry.findPackage(id);
    if (!pkg) {
      return reply.code(404).send({ error: 'Package not found' });
    }
    return pkg;
  });

  // GET /api/packages/search?q=...
  fastify.get('/packages/search', async (req) => {
    const { q, manager } = req.query as { q?: string; manager?: PackageManagerType };
    if (!q || !q.trim()) return { results: [] };
    const results = await providerRegistry.searchAll(q.trim(), manager);
    return { results };
  });

  // POST /api/packages/install
  fastify.post('/packages/install', async (req, reply) => {
    const parse = ActionSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.code(400).send({ error: parse.error.format() });
    }
    const { manager, name, isCask, global, forceTerminalPrivilege } = parse.data;
    const job = await runnerService.execute({
      manager,
      action: 'install',
      packageName: name,
      isCask,
      global,
      forceTerminalPrivilege,
    });
    return { success: true, job };
  });

  // POST /api/packages/uninstall
  fastify.post('/packages/uninstall', async (req, reply) => {
    const parse = ActionSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.code(400).send({ error: parse.error.format() });
    }
    const { manager, name, isCask, global, forceTerminalPrivilege } = parse.data;
    const job = await runnerService.execute({
      manager,
      action: 'uninstall',
      packageName: name,
      isCask,
      global,
      forceTerminalPrivilege,
    });
    return { success: true, job };
  });

  // POST /api/packages/update
  fastify.post('/packages/update', async (req, reply) => {
    const parse = ActionSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.code(400).send({ error: parse.error.format() });
    }
    const { manager, name, isCask, global, forceTerminalPrivilege } = parse.data;
    const job = await runnerService.execute({
      manager,
      action: 'update',
      packageName: name,
      isCask,
      global,
      forceTerminalPrivilege,
    });
    return { success: true, job };
  });

  // POST /api/packages/reinstall
  fastify.post('/packages/reinstall', async (req, reply) => {
    const parse = ActionSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.code(400).send({ error: parse.error.format() });
    }
    const { manager, name, isCask, global, forceTerminalPrivilege } = parse.data;
    const job = await runnerService.execute({
      manager,
      action: 'reinstall',
      packageName: name,
      isCask,
      global,
      forceTerminalPrivilege,
    });
    return { success: true, job };
  });
};
