import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execFileAsync = promisify(execFile);

const AUTO_NAS_PATH = '/etc/auto_nas';
const MOUNT_BASE = '/Volumes/NAS';

export interface NasShare {
  key: string;
  url: string;
  mountPath: string;
}

export interface MountStatus extends NasShare {
  mounted: boolean;
}

export interface MountResult {
  key: string;
  mountPath: string;
  success: boolean;
  message: string;
}

interface SmbParts {
  host: string;
  share: string;
  username: string;
  password: string;
}

function parseSmbUrl(url: string): SmbParts {
  // //user:pass@host/share
  const match = url.match(/^\/\/([^:]+):([^@]+)@([^/]+)\/(.+)$/);
  if (!match) throw new Error(`Invalid SMB URL: ${url}`);
  return { username: match[1], password: match[2], host: match[3], share: match[4] };
}

@Injectable()
export class NasService {
  private readonly logger = new Logger(NasService.name);

  private async parseAutoNas(): Promise<NasShare[]> {
    const content = await fs.readFile(AUTO_NAS_PATH, 'utf-8');
    const shares: NasShare[] = [];

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Format: key  [-options]  //url
      const parts = trimmed.split(/\s+/);
      if (parts.length < 2) continue;

      const key = parts[0];
      const url = parts[parts.length - 1];
      if (!url.startsWith('//')) continue;

      shares.push({
        key,
        url,
        mountPath: path.join(MOUNT_BASE, key),
      });
    }

    return shares;
  }

  private async getMountedPaths(): Promise<Set<string>> {
    try {
      const { stdout } = await execFileAsync('mount', []);
      const mounted = new Set<string>();
      for (const line of stdout.split('\n')) {
        // macOS: "device on /path (fstype, ...)"
        // Linux: "device on /path type fstype (...)"
        const match = line.match(/ on (\S+) /);
        if (match) mounted.add(match[1]);
      }
      return mounted;
    } catch {
      return new Set();
    }
  }

  private async ensureDir(dirPath: string): Promise<void> {
    if (process.platform === 'darwin') {
      await execFileAsync('sudo', ['/bin/mkdir', '-p', dirPath]);
    } else {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  private async execMount(url: string, mountPath: string): Promise<void> {
    if (process.platform === 'darwin') {
      // macOS: mount_smbfs with credentials embedded in URL
      await execFileAsync('sudo', ['/sbin/mount_smbfs', url, mountPath]);
    } else {
      // Linux (Docker/Alpine): mount -t cifs, container runs as root
      // vers=1.0 needed for older NAS devices that only support SMB1
      const { host, share, username, password } = parseSmbUrl(url);
      await execFileAsync('/bin/mount', [
        '-t', 'cifs',
        `//${host}/${share}`,
        mountPath,
        '-o', `username=${username},password=${password},vers=1.0`,
      ]);
    }
  }

  async getStatus(): Promise<MountStatus[]> {
    const [shares, mounted] = await Promise.all([
      this.parseAutoNas(),
      this.getMountedPaths(),
    ]);

    return shares.map((share) => ({
      ...share,
      mounted: mounted.has(share.mountPath),
    }));
  }

  async mountAll(): Promise<MountResult[]> {
    const [shares, mounted] = await Promise.all([
      this.parseAutoNas(),
      this.getMountedPaths(),
    ]);

    const results: MountResult[] = [];

    for (const share of shares) {
      if (mounted.has(share.mountPath)) {
        results.push({
          key: share.key,
          mountPath: share.mountPath,
          success: true,
          message: 'already mounted',
        });
        continue;
      }

      try {
        await this.ensureDir(share.mountPath);
        await this.execMount(share.url, share.mountPath);
        this.logger.log(`Mounted ${share.mountPath}`);
        results.push({
          key: share.key,
          mountPath: share.mountPath,
          success: true,
          message: 'mounted successfully',
        });
      } catch (error) {
        const message = (error as Error).message || String(error);
        this.logger.error(`Failed to mount ${share.key}: ${message}`);
        results.push({
          key: share.key,
          mountPath: share.mountPath,
          success: false,
          message,
        });
      }
    }

    return results;
  }
}
