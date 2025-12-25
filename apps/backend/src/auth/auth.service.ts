import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from './entities/user.entity';
import { Feature } from './entities/feature.entity';
import { UserFeature, PermissionType } from './entities/user-feature.entity';
import { FeatureConfig } from './entities/feature-config.entity';
import { FeaturePermission } from './entities/feature-permission.entity';
import { FeaturePermissionInput } from './dto/auth.dto';
import { Staff } from '../hr/staff/entities/staff.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Feature)
    private readonly featureRepository: Repository<Feature>,
    @InjectRepository(UserFeature)
    private readonly userFeatureRepository: Repository<UserFeature>,
    @InjectRepository(FeatureConfig)
    private readonly featureConfigRepository: Repository<FeatureConfig>,
    @InjectRepository(FeaturePermission)
    private readonly featurePermissionRepository: Repository<FeaturePermission>,
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
    private readonly jwtService: JwtService,
  ) {}

  // 驗證使用者是否存在，並檢查密碼（從資料庫）
  async validateUser(userName: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { userName },
      relations: ['staff', 'userFeatures', 'userFeatures.feature'], // 載入關聯的 staff 和 feature 資料
    });

    if (!user) {
      return null;
    }

    // 比較提供的密碼與資料庫中儲存的雜湊密碼
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (isPasswordValid) {
      return user;
    }

    return null;
  }

  // 建立新使用者，密碼以雜湊形式儲存
  async createUser(
    userName: string,
    password: string,
    isAdmin?: boolean,
    features?: FeaturePermissionInput[],
  ): Promise<User> {
    // 檢查使用者是否已存在
    const existingUser = await this.userRepository.findOne({
      where: { userName },
    });

    if (existingUser) {
      throw new Error('使用者已存在');
    }

    // 產生鹽值並雜湊密碼
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 建立新使用者物件
    const newUser = this.userRepository.create({
      userName,
      password: hashedPassword,
      isAdmin: isAdmin ?? false,
    });

    // 儲存使用者
    const savedUser = await this.userRepository.save(newUser);

    // 處理功能權限
    if (features && features.length > 0) {
      await this.setUserFeatures(savedUser.id, features);
    }

    // 重新載入使用者以包含關聯資料
    return await this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ['userFeatures', 'userFeatures.feature'],
    }) as User;
  }

  // 設定用戶的功能權限
  private async setUserFeatures(
    userId: number,
    features: FeaturePermissionInput[],
  ): Promise<void> {
    // 先刪除現有的權限
    await this.userFeatureRepository.delete({ user: { id: userId } });

    // 為每個 feature 創建或更新權限
    for (const featureInput of features) {
      // 查找或創建 feature
      let feature = await this.featureRepository.findOne({
        where: { name: featureInput.feature },
      });

      if (!feature) {
        feature = this.featureRepository.create({
          name: featureInput.feature,
        });
        feature = await this.featureRepository.save(feature);
      }

      // 創建或更新 user feature
      const userFeature = this.userFeatureRepository.create({
        user: { id: userId },
        feature: feature,
        permission: featureInput.permission,
      });

      await this.userFeatureRepository.save(userFeature);
    }
  }

  // 簽發 JWT Token 並返回用戶資訊
  login(user: User) {
    const payload = { userName: user.userName, sub: user.id };

    // 處理 staff 資料，排除薪資相關欄位
    // 明確標註型別，避免被推斷為僅能是 null
    let staffData: any = null;
    if (user.staff) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const {
        wage,
        allowance,
        organizer,
        labor_insurance,
        health_insurance,
        pension,
        user: _user,
        ...staffWithoutSalary
      } = user.staff;
      staffData = staffWithoutSalary;
    }

    // 處理 userFeatures 資料
    const featuresData = user.userFeatures?.map((uf) => ({
      feature: uf.feature.name,
      permission: uf.permission,
    })) || [];

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, staff: __, userFeatures: ___, ...userWithoutPassword } = user;

    return {
      access_token: this.jwtService.sign(payload), // 簽發 JWT
      user: {
        ...userWithoutPassword,
        staff: staffData,
        features: featuresData,
      },
    };
  }

  // 重設密碼功能
  async resetPassword(
    targetUserName: string,
    newPassword: string,
    currentUser: User,
    oldPassword?: string,
  ): Promise<User> {
    // 尋找目標使用者
    const targetUser = await this.userRepository.findOne({
      where: { userName: targetUserName },
    });

    if (!targetUser) {
      throw new Error('使用者不存在');
    }
    if (currentUser.userName !== targetUserName) {
      throw new Error('您只能重設自己的密碼');
    }
    if (!oldPassword) {
      throw new Error('請提供舊密碼');
    }

    // 驗證舊密碼
    const isOldPasswordValid = await bcrypt.compare(
      oldPassword,
      targetUser.password,
    );
    if (!isOldPasswordValid) {
      throw new Error('舊密碼不正確');
    }

    // 產生新密碼的雜湊值
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // 更新密碼
    targetUser.password = hashedNewPassword;

    // 儲存到資料庫
    return await this.userRepository.save(targetUser);
  }

  // 更新用戶資料功能（僅限管理員）
  async updateUser(
    targetUserName: string,
    updateData: {
      newUserName?: string;
      password?: string;
      isAdmin?: boolean;
      features?: FeaturePermissionInput[];
    },
    currentUser: User,
  ): Promise<User> {
    // 檢查權限：只有管理員可以使用此功能
    if (!currentUser.isAdmin) {
      throw new Error('權限不足：只有管理員可以更新用戶資料');
    }

    // 尋找目標使用者
    const targetUser = await this.userRepository.findOne({
      where: { userName: targetUserName },
    });

    if (!targetUser) {
      throw new Error('使用者不存在');
    }

    // 如果要更新用戶名稱，檢查新用戶名稱是否已存在
    if (updateData.newUserName && updateData.newUserName !== targetUserName) {
      const existingUser = await this.userRepository.findOne({
        where: { userName: updateData.newUserName },
      });

      if (existingUser) {
        throw new Error('新用戶名稱已存在');
      }

      targetUser.userName = updateData.newUserName;
    }

    // 更新密碼（如果提供）
    if (updateData.password) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(updateData.password, saltRounds);
      targetUser.password = hashedPassword;
    }

    // 更新管理員狀態（如果提供）
    if (updateData.isAdmin !== undefined) {
      targetUser.isAdmin = updateData.isAdmin;
    }

    // 更新功能權限（如果提供）
    if (updateData.features !== undefined) {
      await this.setUserFeatures(targetUser.id, updateData.features);
    }

    // 儲存到資料庫
    await this.userRepository.save(targetUser);

    // 重新載入使用者以包含關聯資料
    return await this.userRepository.findOne({
      where: { id: targetUser.id },
      relations: ['userFeatures', 'userFeatures.feature'],
    }) as User;
  }

  // 同時創建 user 和 staff
  async createUserWithStaff(
    userName: string,
    password: string,
    staffData: Partial<Staff>,
    isAdmin?: boolean,
  ): Promise<{ user: User; staff: Staff }> {
    // 檢查使用者是否已存在
    const existingUser = await this.userRepository.findOne({
      where: { userName },
    });

    if (existingUser) {
      throw new Error('使用者已存在');
    }

    // 產生鹽值並雜湊密碼
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 建立新使用者物件
    const newUser = this.userRepository.create({
      userName,
      password: hashedPassword,
      isAdmin: isAdmin ?? false,
    });

    // 儲存使用者
    const savedUser = await this.userRepository.save(newUser);

    // 使用 user.id 作為 staff.id（轉換為字符串，確保長度不超過 10）
    const staffId = String(savedUser.id).padStart(10, '0').slice(0, 10);

    // 檢查 staff.id 是否已存在
    const existingStaff = await this.staffRepository.findOne({
      where: { id: staffId },
    });

    if (existingStaff) {
      // 如果 staff 已存在，刪除剛創建的 user
      await this.userRepository.delete(savedUser.id);
      throw new Error('員工編號已存在');
    }

    // 建立新員工物件
    const newStaff = this.staffRepository.create({
      id: staffId,
      userId: savedUser.id,
      name: staffData.name,
      post: staffData.post,
      work_group: staffData.work_group,
      department: staffData.department,
      wage: staffData.wage ?? 0,
      allowance: staffData.allowance ?? 0,
      organizer: staffData.organizer ?? 0,
      labor_insurance: staffData.labor_insurance ?? 0,
      health_insurance: staffData.health_insurance ?? 0,
      pension: staffData.pension ?? 0,
      is_foreign: staffData.is_foreign ?? false,
      benifit: staffData.benifit ?? false,
      need_check: staffData.need_check ?? true,
      begain_work: staffData.begain_work,
      stop_work: staffData.stop_work,
      have_fake: staffData.have_fake ?? false,
    });

    // 儲存員工
    const savedStaff = await this.staffRepository.save(newStaff);

    // 根據職稱設定預設權限
    if (staffData.post) {
      await this.applyJobTitlePermissions(savedUser.id, staffData.post);
    }

    // 重新載入使用者以包含關聯資料
    const userWithRelations = await this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ['userFeatures', 'userFeatures.feature', 'staff'],
    }) as User;

    return {
      user: userWithRelations,
      staff: savedStaff,
    };
  }

  // 根據職稱應用預設權限
  private async applyJobTitlePermissions(
    userId: number,
    jobTitle: string,
  ): Promise<void> {
    // 查找職稱的預設權限配置
    const featureConfig = await this.featureConfigRepository.findOne({
      where: { jobTitle },
      relations: ['permissions', 'permissions.feature'],
    });

    if (!featureConfig || !featureConfig.permissions) {
      // 如果沒有找到配置，不設定任何權限
      return;
    }

    // 為每個預設權限創建 user feature
    for (const permission of featureConfig.permissions) {
      // 獲取 feature（應該已經通過 relations 載入）
      const feature = permission.feature;

      if (!feature) {
        continue;
      }

      // 檢查是否已存在相同的 user feature
      const existingUserFeature = await this.userFeatureRepository.findOne({
        where: {
          user: { id: userId },
          feature: { id: feature.id },
        },
      });

      if (existingUserFeature) {
        // 如果已存在，更新權限
        existingUserFeature.permission = permission.permission;
        await this.userFeatureRepository.save(existingUserFeature);
      } else {
        // 創建新的 user feature
        const userFeature = this.userFeatureRepository.create({
          user: { id: userId },
          feature: feature,
          permission: permission.permission,
        });

        await this.userFeatureRepository.save(userFeature);
      }
    }
  }
}
