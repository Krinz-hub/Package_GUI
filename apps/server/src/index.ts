import Fastify, { FastifyError } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { packageRoutes } from './routes/packages.js';
import { overviewRoutes } from './routes/overview.js';
import { doctorRoutes } from './routes/doctor.js';
import { processRoutes } from './routes/processes.js';
import { portRoutes } from './routes/ports.js';
import { containerRoutes } from './routes/containers.js';
import { historyRoutes } from './routes/history.js';
import { websocketRoutes } from './routes/ws.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '7421', 10);
const HOST = process.env.HOST || '127.0.0.1'; // Strictly localhost for local-first security

export async function buildServer() {
  const fastify = Fastify({
    logger: process.env.PAKAGE_DEBUG === '1' ? true : false,
    trustProxy: true,
  });

  // Central Error Handler: Return meaningful JSON errors instead of failing silently
  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    fastify.log.error(error);
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      ok: false,
      error: {
        code: error.code || (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR'),
        message: error.message || 'An internal server error occurred',
        details: process.env.PAKAGE_DEBUG === '1' ? (error as any).stack : undefined,
      },
    });
  });

  // Security: CORS dynamically allows all local loopback origins (localhost / 127.0.0.1 / [::1] on any port)
  await fastify.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g. mobile apps, curl, same-origin, electron)
      if (!origin) return cb(null, true);
      try {
        const url = new URL(origin);
        const host = url.hostname;
        if (
          host === 'localhost' ||
          host === '127.0.0.1' ||
          host === '0.0.0.0' ||
          host === '::1' ||
          host === '[::1]'
        ) {
          return cb(null, true);
        }
      } catch (_) {}
      // Return false gracefully instead of throwing an unhandled Error that terminates preflights
      cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'Range'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
  });

  // WebSocket support
  await fastify.register(websocket);

  // Register WebSocket routes
  await fastify.register(websocketRoutes);

  // Register API routes
  await fastify.register(overviewRoutes, { prefix: '/api' });
  await fastify.register(packageRoutes, { prefix: '/api' });
  await fastify.register(doctorRoutes, { prefix: '/api' });
  await fastify.register(processRoutes, { prefix: '/api' });
  await fastify.register(portRoutes, { prefix: '/api' });
  await fastify.register(containerRoutes, { prefix: '/api' });
  await fastify.register(historyRoutes, { prefix: '/api' });

  // Same-origin static bundle serving in production
  const potentialDistPaths = [
    path.resolve(__dirname, '../../web/dist'),
    path.resolve(__dirname, '../../../apps/web/dist'),
    path.resolve(__dirname, '../web/dist'),
    path.resolve(__dirname, '../../apps/web/dist'),
    path.resolve(process.cwd(), 'apps/web/dist'),
    path.resolve(process.cwd(), 'dist'),
  ];

  const webDistPath = potentialDistPaths.find((p) => fs.existsSync(p));

  if (webDistPath) {
    await fastify.register(fastifyStatic, {
      root: webDistPath,
      prefix: '/',
    });

    // SPA Fallback: non-API routes return index.html
    fastify.setNotFoundHandler(async (req, reply) => {
      if (req.url.startsWith('/api') || req.url.startsWith('/ws')) {
        return reply.code(404).send({
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.url} does not exist on PACKAGE GUI backend.`,
          },
        });
      }
      return reply.sendFile('index.html');
    });
  }

  return fastify;
}

async function start() {
  try {
    const server = await buildServer();
    await server.listen({ port: PORT, host: HOST });
    console.log(`
┌────────────────────────────────────────────────────────────┐
│                                                            │
│   🚀 PACKAGE GUI — Local Developer Backend                 │
│                                                            │
│   • Health Check:     http://${HOST}:${PORT}/api/health       │
│   • Overview API:     http://${HOST}:${PORT}/api/overview     │
│   • Live Logs WS:     ws://${HOST}:${PORT}/ws                │
│   • Interactive PTY:  ws://${HOST}:${PORT}/ws/terminal       │
│   • Host Binding:     ${HOST} (Localhost Only)            │
│                                                            │
└────────────────────────────────────────────────────────────┘
    `);
  } catch (err: any) {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use by another process.`);
      console.error(`Try freeing port ${PORT} with: lsof -ti:${PORT} | xargs kill -9\n`);
    } else {
      console.error('Failed to start server:', err);
    }
    process.exit(1);
  }
}

// Only start if executed directly
if (process.argv[1] && (process.argv[1].endsWith('index.ts') || process.argv[1]?.endsWith('index.js'))) {
  start();
}
