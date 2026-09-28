import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mysql = require('mysql');

export interface LegacyConnection {
  query(sql: string, values?: unknown[]): Promise<any>;
}

@Injectable()
export class LegacyStaffDbService implements OnModuleDestroy {
  private pool: any;

  constructor(private readonly config: ConfigService) {}

  private getPool(): any {
    if (this.pool) return this.pool;
    const host = this.config.get<string>('SOURCE_DB_HOST');
    const user = this.config.get<string>('SOURCE_DB_USER');
    const database = this.config.get<string>('SOURCE_DB_NAME');
    if (!host || !user || !database) {
      throw new ServiceUnavailableException(
        'Legacy staff MariaDB is not configured',
      );
    }
    this.pool = mysql.createPool({
      host,
      port: Number(this.config.get<string>('SOURCE_DB_PORT') || 3306),
      user,
      password: this.config.get<string>('SOURCE_DB_PASS') || '',
      database,
      connectionLimit: 4,
      charset: 'utf8mb4',
      // MariaDB otherwise reports unchanged duplicate-key updates as affected rows.
      flags: '-FOUND_ROWS',
      dateStrings: true,
      timezone: 'Z',
    });
    return this.pool;
  }

  async query(sql: string, values: unknown[] = []): Promise<any> {
    return this.runQuery(this.getPool(), sql, values);
  }

  async transaction<T>(work: (db: LegacyConnection) => Promise<T>): Promise<T> {
    const connection = await new Promise<any>((resolve, reject) =>
      this.getPool().getConnection((error: Error | null, value: any) =>
        error ? reject(error) : resolve(value),
      ),
    );
    try {
      await new Promise<void>((resolve, reject) =>
        connection.beginTransaction((error: Error | null) =>
          error ? reject(error) : resolve(),
        ),
      );
      const result = await work({
        query: (sql, values = []) => this.runQuery(connection, sql, values),
      });
      await new Promise<void>((resolve, reject) =>
        connection.commit((error: Error | null) =>
          error ? reject(error) : resolve(),
        ),
      );
      return result;
    } catch (error) {
      await new Promise<void>((resolve) =>
        connection.rollback(() => resolve()),
      );
      throw error;
    } finally {
      connection.release();
    }
  }

  private runQuery(client: any, sql: string, values: unknown[]): Promise<any> {
    return new Promise((resolve, reject) =>
      client.query(sql, values, (error: Error | null, rows: any[]) =>
        error ? reject(error) : resolve(rows),
      ),
    );
  }

  onModuleDestroy(): void {
    this.pool?.end();
  }
}
