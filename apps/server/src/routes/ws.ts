import { FastifyPluginAsync } from 'fastify';
import { runnerService } from '../services/runner.js';
import type { WebSocket } from 'ws';

export const websocketRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    // fastify-websocket provides connection.socket in v11 or connection directly
    const socket = (connection as any).socket || connection;
    runnerService.registerClient(socket as WebSocket);

    socket.send(
      JSON.stringify({
        type: 'status',
        data: 'Connected to PACKAGE GUI Realtime Event Stream',
        timestamp: new Date().toISOString(),
      })
    );
  });
};
