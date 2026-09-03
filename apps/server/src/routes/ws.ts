import { FastifyPluginAsync } from 'fastify';
import { runnerService } from '../services/runner.js';
import { terminalService } from '../services/terminal.js';
import type { WebSocket } from 'ws';

export const websocketRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. Live Operation Logs Stream
  fastify.get('/ws', { websocket: true }, (connection) => {
    const socket = (connection as any).socket || connection;
    runnerService.registerClient(socket as WebSocket);

    socket.send(
      JSON.stringify({
        type: 'status',
        data: 'Connected to PACKAGE GUI Realtime Operation Log Stream',
        timestamp: new Date().toISOString(),
      })
    );
  });

  // 2. Interactive Terminal PTY Stream
  fastify.get('/ws/terminal', { websocket: true }, (connection) => {
    const socket = (connection as any).socket || connection;
    terminalService.handleConnection(socket as WebSocket);
  });
};
