# Hướng dẫn dựng `user-service`

Service này **xác thực** (username, password, role, cấp JWT) và **quản lý thông tin người dùng**. Đây là service mẫu: các service khác sao chép khung này (checklist ở cuối file).

> Điều kiện: đã làm xong **mục 9 "Khởi tạo nền"** trong `folder_structure.md` (monorepo, `libs/shared`, package, `.env` gốc có `RABBITMQ_URL` và `JWT_SECRET`), database `user_db` trên Neon **đã có sẵn bảng và dữ liệu** (service này chỉ *pull* schema về, không tạo bảng, không migrate, không seed).

---

## 0. Phạm vi

### Lệnh (RPC) service phục vụ

| Pattern | Payload | Trả về | Ai gọi |
|---|---|---|---|
| `cmd.user.register` | `RegisterDto` | `UserView` (role luôn là `EMPLOYEE`) | Gateway `POST /auth/register` |
| `cmd.user.login` | `LoginDto` | `LoginResult` `{accessToken, user}` | Gateway `POST /auth/login` |
| `cmd.user.change_password` | `{actorId, dto}` | `{message}` | Gateway `PATCH /auth/change-password` |
| `cmd.user.create` | `{dto: CreateUserDto, actorId}` | `UserView` | ADMIN tạo user có role |
| `cmd.user.find_all` | `FindUsersQueryDto` | `Paginated<UserView>` | ADMIN, MANAGER |
| `cmd.user.find_by_id` | `{id}` | `UserView` | Gateway `/auth/me`, `/users/:id` |
| `cmd.user.update` | `{id, data, actor}` | `UserView` | Chính chủ hoặc ADMIN |
| `cmd.user.update_role` | `{id, role, actor}` | `UserView` | ADMIN |
| `cmd.user.deactivate` | `{id, actor}` | `UserView` | ADMIN |
| `cmd.user.stats` | `{}` | `UserStats` | report-service |

### Sự kiện service phát

`evt.user.registered`, `created`, `logged_in`, `login_failed`, `updated`, `role_changed`, `password_changed`, `deactivated`. Service này **chưa nhận** sự kiện nào (thư mục `consumers/` để dành, xem mục 12).

### Quyết định thiết kế

- `user-service` **ký** JWT, `api-gateway` **xác minh** bằng cùng `JWT_SECRET`. Chỉ có access token (chưa có refresh token).
- Gateway kiểm tra role thô (ai được vào route nào); `user-service` kiểm tra quy tắc nghiệp vụ (chính chủ hoặc admin, không tự đổi role của mình).
- Một bảng `users` chứa cả thông tin đăng nhập lẫn hồ sơ.
- Dữ liệu người dùng (kể cả admin) đã có sẵn trong Neon nên **không có seeder**. Schema Prisma được kéo về bằng `prisma db pull`, không dùng `prisma migrate`.

---

## 1. Tạo contract trong shared

Contract là nơi `api-gateway` và `user-service` thống nhất với nhau. Tạo thư mục `libs/shared/src/contracts/user/` với 6 file. (Bên trong `libs/shared` dùng import tương đối, không dùng `@app/shared`.)

`user.patterns.ts`

```ts
export const USER_CMD = {
  REGISTER: 'cmd.user.register',
  LOGIN: 'cmd.user.login',
  CHANGE_PASSWORD: 'cmd.user.change_password',
  CREATE: 'cmd.user.create',
  FIND_ALL: 'cmd.user.find_all',
  FIND_BY_ID: 'cmd.user.find_by_id',
  UPDATE: 'cmd.user.update',
  UPDATE_ROLE: 'cmd.user.update_role',
  DEACTIVATE: 'cmd.user.deactivate',
  STATS: 'cmd.user.stats',
} as const;

export const USER_EVT = {
  REGISTERED: 'evt.user.registered',
  CREATED: 'evt.user.created',
  LOGGED_IN: 'evt.user.logged_in',
  LOGIN_FAILED: 'evt.user.login_failed',
  UPDATED: 'evt.user.updated',
  ROLE_CHANGED: 'evt.user.role_changed',
  PASSWORD_CHANGED: 'evt.user.password_changed',
  DEACTIVATED: 'evt.user.deactivated',
} as const;
```

