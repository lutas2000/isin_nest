import { Injectable } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  // constructor(private configService: ConfigService) {}

  // getDatabaseConfig() {
  //   return {
  //     host: this.configService.get<string>('DB_HOST'),
  //     port: this.configService.get<number>('DB_PORT'),
  //     user: this.configService.get<string>('DB_USER'),
  //     password: this.configService.get<string>('DB_PASS'),
  //     database: this.configService.get<string>('DB_NAME'),
  //   };
  // }

  getHello(): string {
    return 'Hello World!';
  }
}
