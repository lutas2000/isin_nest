import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async checkNasStatus(): Promise<{ mounted: boolean }> {
    const cncPath = process.env.CNC_PATH;
    if (!cncPath) {
      return { mounted: false };
    }

    try {
      const resolved = path.resolve(cncPath);
      const entries = await fs.promises.readdir(resolved);
      return { mounted: entries.length >= 0 };
    } catch {
      return { mounted: false };
    }
  }
}