`user.dto.ts` (DTO đi qua ranh giới gateway ↔ service nên đặt ở đây, một định nghĩa duy nhất)

```ts
import { Type } from 'class-transformer';
import {
  IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString,
  Matches, Max, MaxLength, Min, MinLength,
} from 'class-validator';
import { Role } from '../../types/role';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9_.]+$/, { message: 'username chỉ gồm chữ, số, dấu _ và .' })
  username: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // giới hạn của bcrypt
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() department?: string;
}

export class CreateUserDto extends RegisterDto {
  @IsIn(Object.values(Role))
  role: Role;
}

export class LoginDto {
  @IsString() @IsNotEmpty() username: string;
  @IsString() @IsNotEmpty() password: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() @IsNotEmpty() fullName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() department?: string;
}

export class UpdateRoleDto {
  @IsIn(Object.values(Role))
  role: Role;
}

export class ChangePasswordDto {
  @IsString() @IsNotEmpty() currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;
}

export class FindUsersQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(Object.values(Role)) role?: Role;
}
```

`user.messages.ts` (payload gói nhiều thông tin: DTO + người thực hiện)

```ts
import { JwtPayload } from '../../types/jwt-payload';
import { Role } from '../../types/role';
import { ChangePasswordDto, CreateUserDto, UpdateUserDto } from './user.dto';

export interface CreateUserMsg { dto: CreateUserDto; actorId: string }
export interface FindUserByIdMsg { id: string }
export interface UpdateUserMsg { id: string; data: UpdateUserDto; actor: JwtPayload }
export interface UpdateRoleMsg { id: string; role: Role; actor: JwtPayload }
export interface DeactivateUserMsg { id: string; actor: JwtPayload }
export interface ChangePasswordMsg { actorId: string; dto: ChangePasswordDto }
```

`user.types.ts` (kiểu trả về)

```ts
import { Role } from '../../types/role';

export interface UserView {
  id: string;
  username: string;
  role: Role;
  fullName: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResult { accessToken: string; user: UserView }

export interface UserStats {
  total: number;
  active: number;
  byRole: Record<string, number>;
}
```

`user.events.ts` (payload sự kiện, **không** có mật khẩu/hash)

```ts
import { Role } from '../../types/role';

export interface UserEventPayload { userId: string; username: string; role: Role }   // registered, created, deactivated
export interface UserLoggedInPayload { userId: string; username: string }
export interface UserLoginFailedPayload {
  username: string;
  reason: 'USER_NOT_FOUND' | 'WRONG_PASSWORD' | 'INACTIVE';
}
export interface UserUpdatedPayload { userId: string; changedFields: string[] }
export interface UserRoleChangedPayload { userId: string; oldRole: Role; newRole: Role }
export interface UserPasswordChangedPayload { userId: string }
```

`index.ts`

```ts
export * from './user.patterns';
export * from './user.dto';
export * from './user.messages';
export * from './user.types';
export * from './user.events';
```

Rồi trong `libs/shared/src/index.ts` bỏ comment dòng `export * from './contracts/user';`.

---

## 2. Dọn app và tạo thư mục

`nest g app user-service` đã tạo `apps/user-service/` (bước nền). Tạo thêm cây thư mục:

```bash
mkdir -p apps/user-service/prisma
mkdir -p apps/user-service/src/prisma
mkdir -p apps/user-service/src/messaging/consumers
mkdir -p apps/user-service/src/modules/auth
mkdir -p apps/user-service/src/modules/users
```

(`consumers/` tạm để trống; Git không lưu thư mục rỗng, thêm file `.gitkeep` nếu muốn giữ.)

---

## 3. Prisma

### 3.1 Schema: chỉ tạo khung, phần model sẽ được pull về

