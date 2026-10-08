import {
  INestApplication,
  RequestMethod,
  UnauthorizedException,
} from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import { getFeatureByName } from '../../auth/config/features.config';
import { FEATURE_PERMISSION_KEY } from '../../auth/decorators/feature-permission.decorator';
import { Feature } from '../../auth/entities/feature.entity';
import {
  PermissionType,
  UserFeature,
} from '../../auth/entities/user-feature.entity';
import { User } from '../../auth/entities/user.entity';
import { FeatureGuard } from '../../auth/guards/feature.guard';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AdminGuard } from '../../auth/admin.guard';
import { CrmConfigController } from '../config/config.controller';
import { ContactController } from '../contact/contact.controller';
import { CustomerController } from '../customer/customer.controller';
import { CustomerService } from '../customer/customer.service';
import { CuttingWorkOrderController } from '../cutting-work-order/cutting-work-order.controller';
import { DeliveryWorkOrderController } from '../delivery-work-order/delivery-work-order.controller';
import { DesignWorkOrderController } from '../design-work-order/design-work-order.controller';
import { NestingController } from '../nesting/nesting.controller';
import { OrderItemController } from '../order-item/order-item.controller';
import { OrderController } from '../order/order.controller';
import { OutsourcingCostController } from '../outsourcing-cost/outsourcing-cost.controller';
import { ProcessingWorkOrderController } from '../processing-work-order/processing-work-order.controller';
import { ProcessingController } from '../processing/processing.controller';
import { QuoteItemController } from '../quote-item/quote-item.controller';
import { QuoteController } from '../quote/quote.controller';
import { SalesVoucherItemController } from '../sales-voucher-item/sales-voucher-item.controller';
import { SalesVoucherController } from '../sales-voucher/sales-voucher.controller';
import { VendorController } from '../vendor/vendor.controller';
import { CRM_V2_FEATURE } from './crm-v2-access';

// 新版 CRM 暫不使用（LEGACY-CRM-REBUILD-PLAN.md 第 6 節）：每個 API 都要 crm_v2，且沒有人被授權。
const CONTROLLERS = [
  CrmConfigController,
  ContactController,
  CustomerController,
  CuttingWorkOrderController,
  DeliveryWorkOrderController,
  DesignWorkOrderController,
  NestingController,
  OrderItemController,
  OrderController,
  OutsourcingCostController,
  ProcessingWorkOrderController,
  ProcessingController,
  QuoteItemController,
  QuoteController,
  SalesVoucherItemController,
  SalesVoucherController,
  VendorController,
];

describe('新版 CRM 的 crm_v2 守衛', () => {
  it('涵蓋 src/crm 底下所有 controller', () => {
    const crmDir = join(__dirname, '..');
    const files = readdirSync(crmDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .flatMap((d) =>
        readdirSync(join(crmDir, d.name)).filter((f) =>
          f.endsWith('.controller.ts'),
        ),
      );
    expect(files).toHaveLength(CONTROLLERS.length);
  });

  it.each(CONTROLLERS.map((c) => [c.name, c] as const))(
    '%s：登入 + FeatureGuard，GET 要 crm_v2 read，其餘要 write',
    (_name, controller) => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        controller,
      ) as unknown[];
      expect(guards.slice(0, 2)).toEqual([JwtAuthGuard, FeatureGuard]);

      const prototype = controller.prototype as unknown as Record<
        string,
        unknown
      >;
      const handlers = Object.getOwnPropertyNames(prototype)
        .filter((key) => key !== 'constructor')
        .map((key) => prototype[key])
        .filter(
          (fn): fn is object =>
            typeof fn === 'function' &&
            Reflect.getMetadata(PATH_METADATA, fn) !== undefined,
        );
      expect(handlers.length).toBeGreaterThan(0);
      for (const handler of handlers) {
        const method = Reflect.getMetadata(
          METHOD_METADATA,
          handler,
        ) as RequestMethod;
        expect(Reflect.getMetadata(FEATURE_PERMISSION_KEY, handler)).toEqual({
          feature: CRM_V2_FEATURE,
          permission:
            method === RequestMethod.GET
              ? PermissionType.READ
              : PermissionType.WRITE,
        });
      }
    },
  );

  it('crm 設定仍需 admin，且在登入之後檢查', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      CrmConfigController,
    ) as unknown[];
    expect(guards).toEqual([JwtAuthGuard, FeatureGuard, AdminGuard]);
  });

  it('crm_v2 不在可授權清單，也沒有 migration 建立它', () => {
    expect(getFeatureByName(CRM_V2_FEATURE)).toBeUndefined();
    const migrationsDir = join(__dirname, '..', '..', 'migrations');
    for (const file of readdirSync(migrationsDir)) {
      expect(readFileSync(join(migrationsDir, file), 'utf8')).not.toContain(
        CRM_V2_FEATURE,
      );
    }
  });
});

describe('新版 CRM API 的實際存取（真的 FeatureGuard，假的資料庫）', () => {
  let app: INestApplication;
  const customers = {
    findAll: jest.fn(async () => ({ data: [], total: 0 })),
    create: jest.fn(async () => ({ id: 'C1' })),
  };
  // 權限表：預設沒有 crm_v2 這個 feature（與正式環境相同）
  let crmV2Exists = false;
  let grant: PermissionType | null = null;
  const users: Record<string, Partial<User>> = {
    admin: { id: 1, isAdmin: true },
    user: { id: 2, isAdmin: false },
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [CustomerController],
      providers: [
        FeatureGuard,
        { provide: CustomerService, useValue: customers },
        { provide: getRepositoryToken(User), useValue: {} },
        {
          provide: getRepositoryToken(Feature),
          useValue: {
            findOne: async () =>
              crmV2Exists ? { id: 9, name: CRM_V2_FEATURE } : null,
          },
        },
        {
          provide: getRepositoryToken(UserFeature),
          useValue: {
            findOne: async () => (grant ? { permission: grant } : null),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context) {
          const req = context.switchToHttp().getRequest();
          const user =
            users[
              String(req.headers.authorization ?? '').replace('Bearer ', '')
            ];
          if (!user) throw new UnauthorizedException();
          req.user = user;
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => app.close());
  beforeEach(() => {
    crmV2Exists = false;
    grant = null;
  });

  const get = (who?: string) => {
    const req = request(app.getHttpServer()).get('/crm/customers');
    return who ? req.set('Authorization', `Bearer ${who}`) : req;
  };

  it('未登入 401', async () => {
    await get().expect(401);
  });

  it('一般使用者 403（crm_v2 不存在）', async () => {
    await get('user').expect(403);
    expect(customers.findAll).not.toHaveBeenCalled();
  });

  it('admin 可用', async () => {
    await get('admin').expect(200);
  });

  it('手動授權 crm_v2 read 後可讀不可寫', async () => {
    crmV2Exists = true;
    grant = PermissionType.READ;
    await get('user').expect(200);
    await request(app.getHttpServer())
      .post('/crm/customers')
      .set('Authorization', 'Bearer user')
      .send({ companyName: 'X' })
      .expect(403);
    expect(customers.create).not.toHaveBeenCalled();
  });
});
