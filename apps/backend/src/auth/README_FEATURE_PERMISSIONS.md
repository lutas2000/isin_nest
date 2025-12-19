# Feature 權限管理系統

## 概述

本系統提供了細粒度的功能權限管理，每個 feature 都可以設定 `read` 或 `write` 權限。擁有 `write` 權限的用戶自動擁有 `read` 權限。

## 資料庫結構

### Feature Entity
定義系統中可用的功能列表。

### UserFeature Entity
儲存用戶對特定功能的權限（read/write）。

## 使用方式

### 1. 在 Controller 中使用 FeatureGuard

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeatureGuard } from '../auth/guards/feature.guard';
import { RequireFeature } from '../auth/decorators/feature-permission.decorator';
import { PermissionType } from '../auth/entities/user-feature.entity';

@Controller('crm/customers')
@UseGuards(JwtAuthGuard, FeatureGuard)
export class CustomerController {
  // 需要 read 權限
  @Get()
  @RequireFeature('crm', PermissionType.READ)
  async findAll() {
    // 讀取操作
  }

  // 需要 read 權限
  @Get(':id')
  @RequireFeature('crm', PermissionType.READ)
  async findOne(@Param('id') id: string) {
    // 讀取操作
  }

  // 需要 write 權限
  @Post()
  @RequireFeature('crm', PermissionType.WRITE)
  async create(@Body() data: Partial<Customer>) {
    // 寫入操作
  }

  // 需要 write 權限
  @Post(':id')
  @RequireFeature('crm', PermissionType.WRITE)
  async update(@Param('id') id: string, @Body() data: Partial<Customer>) {
    // 寫入操作
  }

  // 需要 write 權限
  @Delete(':id')
  @RequireFeature('crm', PermissionType.WRITE)
  async remove(@Param('id') id: string) {
    // 寫入操作
  }
}
```

### 2. 權限檢查邏輯

- **管理員**：自動擁有所有功能的 read 和 write 權限
- **read 權限**：可以讀取資料
- **write 權限**：可以讀取和寫入資料（包含 read 權限）

### 3. 創建用戶時設定權限

```typescript
// 在註冊或更新用戶時
const features = [
  { feature: 'crm', permission: PermissionType.READ },
  { feature: 'hr', permission: PermissionType.WRITE },
];

// 使用 auth API
await authService.createUser(
  'username',
  'password',
  false,
  features
);
```

### 4. API 回應

如果用戶沒有權限，系統會回傳 `403 Forbidden` 錯誤，訊息如下：
- `您沒有 'feature_name' 功能的權限`
- `您沒有 'feature_name' 功能的讀取權限`
- `您沒有 'feature_name' 功能的寫入權限`

### 5. 在 Module 中導入 FeatureGuard

如果要在其他 module 中使用 FeatureGuard，需要確保 AuthModule 已經被導入：

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';

@Module({
  imports: [AuthModule],
  controllers: [CustomerController],
  providers: [CustomerService],
})
export class CustomerModule {}
```

## 遷移注意事項

從舊的 `features: string[]` 格式遷移到新的權限系統時，需要：

1. 執行資料庫遷移以創建新的 tables（features, user_features）
2. 將現有的 features 資料轉換為新的格式
3. 更新前端代碼以使用新的權限格式
4. 在需要權限檢查的 controller 中添加 `@UseGuards(JwtAuthGuard, FeatureGuard)` 和 `@RequireFeature()` decorator