Tạo `apps/user-service/prisma/schema.prisma` chỉ với generator và datasource (chưa có model):

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/prisma/generated"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
}
```

Model `User` và enum `Role` sẽ do bước 3.5 sinh ra từ database thật.

### 3.2 Config: `apps/user-service/prisma.config.ts`

```ts
import { defineConfig, env } from 'prisma/config';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Lệnh prisma luôn chạy từ thư mục gốc (xem scripts ở bước 3.3)
dotenv.config({ path: resolve(process.cwd(), 'apps/user-service/.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',          // tương đối so với file config này
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('DIRECT_URL') }, // CLI dùng kết nối direct của Neon
});
```

Nếu Prisma báo không tìm thấy schema, đổi hai đường dẫn trên sang tuyệt đối bằng `resolve(process.cwd(), 'apps/user-service/prisma/...')`.

### 3.3 Scripts trong `package.json` (gốc)

```json
"scripts": {
  "prisma:pull:user": "prisma db pull --config apps/user-service/prisma.config.ts",
  "prisma:generate:user": "prisma generate --config apps/user-service/prisma.config.ts",
  "prisma:studio:user": "prisma studio --config apps/user-service/prisma.config.ts",
  "start:user": "nest start user-service --watch"
}
```

Không có script `migrate`/`deploy`: schema do database quyết định, service không thay đổi cấu trúc bảng.

### 3.4 `.env` của service

Tạo `apps/user-service/.env.example` (commit) rồi copy thành `.env` (không commit):

```env
# Pooled (host có -pooler) – dùng lúc chạy
DATABASE_URL=postgresql://<user>:<pass>@<host>-pooler.<region>.aws.neon.tech/user_db?sslmode=require
# Direct – dùng cho prisma db pull
DIRECT_URL=postgresql://<user>:<pass>@<host>.<region>.aws.neon.tech/user_db?sslmode=require

JWT_EXPIRES_IN=1d
```

### 3.5 Pull schema từ Neon

```bash
npm run prisma:pull:user
```

Lệnh này đọc cấu trúc bảng trong `user_db` và ghi `model`/`enum` vào `schema.prisma` (giữ nguyên generator và datasource). Sau đó **chỉnh tay một lần** để khớp với code trong hướng dẫn:

1. Đổi tên model về `User`, field về camelCase, giữ tên bảng/cột thật bằng `@@map`/`@map`. Ví dụ bảng `users` có cột `password_hash` sẽ thành:

   ```prisma
   model User {
     id           String   @id @default(uuid())
     username     String   @unique
     passwordHash String   @map("password_hash")
     // ... các field còn lại
     @@map("users")
   }
   ```

2. Code ở mục 6 và 7 giả định model `User` có các field: `id`, `username`, `passwordHash`, `role`, `fullName`, `email`, `phone`, `department`, `isActive`, `createdAt`, `updatedAt`. **Nếu schema thật khác** (tên field khác, thiếu/thừa field), sửa `user.mapper.ts`, `users.service.ts`, `auth.service.ts` và `UserView` trong `libs/shared/.../user.types.ts` cho khớp, đừng đổi database.

Rồi sinh client:

```bash
npm run prisma:generate:user
```

Kiểm tra trước khi viết tiếp code:

| Cần kiểm tra | Nếu không khớp |
|---|---|
| Kiểu `id` là `uuid`/`String` | Nếu là `Int`/`BigInt`: đổi `id: string` thành `number` trong contract, bỏ `ParseUUIDPipe` (dùng `ParseIntPipe`) ở gateway. |
| `role` là enum với 4 giá trị `ADMIN, MANAGER, TECHNICIAN, EMPLOYEE` | Nếu là `varchar` hoặc giá trị khác: sửa `libs/shared/src/types/role.ts` cho khớp dữ liệu thật. |
| Mật khẩu đã lưu dạng bcrypt (bắt đầu bằng `$2a$`/`$2b$`) | Nếu là plaintext hoặc thuật toán khác thì đăng nhập sẽ luôn thất bại; cần băm lại dữ liệu hoặc đổi thuật toán trong `AuthService`/`UsersService`. |
| Có cột `isActive` (hoặc tương đương) | Nếu không có: bỏ kiểm tra `isActive` và hàm `deactivate`, hoặc đổi sang cột trạng thái thật. |
| `username`/`email` có ràng buộc unique | Nếu không có, `findUnique({ where: { username } })` sẽ lỗi; đổi sang `findFirst`. |

Lưu ý:

- **Không chạy `prisma migrate dev`** trên database đã có dữ liệu (Prisma sẽ đòi reset). Muốn quản lý bằng migration về sau thì phải baseline trước, đó là việc của bước khác.
- Chạy lại `db pull` sẽ ghi đè các chỉnh tay ở trên; chỉ pull lại khi cấu trúc bảng thay đổi, rồi áp lại các `@map`.
- Thư mục `prisma/migrations/` và dòng `migrations` trong `prisma.config.ts` không dùng đến, có thể xóa dòng đó đi.

---

## 4. PrismaModule

`src/prisma/prisma.service.ts`

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService) {
    super({
      adapter: new PrismaPg({ connectionString: config.getOrThrow<string>('DATABASE_URL') }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

`src/prisma/prisma.module.ts`

```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
```

---

## 5. Messaging (phát sự kiện)

`src/messaging/messaging.module.ts`

```ts
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { BUS_CLIENT, busClientOptions } from '@app/shared';
import { UserEventsPublisher } from './user-events.publisher';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: BUS_CLIENT,
        inject: [ConfigService],
        useFactory: (config: ConfigService) =>
          busClientOptions(config.getOrThrow<string>('RABBITMQ_URL')),
      },
    ]),
  ],
  providers: [UserEventsPublisher],
  exports: [UserEventsPublisher],
})
export class MessagingModule {}
```

`src/messaging/user-events.publisher.ts`

```ts
import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  buildEvent, BUS_CLIENT, SERVICES, USER_EVT, UserEventPayload, UserLoggedInPayload,
  UserLoginFailedPayload, UserPasswordChangedPayload, UserRoleChangedPayload,
  UserUpdatedPayload, UserView, Role,
} from '@app/shared';

