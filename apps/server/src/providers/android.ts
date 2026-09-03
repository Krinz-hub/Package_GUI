import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  Package,
  PackageManagerInfo,
  PackageManagerType,
  AndroidInfo,
  AndroidDevice,
} from '@stuff-manager/shared';
import { PackageManagerProvider, CommandPlan } from './base.js';
import { safeExec } from '../utils/exec.js';

export class AndroidProvider implements PackageManagerProvider {
  readonly id: PackageManagerType = 'android';
  readonly name = 'Android SDK / ADB';
  readonly displayName = 'Android SDK & ADB';
  readonly description = 'Android Debug Bridge, connected emulators/devices, and SDK tools';

  private adbPath: string | null = null;
  private sdkPath: string | null = null;

  private async resolveAdb(): Promise<string | null> {
    if (this.adbPath && fs.existsSync(this.adbPath)) return this.adbPath;

    const candidates = [
      `${os.homedir()}/Library/Android/sdk/platform-tools/adb`,
      '/opt/homebrew/bin/adb',
      '/usr/local/bin/adb',
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        this.adbPath = p;
        this.sdkPath = path.resolve(p, '../../');
        return p;
      }
    }

    const res = await safeExec('which', ['adb']);
    if (res.exitCode === 0 && res.stdout.trim()) {
      this.adbPath = res.stdout.trim();
      return this.adbPath;
    }

    return null;
  }

  public async detect(): Promise<PackageManagerInfo> {
    const executable = await this.resolveAdb();
    if (!executable) {
      return {
        id: this.id,
        name: this.name,
        displayName: this.displayName,
        installed: false,
        packageCount: 0,
        updatesCount: 0,
        description: this.description,
      };
    }

    let version = '';
    const verRes = await safeExec(executable, ['version']);
    if (verRes.exitCode === 0) {
      const match = verRes.stdout.match(/Android Debug Bridge version\s+([\d\.]+)/i);
      version = match ? match[1] : 'installed';
    }

    const info = await this.getAndroidInfo();

    return {
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      installed: true,
      version,
      executablePath: executable,
      packageCount: info.devices.length,
      updatesCount: 0,
      description: this.description,
    };
  }

  public async getAndroidInfo(): Promise<AndroidInfo> {
    const executable = await this.resolveAdb();
    if (!executable) {
      return {
        available: false,
        devices: [],
      };
    }

    let adbVersion = '';
    const verRes = await safeExec(executable, ['version']);
    if (verRes.exitCode === 0) {
      const match = verRes.stdout.match(/Version\s+([\d\.\-]+)/i);
      adbVersion = match ? match[1] : '';
    }

    const devices: AndroidDevice[] = [];
    const devRes = await safeExec(executable, ['devices', '-l'], { timeoutMs: 5000 });
    if (devRes.exitCode === 0 && devRes.stdout.trim()) {
      const lines = devRes.stdout.split('\n').slice(1);
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          const id = parts[0];
          const state = parts[1];
          const modelMatch = line.match(/model:([^\s]+)/);
          const productMatch = line.match(/product:([^\s]+)/);
          devices.push({
            id,
            state,
            model: modelMatch ? modelMatch[1] : 'Device',
            product: productMatch ? productMatch[1] : id,
          });
        }
      }
    }

    return {
      available: true,
      adbVersion,
      adbPath: executable,
      sdkPath: this.sdkPath || `${os.homedir()}/Library/Android/sdk`,
      devices,
    };
  }

  public async list(): Promise<Package[]> {
    const info = await this.getAndroidInfo();
    return info.devices.map((d) => ({
      id: `android:device:${d.id}`,
      name: d.id,
      displayName: `${d.model} (${d.id})`,
      version: d.state,
      manager: 'android',
      type: 'sdk-pkg',
      location: `ADB Target: ${d.id}`,
      description: `Product: ${d.product} | State: ${d.state}`,
      installed: true,
      updateAvailable: false,
      installCommand: `adb connect ${d.id}`,
    }));
  }

  public async info(nameOrId: string): Promise<Package | null> {
    const list = await this.list();
    return list.find((p) => p.id === nameOrId || p.name === nameOrId) || null;
  }

  public async planInstall(pkg: string): Promise<CommandPlan> {
    const executable = (await this.resolveAdb()) || 'adb';
    return { executable, args: ['install', pkg], requiresPrivilege: false };
  }

  public async planUninstall(pkg: string): Promise<CommandPlan> {
    const executable = (await this.resolveAdb()) || 'adb';
    return { executable, args: ['uninstall', pkg], requiresPrivilege: false };
  }

  public async planUpdate(pkg: string): Promise<CommandPlan> {
    const executable = (await this.resolveAdb()) || 'adb';
    return { executable, args: ['install', '-r', pkg], requiresPrivilege: false };
  }
}

export const androidProvider = new AndroidProvider();
