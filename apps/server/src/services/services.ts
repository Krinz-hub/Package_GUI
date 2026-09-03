import { ServiceInfo } from '@stuff-manager/shared';
import { safeExec } from '../utils/exec.js';
import { portScanner } from '../platform/ports.js';

export class ServiceInspector {
  public async getServices(): Promise<ServiceInfo[]> {
    const services: ServiceInfo[] = [];
    const ports = await portScanner.scanListeningPorts().catch(() => []);
    const portMap = new Map<number, number>(); // port -> pid
    for (const p of ports) {
      portMap.set(p.port, p.pid);
    }

    // 1. Docker
    const dockerInfoRes = await safeExec('docker', ['info'], { timeoutMs: 3000 });
    const isDockerUp = dockerInfoRes.exitCode === 0;
    const dockerCliRes = await safeExec('docker', ['--version']);
    const hasDockerCli = dockerCliRes.exitCode === 0;

    services.push({
      id: 'svc:docker',
      name: 'Docker Desktop Engine',
      displayName: 'Docker Engine',
      status: isDockerUp ? 'running' : hasDockerCli ? 'stopped' : 'not_installed',
      manager: 'docker',
      description: 'Container virtualization runtime and local image daemon',
    });

    // 2. Ollama
    const hasOllamaPort = portMap.has(11434);
    const ollamaVerRes = await safeExec('ollama', ['--version']);
    const hasOllamaCli = ollamaVerRes.exitCode === 0;

    services.push({
      id: 'svc:ollama',
      name: 'Ollama Local AI',
      displayName: 'Ollama',
      status: hasOllamaPort ? 'running' : hasOllamaCli ? 'stopped' : 'not_installed',
      port: 11434,
      pid: portMap.get(11434),
      description: 'Local large language model server and inference engine',
    });

    // 3. PostgreSQL
    const hasPgPort = portMap.has(5432);
    services.push({
      id: 'svc:postgres',
      name: 'PostgreSQL Server',
      displayName: 'PostgreSQL',
      status: hasPgPort ? 'running' : 'stopped',
      port: 5432,
      pid: portMap.get(5432),
      description: 'Relational database service listening on port 5432',
    });

    // 4. Redis
    const hasRedisPort = portMap.has(6379);
    services.push({
      id: 'svc:redis',
      name: 'Redis In-Memory Data Store',
      displayName: 'Redis',
      status: hasRedisPort ? 'running' : 'stopped',
      port: 6379,
      pid: portMap.get(6379),
      description: 'Key-value cache and message broker on port 6379',
    });

    // 5. n8n
    const hasN8nPort = portMap.has(5678);
    services.push({
      id: 'svc:n8n',
      name: 'n8n Workflow Automation',
      displayName: 'n8n',
      status: hasN8nPort ? 'running' : 'stopped',
      port: 5678,
      pid: portMap.get(5678),
      manager: 'npm',
      description: 'Self-hosted workflow automation platform on port 5678',
    });

    // 6. ADB Server
    const hasAdbPort = portMap.has(5037);
    services.push({
      id: 'svc:adb',
      name: 'Android Debug Bridge Server',
      displayName: 'ADB Daemon',
      status: hasAdbPort ? 'running' : 'stopped',
      port: 5037,
      pid: portMap.get(5037),
      manager: 'android',
      description: 'Local background daemon managing emulator & device connections',
    });

    return services;
  }
}

export const serviceInspector = new ServiceInspector();