@Injectable()
export class UserEventsPublisher implements OnApplicationBootstrap {
  private readonly logger = new Logger(UserEventsPublisher.name);

  constructor(@Inject(BUS_CLIENT) private readonly bus: ClientProxy) {}

  async onApplicationBootstrap() {
    await this.bus.connect(); // lỗi kết nối RabbitMQ hiện ngay lúc khởi động
  }

  registered(u: UserView) {
    this.publish<UserEventPayload>(USER_EVT.REGISTERED, { userId: u.id, username: u.username, role: u.role }, u.id);
  }
  created(u: UserView, actorId?: string) {
    this.publish<UserEventPayload>(USER_EVT.CREATED, { userId: u.id, username: u.username, role: u.role }, actorId);
  }
  loggedIn(u: UserView) {
    this.publish<UserLoggedInPayload>(USER_EVT.LOGGED_IN, { userId: u.id, username: u.username }, u.id);
  }
  loginFailed(payload: UserLoginFailedPayload) {
    this.publish(USER_EVT.LOGIN_FAILED, payload);
  }
  updated(userId: string, changedFields: string[], actorId: string) {
    this.publish<UserUpdatedPayload>(USER_EVT.UPDATED, { userId, changedFields }, actorId);
  }
  roleChanged(userId: string, oldRole: Role, newRole: Role, actorId: string) {
    this.publish<UserRoleChangedPayload>(USER_EVT.ROLE_CHANGED, { userId, oldRole, newRole }, actorId);
  }
  passwordChanged(userId: string) {
    this.publish<UserPasswordChangedPayload>(USER_EVT.PASSWORD_CHANGED, { userId }, userId);
  }
  deactivated(u: UserView, actorId: string) {
    this.publish<UserEventPayload>(USER_EVT.DEACTIVATED, { userId: u.id, username: u.username, role: u.role }, actorId);
  }

  private publish<T>(type: string, data: T, actorId?: string) {
    const event = buildEvent({ type, source: SERVICES.USER, data, actorId });
    // emit() là fire-and-forget; subscribe chỉ để ghi log khi gửi lỗi, không làm hỏng request chính
    this.bus.emit(type, event).subscribe({
      error: (err) => this.logger.error(`Publish ${type} thất bại: ${err?.message ?? err}`),
    });
  }
}
```

---

## 6. Users module

`src/modules/users/user.mapper.ts` (luôn đi qua hàm này để **không bao giờ lộ `passwordHash`**)

```ts
import type { UserView } from '@app/shared';
import type { User } from '../../prisma/generated/client';

