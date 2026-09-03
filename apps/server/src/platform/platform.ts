import os from 'os';
import { BasePlatform } from './base-platform.js';
import { MacOSPlatform } from './macos.js';
import { WindowsPlatform } from './windows.js';
import { LinuxPlatform } from './linux.js';
import { PlatformType } from '@stuff-manager/shared';

export class PlatformFactory {
  private static instance: BasePlatform | null = null;

  public static getPlatform(): BasePlatform {
    if (this.instance) return this.instance;

    const plat = os.platform();
    if (plat === 'darwin') {
      this.instance = new MacOSPlatform();
    } else if (plat === 'win32') {
      this.instance = new WindowsPlatform();
    } else {
      this.instance = new LinuxPlatform();
    }

    return this.instance;
  }

  public static getPlatformType(): PlatformType {
    const plat = os.platform();
    if (plat === 'darwin') return 'darwin';
    if (plat === 'win32') return 'win32';
    return 'linux';
  }
}

export const platform = PlatformFactory.getPlatform();
