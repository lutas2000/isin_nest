import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Feature } from '../entities/feature.entity';
import { UserFeature, PermissionType } from '../entities/user-feature.entity';
import {
  FEATURE_PERMISSION_KEY,
  FeaturePermissionMetadata,
} from '../decorators/feature-permission.decorator';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Feature)
    private readonly featureRepository: Repository<Feature>,
    @InjectRepository(UserFeature)
    private readonly userFeatureRepository: Repository<UserFeature>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.get<FeaturePermissionMetadata>(
      FEATURE_PERMISSION_KEY,
      context.getHandler(),
    );

    // 如果沒有設定 feature 權限要求，則允許通過
    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user) {
      throw new ForbiddenException('未授權的用戶');
    }

    // 管理員擁有所有權限
    if (user.isAdmin) {
      return true;
    }

    // 如果 userFeatures 已經載入，直接使用
    if (user.userFeatures && user.userFeatures.length > 0) {
      const userFeature = user.userFeatures.find(
        (uf) => uf.feature?.name === metadata.feature,
      );

      if (!userFeature) {
        throw new ForbiddenException(
          `您沒有 '${metadata.feature}' 功能的權限`,
        );
      }

      // 檢查權限
      if (metadata.permission === PermissionType.WRITE) {
        if (userFeature.permission !== PermissionType.WRITE) {
          throw new ForbiddenException(
            `您沒有 '${metadata.feature}' 功能的寫入權限`,
          );
        }
      } else if (metadata.permission === PermissionType.READ) {
        // read 權限：有 read 或 write 都可以
        if (
          userFeature.permission !== PermissionType.READ &&
          userFeature.permission !== PermissionType.WRITE
        ) {
          throw new ForbiddenException(
            `您沒有 '${metadata.feature}' 功能的讀取權限`,
          );
        }
      }

      return true;
    }

    // 如果 userFeatures 沒有載入，則查詢資料庫
    const feature = await this.featureRepository.findOne({
      where: { name: metadata.feature },
    });

    if (!feature) {
      throw new ForbiddenException(`功能 '${metadata.feature}' 不存在`);
    }

    // 查找用戶的 feature 權限
    const userFeature = await this.userFeatureRepository.findOne({
      where: {
        user: { id: user.id },
        feature: { id: feature.id },
      },
      relations: ['user', 'feature'],
    });

    if (!userFeature) {
      throw new ForbiddenException(
        `您沒有 '${metadata.feature}' 功能的權限`,
      );
    }

    // 檢查權限
    // 如果是要求 write 權限，則必須有 write 權限
    // 如果是要求 read 權限，則只要有 read 或 write 權限即可
    if (metadata.permission === PermissionType.WRITE) {
      if (userFeature.permission !== PermissionType.WRITE) {
        throw new ForbiddenException(
          `您沒有 '${metadata.feature}' 功能的寫入權限`,
        );
      }
    } else if (metadata.permission === PermissionType.READ) {
      // read 權限：有 read 或 write 都可以
      if (
        userFeature.permission !== PermissionType.READ &&
        userFeature.permission !== PermissionType.WRITE
      ) {
        throw new ForbiddenException(
          `您沒有 '${metadata.feature}' 功能的讀取權限`,
        );
      }
    }

    return true;
  }
}