export function toUserView(user: User): UserView {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    department: user.department,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
```

`src/modules/users/users.service.ts`

```ts
import {
  ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
  CreateUserMsg, DeactivateUserMsg, FindUsersQueryDto, Paginated, RegisterDto, Role,
  UpdateRoleMsg, UpdateUserMsg, UserStats, UserView,
} from '@app/shared';
import { UserEventsPublisher } from '../../messaging/user-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toUserView } from './user.mapper';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: UserEventsPublisher,
  ) {}

  // ---------- dùng nội bộ (AuthService) ----------
  findEntityByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  findEntityById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  setPassword(id: string, passwordHash: string) {
    return this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  /** Tạo user, KHÔNG phát sự kiện (caller quyết định phát registered hay created). */
  async createUser(dto: RegisterDto, role: Role): Promise<UserView> {
    const username = dto.username.toLowerCase();
    const email = dto.email?.toLowerCase();

    if (await this.prisma.user.findUnique({ where: { username } })) {
      throw new ConflictException('Tên đăng nhập đã tồn tại');
    }
    if (email) await this.assertEmailFree(email);

    const user = await this.prisma.user.create({
      data: {
        username,
        passwordHash: await bcrypt.hash(dto.password, 10),
        fullName: dto.fullName,
        email,
        phone: dto.phone,
        department: dto.department,
        role,
      },
    });
    return toUserView(user);
  }

  // ---------- RPC handlers ----------
  async create({ dto, actorId }: CreateUserMsg): Promise<UserView> {
    const user = await this.createUser(dto, dto.role);
    this.events.created(user, actorId);
    return user;
  }

  async findAll(q: FindUsersQueryDto): Promise<Paginated<UserView>> {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const where: Prisma.UserWhereInput = {
      ...(q.role && { role: q.role }),
      ...(q.search && {
        OR: [
          { username: { contains: q.search, mode: 'insensitive' } },
          { fullName: { contains: q.search, mode: 'insensitive' } },
          { email: { contains: q.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items: items.map(toUserView), total, page, limit };
  }

  async findById(id: string): Promise<UserView> {
    const user = await this.findEntityById(id);
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return toUserView(user);
  }

  async update({ id, data, actor }: UpdateUserMsg): Promise<UserView> {
    if (actor.role !== Role.ADMIN && actor.sub !== id) {
      throw new ForbiddenException('Bạn không có quyền sửa người dùng này');
    }
    await this.findById(id); // 404 nếu không tồn tại

    const email = data.email?.toLowerCase();
    if (email) await this.assertEmailFree(email, id);

    const patch = {
      fullName: data.fullName,
      email,
      phone: data.phone,
      department: data.department,
    };
    const changedFields = Object.entries(patch)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => k);

    const user = await this.prisma.user.update({ where: { id }, data: patch });
    if (changedFields.length) this.events.updated(id, changedFields, actor.sub);
    return toUserView(user);
  }

  async updateRole({ id, role, actor }: UpdateRoleMsg): Promise<UserView> {
    if (actor.role !== Role.ADMIN) throw new ForbiddenException('Chỉ ADMIN được đổi vai trò');
    if (actor.sub === id) throw new ForbiddenException('Không thể tự đổi vai trò của chính mình');

    const current = await this.findEntityById(id);
    if (!current) throw new NotFoundException('Không tìm thấy người dùng');

    const user = await this.prisma.user.update({ where: { id }, data: { role } });
    if (current.role !== role) this.events.roleChanged(id, current.role, role, actor.sub);
    return toUserView(user);
  }

  async deactivate({ id, actor }: DeactivateUserMsg): Promise<UserView> {
    if (actor.role !== Role.ADMIN) throw new ForbiddenException('Chỉ ADMIN được vô hiệu hóa tài khoản');
    if (actor.sub === id) throw new ForbiddenException('Không thể tự vô hiệu hóa chính mình');
    await this.findById(id);

    const user = await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    const view = toUserView(user);
    this.events.deactivated(view, actor.sub);
    return view;
  }

  async stats(): Promise<UserStats> {
    const [total, active, groups] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    ]);
    return {
      total,
      active,
      byRole: Object.fromEntries(groups.map((g) => [g.role, g._count._all])),
    };
  }

  private async assertEmailFree(email: string, excludeId?: string) {
    const found = await this.prisma.user.findUnique({ where: { email } });
    if (found && found.id !== excludeId) throw new ConflictException('Email đã được sử dụng');
  }
}
```

`src/modules/users/users.controller.ts`

```ts
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateUserMsg, DeactivateUserMsg, FindUserByIdMsg, FindUsersQueryDto,
  UpdateRoleMsg, UpdateUserMsg, USER_CMD,
} from '@app/shared';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @MessagePattern(USER_CMD.CREATE)
  create(@Payload() msg: CreateUserMsg) {
    return this.users.create(msg);
  }

  @MessagePattern(USER_CMD.FIND_ALL)
  findAll(@Payload() query: FindUsersQueryDto) {
    return this.users.findAll(query);
  }

  @MessagePattern(USER_CMD.FIND_BY_ID)
  findById(@Payload() msg: FindUserByIdMsg) {
    return this.users.findById(msg.id);
  }

  @MessagePattern(USER_CMD.UPDATE)
  update(@Payload() msg: UpdateUserMsg) {
    return this.users.update(msg);
  }

  @MessagePattern(USER_CMD.UPDATE_ROLE)
  updateRole(@Payload() msg: UpdateRoleMsg) {
    return this.users.updateRole(msg);
  }

  @MessagePattern(USER_CMD.DEACTIVATE)
  deactivate(@Payload() msg: DeactivateUserMsg) {
    return this.users.deactivate(msg);
  }

  @MessagePattern(USER_CMD.STATS)
  stats() {
    return this.users.stats();
  }
}
```

`src/modules/users/users.module.ts`

```ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

