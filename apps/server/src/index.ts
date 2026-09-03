import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { packageRoutes } from './routes/packages.js';
import { overviewRoutes } from './routes/overview.js';
import { doctorRoutes } from './routes/doctor.js';
import { processRoutes } from './routes/processes.js';
import { containerRoutes } from './routes/containers.js';
import { historyRoutes } from './routes/history.js';
import { websocketRoutes } from './routes/ws.js';

const PORT = parseInt(process.env.PORT || '4173', 10);
const HOST = '127.0.0.1'; // Strictly localhost for local-first security

async function buildServer() {
  const fastify = Fastify({
    logger: true,
  });

  // Security: CORS restricted to local origin
  await fastify.register(cors, {
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:4173',
      'http://127.0.0.1:4173',
    ],
    credentials: true,
  });

  // WebSocket support
  await fastify.register(websocket);

  // Register API routes
  await fastify.register(websocketRoutes);
  await fastify.register(overviewRoutes, { prefix: '/api' });
  await fastify.register(packageRoutes, { prefix: '/api' });
  await fastify.register(doctorRoutes, { prefix: '/api' });
  await fastify.register(processRoutes, { prefix: '/api' });
  await fastify.register(containerRoutes, { prefix: '/api' });
  await fastify.register(historyRoutes, { prefix: '/api' });

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
│   • Local API:    http://${HOST}:${PORT}/api/overview         │
│   • Live WS:      ws://${HOST}:${PORT}/ws                    │
│   • Host binding: ${HOST} (Localhost Only)                │
│                                                            │
└────────────────────────────────────────────────────────────┘
    `);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
