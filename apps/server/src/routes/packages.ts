import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { providerRegistry } from '../providers/registry.js';
import { runnerService } from '../services/runner.js';
import { pipProvider } from '../providers/pip.js';
import { PackageManagerType } from '@stuff-manager/shared';

const ActionSchema = z.object({
  manager: z.enum([
    'brew',
    'npm',
    'pip',
    'cargo',
    'docker',
    'android',
    'winget',
    'chocolatey',
    'scoop',
    'apt',
    'dnf',
    'pacman',
  ]),
  name: z.string().min(1),
  isCask: z.boolean().optional(),
  global: z.boolean().optional(),
  forceTerminalPrivilege: z.boolean().optional(),
  allowBreakSystemPackages: z.boolean().optional(),
});

const CreateVenvSchema = z.object({
  targetDir: z.string().optional(),
  envName: z.string().optional(),
});

export const packageRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/packages
  fastify.get('/packages', async (req) => {
    const { manager } = req.query as { manager?: PackageManagerType };
    const packages = await providerRegistry.listAll(manager);
    return { ok: true, packages, total: packages.length };
  });

  // GET /api/packages/:id
  fastify.get('/packages/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const pkg = await providerRegistry.findPackage(id);
    if (!pkg) {
      return reply.code(404).send({
        ok: false,
        error: {
          code: 'PACKAGE_NOT_FOUND',
          message: `Package "${id}" was not found in installed package databases.`,
        },
      });
    }
    return { ok: true, package: pkg };
  });

  // GET /api/packages/search?q=...
  fastify.get('/packages/search', async (req) => {
    const { q, manager } = req.query as { q?: string; manager?: PackageManagerType };
    if (!q || !q.trim()) return { ok: true, results: [] };
    const results = await providerRegistry.searchAll(q.trim(), manager);
    return { ok: true, results };
  });

  // GET /api/python/environments
  fastify.get('/python/environments', async () => {
    const environments = await pipProvider.getEnvironments();
    const active = await pipProvider.getActiveEnvironment();
    return { ok: true, environments, active };
  });

  // POST /api/python/create-venv
  fastify.post('/python/create-venv', async (req, reply) => {
    const parse = CreateVenvSchema.safeParse(req.body || {});
    const targetDir = parse.success ? parse.data.targetDir : undefined;
    const envName = parse.success ? parse.data.envName : undefined;

    try {
      const result = await pipProvider.createVirtualEnvironment(targetDir, envName);
      return { ok: true, ...result };
    } catch (err: any) {
      return reply.code(500).send({
        ok: false,
        error: {
          code: 'VENV_CREATION_FAILED',
          message: err.message || 'Failed to create virtual environment',
        },
      });
    }
  });

  // POST /api/packages/install
  fastify.post('/packages/install', async (req, reply) => {
    const parse = ActionSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid package install payload',
          details: parse.error.format(),
        },
      });
    }
    const { manager, name, isCask, global, forceTerminalPrivilege, allowBreakSystemPackages } = parse.data;
    try {
      const job = await runnerService.execute({
        manager,
        action: 'install',
        packageName: name,
        isCask,
        global,
        forceTerminalPrivilege,
        allowBreakSystemPackages,
      });
      return { ok: true, success: true, job };
    } catch (err: any) {
      if (err.code === 'PYTHON_EXTERNALLY_MANAGED') {
        return reply.code(422).send({
          ok: false,
          error: {
            code: 'PYTHON_EXTERNALLY_MANAGED',
            message: err.message,
            interpreter: err.interpreter,
            environment: err.environment,
            recommendation: 'Use a virtual environment (.venv) or pipx.',
          },
        });
      }
      return reply.code(500).send({
        ok: false,
        error: {
          code: 'PACKAGE_INSTALL_FAILED',
          message: err.message || `Failed to initiate installation of ${name}`,
        },
      });
    }
  });

  // POST /api/packages/uninstall
  fastify.post('/packages/uninstall', async (req, reply) => {
    const parse = ActionSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid package uninstall payload',
          details: parse.error.format(),
        },
      });
    }
    const { manager, name, isCask, global, forceTerminalPrivilege, allowBreakSystemPackages } = parse.data;
    try {
      const job = await runnerService.execute({
        manager,
        action: 'uninstall',
        packageName: name,
        isCask,
        global,
        forceTerminalPrivilege,
        allowBreakSystemPackages,
      });
      return { ok: true, success: true, job };
    } catch (err: any) {
      return reply.code(500).send({
        ok: false,
        error: {
          code: 'PACKAGE_UNINSTALL_FAILED',
          message: err.message || `Failed to initiate uninstall of ${name}`,
        },
      });
    }
  });

  // POST /api/packages/update
  fastify.post('/packages/update', async (req, reply) => {
    const parse = ActionSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid package update payload',
          details: parse.error.format(),
        },
      });
    }
    const { manager, name, isCask, global, forceTerminalPrivilege, allowBreakSystemPackages } = parse.data;
    try {
      const job = await runnerService.execute({
        manager,
        action: 'update',
        packageName: name,
        isCask,
        global,
        forceTerminalPrivilege,
        allowBreakSystemPackages,
      });
      return { ok: true, success: true, job };
    } catch (err: any) {
      if (err.code === 'PYTHON_EXTERNALLY_MANAGED') {
        return reply.code(422).send({
          ok: false,
          error: {
            code: 'PYTHON_EXTERNALLY_MANAGED',
            message: err.message,
            interpreter: err.interpreter,
            recommendation: 'Use a virtual environment (.venv) or pipx.',
          },
        });
      }
      return reply.code(500).send({
        ok: false,
        error: {
          code: 'PACKAGE_UPDATE_FAILED',
          message: err.message || `Failed to initiate update of ${name}`,
        },
      });
    }
  });

  // POST /api/packages/reinstall
  fastify.post('/packages/reinstall', async (req, reply) => {
    const parse = ActionSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid package reinstall payload',
          details: parse.error.format(),
        },
      });
    }
    const { manager, name, isCask, global, forceTerminalPrivilege, allowBreakSystemPackages } = parse.data;
    try {
      const job = await runnerService.execute({
        manager,
        action: 'reinstall',
        packageName: name,
        isCask,
        global,
        forceTerminalPrivilege,
        allowBreakSystemPackages,
      });
      return { ok: true, success: true, job };
    } catch (err: any) {
      if (err.code === 'PYTHON_EXTERNALLY_MANAGED') {
        return reply.code(422).send({
          ok: false,
          error: {
            code: 'PYTHON_EXTERNALLY_MANAGED',
            message: err.message,
            interpreter: err.interpreter,
            recommendation: 'Use a virtual environment (.venv) or pipx.',
          },
        });
      }
      return reply.code(500).send({
        ok: false,
        error: {
          code: 'PACKAGE_REINSTALL_FAILED',
          message: err.message || `Failed to initiate reinstall of ${name}`,
        },
      });
    }
  });
};