---

## 7. Auth module

`src/modules/auth/auth.service.ts`

```ts
import {
  ForbiddenException, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import {
  ChangePasswordMsg, JwtPayload, LoginDto, LoginResult, RegisterDto, Role, UserView,
} from '@app/shared';
import { UserEventsPublisher } from '../../messaging/user-events.publisher';
import { toUserView } from '../users/user.mapper';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly events: UserEventsPublisher,
  ) {}

  async register(dto: RegisterDto): Promise<UserView> {
    const user = await this.users.createUser(dto, Role.EMPLOYEE); // tự đăng ký luôn là EMPLOYEE
    this.events.registered(user);
    return user;
  }

  async login(dto: LoginDto): Promise<LoginResult> {
    const username = dto.username.toLowerCase();
    const user = await this.users.findEntityByUsername(username);
    const passwordOk = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;

    if (!user || !passwordOk) {
      this.events.loginFailed({ username, reason: user ? 'WRONG_PASSWORD' : 'USER_NOT_FOUND' });
      throw new UnauthorizedException('Sai tên đăng nhập hoặc mật khẩu');
    }
    if (!user.isActive) {
      this.events.loginFailed({ username, reason: 'INACTIVE' });
      throw new ForbiddenException('Tài khoản đã bị vô hiệu hóa');
    }

    const payload: JwtPayload = { sub: user.id, username: user.username, role: user.role };
    const accessToken = await this.jwt.signAsync(payload);
    const view = toUserView(user);
    this.events.loggedIn(view);
    return { accessToken, user: view };
  }

  async changePassword({ actorId, dto }: ChangePasswordMsg) {
    const user = await this.users.findEntityById(actorId);
    if (!user || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }
    await this.users.setPassword(actorId, await bcrypt.hash(dto.newPassword, 10));
    this.events.passwordChanged(actorId);
    return { message: 'Đổi mật khẩu thành công' };
  }
}
```

`src/modules/auth/auth.controller.ts`

```ts
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ChangePasswordMsg, LoginDto, RegisterDto, USER_CMD } from '@app/shared';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @MessagePattern(USER_CMD.REGISTER)
  register(@Payload() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @MessagePattern(USER_CMD.LOGIN)
  login(@Payload() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @MessagePattern(USER_CMD.CHANGE_PASSWORD)
  changePassword(@Payload() msg: ChangePasswordMsg) {
    return this.auth.changePassword(msg);
  }
}
```

