import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FeatureConfigController } from './feature-config.controller';
import { FeatureConfigService } from './feature-config.service';
import { FeatureController } from './feature.controller';
import { FeatureService } from './feature.service';
import { User } from './entities/user.entity';
import { Feature } from './entities/feature.entity';
import { UserFeature } from './entities/user-feature.entity';
import { FeatureConfig } from './entities/feature-config.entity';
import { FeaturePermission } from './entities/feature-permission.entity';
import { Staff } from '../hr/staff/entities/staff.entity';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { FeatureGuard } from './guards/feature.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Feature,
      UserFeature,
      FeatureConfig,
      FeaturePermission,
      Staff,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [AuthController, FeatureConfigController, FeatureController],
  providers: [AuthService, FeatureConfigService, FeatureService, JwtStrategy, JwtAuthGuard, AdminGuard, FeatureGuard],
  exports: [AuthService, JwtAuthGuard, AdminGuard, FeatureGuard],
})
export class AuthModule {}
