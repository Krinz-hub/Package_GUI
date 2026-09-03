import { FastifyPluginAsync } from 'fastify';
import { dockerProvider } from '../providers/docker.js';
import { androidProvider } from '../providers/android.js';

export const containerRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/containers/docker', async () => {
    return dockerProvider.getDockerInfo();
  });

  fastify.get('/containers/android', async () => {
    return androidProvider.getAndroidInfo();
  });
};