`src/modules/auth/auth.module.ts`

```ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '1d') as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
```

---

## 8. `app.module.ts` và `main.ts`

`src/app.module.ts` (ghi đè file mặc định)

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessagingModule } from './messaging/messaging.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // file đứng trước được ưu tiên; file không tồn tại (trong Docker) thì bị bỏ qua
      envFilePath: ['apps/user-service/.env', '.env'],
    }),
    PrismaModule,
    MessagingModule,
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
```

`src/main.ts` (ghi đè)

```ts
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { busServerOptions, QUEUES, RpcErrorFilter } from '@app/shared';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new RpcErrorFilter());

  // inheritAppConfig: để pipe/filter global ở trên áp dụng cho cả phần microservice
  app.connectMicroservice(
    busServerOptions(config.getOrThrow<string>('RABBITMQ_URL'), QUEUES.USER),
    { inheritAppConfig: true },
  );

  await app.startAllMicroservices();
  await app.init(); // không listen HTTP
  Logger.log(`user-service đang lắng nghe queue "${QUEUES.USER}"`, 'Bootstrap');
}
bootstrap();
```

---

## 9. Chạy thử

```bash
npm run start:user
```

Kiểm tra theo thứ tự:

1. **Log**: không có lỗi kết nối RabbitMQ/Neon, không có lỗi Prisma về field/bảng.
2. **CloudAMQP Manager → Exchanges**: có exchange `app.bus` kiểu `topic`.
3. **Queues**: có `user_queue`, tab *Bindings* liệt kê các routing key `cmd.user.*`.
4. **Neon / Prisma Studio** (`npm run prisma:studio:user`): dữ liệu người dùng hiện có hiển thị đúng; cột mật khẩu là chuỗi băm bcrypt (bắt đầu bằng `$2`). Dùng một tài khoản có sẵn này để đăng nhập thử.
5. **End-to-end**: dựng `api-gateway` theo `api-gateway_instruction.md` rồi gọi `POST /api/auth/login`. Đây cũng là smoke test cho RabbitMQ wildcards (xem mục 9.6 trong `folder_structure.md`).
6. **Kiểm tra sự kiện** (khi chưa có audit): trong CloudAMQP Manager tạo tạm queue `debug_events`, bind vào exchange `app.bus` với routing key `evt.#`. Đăng nhập vài lần rồi dùng *Get messages* sẽ thấy các envelope `evt.user.logged_in`. Xong thì xóa queue này.

---

## 10. Docker

Block `user-service` đã có trong `docker-compose.yml` (xem `folder_structure.md`, mục 8). Chạy:

```bash
docker compose up --build user-service
```

Trong container, `.env` không được copy; biến môi trường đến từ `env_file` (`.env` gốc + `apps/user-service/.env`). Dockerfile chạy `prisma generate` lúc build nên **không cần** kết nối database khi build; schema không đổi từ container.

---

## 11. Lưu ý và hạn chế đã biết

- **Token vẫn dùng được đến lúc hết hạn** dù tài khoản đã bị vô hiệu hóa hoặc đổi role, vì gateway chỉ xác minh chữ ký. Giữ `JWT_EXPIRES_IN` ngắn (ví dụ `1h`) nếu quan trọng. Thu hồi tức thời cần thêm cơ chế riêng (làm sau, không phải bây giờ).
- Validate input từ bên ngoài ở **gateway**. Service chỉ validate lại các payload là class DTO (`RegisterDto`, `LoginDto`, `FindUsersQueryDto`); các payload dạng interface (`UpdateUserMsg`...) được tin cậy vì chỉ gateway gửi tới.
- Lỗi nghiệp vụ cứ `throw new NotFoundException(...)`, `ConflictException`, `ForbiddenException`...; `RpcErrorFilter` chuyển thành `{statusCode, message}` và gateway đổi lại thành HTTP status tương ứng.
- Đừng đưa `passwordHash` vào bất kỳ event hay response nào; luôn qua `toUserView`.

