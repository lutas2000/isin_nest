import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  // 驗證使用者是否存在，並檢查密碼（從資料庫）
  async validateUser(userName: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { userName },
      relations: ['staff'], // 載入關聯的 staff 資料
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
    features?: string[],
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
      features: features ?? [],
    });

    // 儲存到資料庫
    return await this.userRepository.save(newUser);
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, staff: __, ...userWithoutPassword } = user;

    return {
      access_token: this.jwtService.sign(payload), // 簽發 JWT
      user: {
        ...userWithoutPassword,
        staff: staffData,
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
      features?: string[];
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
      targetUser.features = updateData.features;
    }

    // 儲存到資料庫
    return await this.userRepository.save(targetUser);
  }
}