---

## 12. Thêm consumer khi cần

Ví dụ `user-service` muốn nghe một sự kiện của service khác (minh họa, hiện chưa dùng):

`src/messaging/consumers/device-events.consumer.ts`

```ts
import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { DEVICE_EVT, DeviceBrokenPayload, EventEnvelope } from '@app/shared';

@Controller()
export class DeviceEventsConsumer {
  private readonly logger = new Logger(DeviceEventsConsumer.name);

  @EventPattern(DEVICE_EVT.BROKEN)
  onDeviceBroken(@Payload() event: EventEnvelope<DeviceBrokenPayload>) {
    this.logger.log(`Nhận ${event.type} (eventId=${event.eventId})`);
    // gọi service nội bộ ở đây
  }
}
```

Rồi khai báo `controllers: [DeviceEventsConsumer]` trong `MessagingModule`. Khi service khởi động lại, queue của nó tự được bind thêm routing key `evt.device.broken`, publisher không cần sửa gì.

---

## 13. Checklist dựng service mới (sao chép từ user-service)

Giả sử dựng `device-service`:

1. `libs/shared/src/contracts/device/`: `device.patterns.ts` (`DEVICE_CMD`, `DEVICE_EVT`), `device.dto.ts`, `device.messages.ts`, `device.types.ts`, `device.events.ts`, `index.ts`; bỏ comment export trong `libs/shared/src/index.ts`. Nhớ có `DEVICE_CMD.STATS` nếu report cần số liệu.
2. `apps/device-service/prisma/schema.prisma` (generator giống hệt, đổi model), `prisma.config.ts` (đổi đường dẫn `.env`).
3. Thêm các script `prisma:*:device` (pull/generate/studio, hoặc migrate nếu DB trống) và `start:device` trong `package.json`.
4. Dùng database `device_db` trên Neon (đã có sẵn hoặc tạo mới), điền `apps/device-service/.env` (`DATABASE_URL`, `DIRECT_URL`), tạo `.env.example`.
5. Nếu DB đã có bảng: `prisma db pull` rồi chỉnh tên model/field và `prisma generate`. Nếu DB trống và muốn tạo từ schema tự viết: dùng `prisma migrate dev --name init`.
6. Chép nguyên `src/prisma/` (không sửa gì).
7. `src/messaging/`: chép `messaging.module.ts`, đổi tên publisher thành `device-events.publisher.ts`, thay các method theo sự kiện của service; thêm `consumers/*.ts` cho sự kiện cần nhận.
8. `src/modules/<domain>/`: controller (`@MessagePattern(DEVICE_CMD.*)`), service (Prisma + publisher), module.
9. `app.module.ts`: `envFilePath: ['apps/device-service/.env', '.env']`, import `PrismaModule`, `MessagingModule`, module domain.
10. `main.ts`: chép từ user-service, đổi `QUEUES.USER` thành `QUEUES.DEVICE`.
11. Thêm module và route tương ứng ở `api-gateway` (mục 10 của `api-gateway_instruction.md`).
12. Chạy thử: log không lỗi, queue `device_queue` có bindings đúng, gọi qua gateway thành công.
13. Docker: block trong compose đã có sẵn, `docker compose up --build device-service`.

Ghi chú khác biệt theo service:

| Service | Khác biệt so với khung trên |
|---|---|
| `notification-service` | Nhiều `consumers/` (device, maintenance, inventory, user); `modules/notifications` lưu DB + danh sách + đánh dấu đã đọc. |
| `audit-service` | Một consumer duy nhất `@EventPattern('evt.#')` lưu envelope vào DB, **bỏ qua** `evt.audit.*`; không có publisher. |
| `report-service` | Không có `prisma/`; thêm `src/bus/` (chép `BusService` từ gateway) để gọi `cmd.*.stats`; `.env` chỉ dùng `.env` gốc. |
| `ai-assistant-service` | Migration đầu tiên thêm `CREATE EXTENSION IF NOT EXISTS vector;`; thêm `gemini/`, `modules/documents`, `modules/chat` (xem `folder_structure.md`, mục 6). |