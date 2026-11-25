# Hướng dẫn dựng `user-service`

Service này **xác thực** (username, password, role, cấp JWT) và **quản lý thông tin người dùng**. Đây là service mẫu: các service khác sao chép khung này (checklist ở cuối file).

> Điều kiện: đã làm xong **mục 9 "Khởi tạo nền"** trong `folder_structure.md` (monorepo, `libs/shared`, package, `.env` gốc có `RABBITMQ_URL` và `JWT_SECRET`), database `user_db` trên Neon **đã có sẵn bảng và dữ liệu** (service này chỉ *pull* schema về, không tạo bảng, không migrate, không seed).

---

## 0. Phạm vi

### Lệnh (RPC) service phục vụ

| Pattern | Payload | Trả về | Ai gọi |
|---|---|---|---|
| `cmd.user.login` | `LoginDto` | `LoginResult` `{accessToken, refreshToken, user}` | Gateway `POST /auth/login` |
| `cmd.user.refresh_token` | `RefreshTokenDto` | `RefreshTokenResult` | Gateway `POST /auth/refresh-token` |
| `cmd.user.change_password` | `{actorId: number, dto}` | `{message}` | Gateway `PATCH /auth/change-password` |
| `cmd.user.create` | `{dto: CreateUserDto, actorId: number}` | `UserView` | ADMIN hoặc MANAGER tạo user |
| `cmd.user.find_all` | `FindUserQueryDto` | `Paginated<UserView>` | ADMIN, MANAGER |
| `cmd.user.find_by_id` | `{id: number}` | `UserView` | Gateway `/auth/me`, `/users/:id` |
| `cmd.user.update` | `{id: number, data, actor}` | `UserView` | Người dùng tự cập nhật hồ sơ |
| `cmd.user.update_role` | `{id: number, roleCode, actor}` | `UserView` | ADMIN |
| `cmd.user.deactivate` | `{id: number, actor}` | `UserView` | ADMIN |
| `cmd.user.stats` | `{}` | `UserStats` | report-service |

`cmd.user.forget_password` hiện có handler placeholder; chưa triển khai quy trình quên/đặt lại mật khẩu. `cmd.user.register` không có trong contract hiện tại.

### Sự kiện service phát

`evt.user.created`, `logged_in`, `login_failed`, `updated`, `role_changed`, `password_changed`, `deactivated`. Service này **chưa nhận** sự kiện nào (thư mục `consumers/` để dành, xem mục 12).

### Quyết định thiết kế

- `user-service` **ký** access token và refresh token; `api-gateway` **xác minh** access token bằng `JWT_SECRET`. Refresh token dùng `JWT_REFRESH_SECRET` và thời hạn `JWT_REFRESH_EXPIRES_IN`.
- Gateway kiểm tra role thô (ai được vào route nào); `user-service` chỉ cho phép chính chủ cập nhật hồ sơ và ADMIN đổi role/vô hiệu hóa tài khoản.
- Bảng `users` chứa thông tin tài khoản; role được liên kết qua `users.role_id` tới `roles.id`. Thông tin nhân sự/phòng ban nằm ở các bảng riêng.
- Dữ liệu người dùng (kể cả admin) đã có sẵn trong Neon nên **không có seeder**. Schema Prisma được kéo về bằng `prisma db pull`, không dùng `prisma migrate`.

---

## 1. Tạo contract trong shared

Contract là nơi `api-gateway` và `user-service` thống nhất với nhau. Tạo thư mục `libs/shared/src/contracts/user/` với 6 file. (Bên trong `libs/shared` dùng import tương đối, không dùng `@app/shared`.)

`user.patterns.ts`

```ts
export const USER_CMD = {
  CREATE: 'cmd.user.create',
  LOGIN: 'cmd.user.login',
  REFRESH_TOKEN: 'cmd.user.refresh_token',
  CHANGE_PASSWORD: 'cmd.user.change_password',
  FORGET_PASSWORD: 'cmd.user.forget_password',
  FIND_ALL: 'cmd.user.find_all',
  FIND_BY_ID: 'cmd.user.find_by_id',
  FIND_BY_EMAIL: 'cmd.user.find_by_email',
  FIND_BY_USERNAME: 'cmd.user.find_by_username',
  UPDATE: 'cmd.user.update',
  UPDATE_ROLE: 'cmd.user.update_role',
  DEACTIVATE: 'cmd.user.deactivate',
  ACTIVATE: 'cmd.user.activate',
  STATS: 'cmd.user.stats',
} as const;

export const USER_EVT = {
  CREATED: 'evt.user.created',
  LOGGED_IN: 'evt.user.logged_in',
  LOGIN_FAILED: 'evt.user.login_failed',
  UPDATED: 'evt.user.updated',
  ROLE_CHANGED: 'evt.user.role_changed',
  PASSWORD_CHANGED: 'evt.user.password_changed',
  DEACTIVATED: 'evt.user.deactivated',
  ACTIVATED: 'evt.user.activated',
} as const;
```

`user.dto.ts` (DTO đi qua ranh giới gateway ↔ service nên đặt ở đây, một định nghĩa duy nhất)

```ts
import {
  IsDateString, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString,
  Matches, MaxLength, MinLength,
} from 'class-validator';
import { Role } from '../../types/role';
import { FindQueryDto } from '../../types/find-query';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_.]+$/, { message: 'username chỉ gồm chữ, số, dấu _ và .' })
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsEmail()
  email!: string;

  @IsIn(Object.values(Role))
  roleCode!: Role;

  @IsString()
  @IsNotEmpty()
  fullname!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  dob!: string;

  @IsString()
  phone!: string;
}

export class LoginDto {
  @IsString() @IsNotEmpty() username: string;
  @IsString() @IsNotEmpty() password: string;
}

export class RefreshTokenDto {
  @IsString() @IsNotEmpty() refreshToken!: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() fullname?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) dob?: string;
}

export class UpdateRoleDto {
  @IsIn(Object.values(Role))
  roleCode!: Role;
}

export class ChangePasswordDto {
  @IsString() @IsNotEmpty() currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;
}

export class FindUserQueryDto extends FindQueryDto {
  @IsOptional() @IsIn(Object.values(Role)) roleCode?: Role;
}
```

`user.messages.ts` (payload gói nhiều thông tin: DTO + người thực hiện)

```ts
import { JwtPayload } from '../../types/jwt-payload';
import { Role } from '../../types/role';
import { ChangePasswordDto, CreateUserDto, UpdateUserDto } from './user.dto';

export interface CreateUserMsg { dto: CreateUserDto; actorId: number }
export interface FindUserByIdMsg { id: number }
export interface UpdateUserMsg { id: number; data: UpdateUserDto; actor: JwtPayload }
export interface UpdateRoleMsg { id: number; roleCode: Role; actor: JwtPayload }
export interface DeactivateUserMsg { id: number; actor: JwtPayload }
export interface ChangePasswordMsg { actorId: number; dto: ChangePasswordDto }
```

`user.types.ts` (kiểu trả về)

```ts
import { Role } from '../../types/role';

export interface UserView {
  id: number;
  username: string;
  email: string;
  role: { id: number; code: Role; name: string };
  isActive: boolean;
  fullname: string;
  dob: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResult { accessToken: string; refreshToken: string; user: UserView }
export interface RefreshTokenResult { accessToken: string; refreshToken: string }

export interface UserStats {
  total: number;
  active: number;
  byRole: Record<number, number>;
}
```

`user.events.ts` (payload sự kiện, **không** có mật khẩu/hash)

```ts
import { Role } from '../../types/role';

export interface UserEventPayload { userId: number; username: string; roleId: number }
export interface UserLoggedInPayload { userId: number; username: string }
export interface UserLoginFailedPayload {
  username: string;
  reason: 'USER_NOT_FOUND' | 'WRONG_PASSWORD' | 'INACTIVE';
}
export interface UserUpdatedPayload { userId: number; changedFields: string[] }
export interface UserRoleChangedPayload { userId: number; oldRole: string; newRole: string }
export interface UserPasswordChangedPayload { userId: number }
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
  provider        = "prisma-client"
  output          = "../src/prisma/generated"
  previewFeatures = ["partialIndexes"]
  moduleFormat    = "cjs"
}

datasource db {
  provider = "postgresql"
}
```

Các model bảng hiện có (`users`, `roles`, `employees`, `departments`, ...) được pull ở bước 3.5; role là bảng quan hệ, không phải enum Prisma.

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
  datasource: { url: env('DATABASE_URL') },
});
```

Prisma CLI hiện cũng dùng `DATABASE_URL`; không cần `DIRECT_URL` riêng trong cấu hình hiện tại.

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
# URL kết nối Neon – dùng lúc chạy và cho Prisma CLI
DATABASE_URL=postgresql://<user>:<pass>@<host>-pooler.<region>.aws.neon.tech/user_db?sslmode=require

JWT_EXPIRES_IN=6h
JWT_REFRESH_SECRET=<refresh-secret>
JWT_REFRESH_EXPIRES_IN=1d
```

### 3.5 Pull schema từ Neon

```bash
npm run prisma:pull:user
```

Lệnh này đọc cấu trúc bảng trong `user_db` và ghi model vào `schema.prisma` (giữ nguyên generator và datasource). **Giữ nguyên tên Prisma model/field được pull**: schema hiện tại dùng model chữ thường/số nhiều và field snake_case, khớp trực tiếp với các bảng/cột hiện có; không đổi thành `User`, `passwordHash` hay thêm `@map` không cần thiết.

Các tên và kiểu dữ liệu chính đang dùng:

| Bảng / model Prisma | Cột / field | Kiểu |
|---|---|---|
| `users` | `id` | `Int` (autoincrement) |
| `users` | `username` | `String`, unique, tối đa 20 ký tự |
| `users` | `hashed_password` | `String`, bcrypt hash |
| `users` | `email` | `String`, unique |
| `users` | `role_id` | `Int`, FK tới `roles.id` |
| `users` | `is_active` | `Boolean` |
| `users` | `fullname` | `String?` |
| `users` | `dob` | `DateTime` với database type `DATE` |
| `users` | `phone` | `String?` |
| `roles` | `id`, `name`, `code` | `Int`, `String`, `String` (`code` unique) |
| `employees` | `id`, `user_id`, `department_id` | `Int`, `Int`, `Int` |
| `departments` | `id`, `name`, `code` | `Int`, `String`, `String` (`code` unique) |
| `expertises` | `id`, `code`, `name` | `Int`, `String`, `String?` |
| `technician_expertise` | `user_id`, `expertise_id` | `Int`, composite primary key |

`users.roles` là relation tới `roles`; role không phải enum trong database. Prisma Client được dùng với tên chính xác như `prisma.users`, `user.hashed_password`, `user.role_id` và `user.roles`.

Rồi sinh client:

```bash
npm run prisma:generate:user
```

Kiểm tra trước khi viết tiếp code:

| Cần kiểm tra | Nếu không khớp |
|---|---|
| `users.id` và các foreign key là `Int` | Contract, JWT, route params và `actorId` dùng `number`; gateway dùng `ParseIntPipe`. |
| `roles.code` có các giá trị `ADMIN, MANAGER, TECHNICIAN, EMPLOYEE` | `Role` trong shared là union string; tra cứu role qua `roles.code`, không dùng enum Prisma `Role`. |
| Mật khẩu đã lưu dạng bcrypt (bắt đầu bằng `$2a$`/`$2b$`) | Nếu là plaintext hoặc thuật toán khác thì đăng nhập sẽ luôn thất bại; cần băm lại dữ liệu hoặc đổi thuật toán trong `AuthService`/`UsersService`. |
| Cột tài khoản là `is_active` | Dùng field Prisma `is_active`; response ánh xạ thành `isActive`. |
| `username`/`email` có ràng buộc unique | Nếu không có, `findUnique({ where: { username } })` sẽ lỗi; đổi sang `findFirst`. |

Lưu ý:

- **Không chạy `prisma migrate dev`** trên database đã có dữ liệu (Prisma sẽ đòi reset). Muốn quản lý bằng migration về sau thì phải baseline trước, đó là việc của bước khác.
- Chạy lại `db pull` sẽ ghi đè mọi chỉnh sửa schema; chỉ pull lại khi cấu trúc bảng thay đổi.
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

`src/messaging/publishers/user-events.publisher.ts`

```ts
import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  buildEvent, BUS_CLIENT, SERVICES, USER_EVT, UserEventPayload, UserLoggedInPayload,
  UserLoginFailedPayload, UserPasswordChangedPayload, UserRoleChangedPayload,
  UserUpdatedPayload, UserView,
} from '@app/shared';

@Injectable()
export class UserEventsPublisher implements OnApplicationBootstrap {
  private readonly logger = new Logger(UserEventsPublisher.name);

  constructor(@Inject(BUS_CLIENT) private readonly bus: ClientProxy) {}

  async onApplicationBootstrap() {
    await this.bus.connect(); // lỗi kết nối RabbitMQ hiện ngay lúc khởi động
  }

  created(u: UserView, actorId: number) {
    this.publish<UserEventPayload>(USER_EVT.CREATED, {
      userId: u.id, username: u.username, roleId: u.role.id,
    }, actorId);
  }
  loggedIn(u: UserView) {
    this.publish<UserLoggedInPayload>(USER_EVT.LOGGED_IN, { userId: u.id, username: u.username }, u.id);
  }
  loginFailed(payload: UserLoginFailedPayload) {
    this.publish(USER_EVT.LOGIN_FAILED, payload);
  }
  updated(userId: number, changedFields: string[], actorId: number) {
    this.publish<UserUpdatedPayload>(USER_EVT.UPDATED, { userId, changedFields }, actorId);
  }
  roleChanged(userId: number, oldRole: string, newRole: string, actorId: number) {
    this.publish<UserRoleChangedPayload>(USER_EVT.ROLE_CHANGED, { userId, oldRole, newRole }, actorId);
  }
  passwordChanged(userId: number) {
    this.publish<UserPasswordChangedPayload>(USER_EVT.PASSWORD_CHANGED, { userId }, userId);
  }
  deactivated(u: UserView, actorId: number) {
    this.publish<UserEventPayload>(USER_EVT.DEACTIVATED, {
      userId: u.id, username: u.username, roleId: u.role.id,
    }, actorId);
  }

  private publish<T>(type: string, data: T, actorId?: number) {
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

`src/modules/views.mapper.ts` (response dùng `UserView`; password hash không được trả ra)

```ts
import type { UserView } from '@app/shared';
import type { users, roles } from '../../prisma/generated/client';
import type { Role } from '@app/shared/types/role';

export function toUserView(user: users & { roles: roles }): UserView {
  return {
    id: user.id,
    username: user.username,
    role: {
      id: user.roles.id,
      code: user.roles.code as Role,
      name: user.roles.name,
    },
    email: user.email,
    isActive: user.is_active,
    fullname: user.fullname || 'No name',
    dob: user.dob.toDateString(),
    phone: user.phone?.toString() || 'Missing',
    createdAt: user.created_at?.toISOString() || 'Missing',
    updatedAt: user.updated_at?.toISOString() || 'Missing',
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
  CreateUserMsg, DeactivateUserMsg, FindUserQueryDto, Paginated, CreateUserDto, Role,
  UpdateRoleMsg, UpdateUserMsg, UserStats, UserView, myParseDate,
} from '@app/shared';
import { UserEventsPublisher } from '../../messaging/publishers/user-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toUserView } from '../views.mapper';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: UserEventsPublisher,
  ) {}

  // ---------- dùng nội bộ (AuthService) ----------
  findUserByUserName(username: string) {
    return this.prisma.users.findUnique({ where: { username }, include: { roles: true } });
  }

  findUserById(id: number) {
    return this.prisma.users.findUnique({ where: { id }, include: { roles: true } });
  }

  setPassword(id: number, hashedPassword: string) {
    return this.prisma.users.update({ where: { id }, data: { hashed_password: hashedPassword } });
  }

  async createUser(dto: CreateUserDto): Promise<UserView> {
    const username = dto.username.toLowerCase();
    const email = dto.email.toLowerCase();
    const role = await this.resolveRole(dto.roleCode);

    if (await this.prisma.users.findUnique({ where: { username } })) {
      throw new ConflictException('Username exsisted');
    }
    if (await this.prisma.users.findUnique({ where: { email } })) {
      throw new ConflictException('Email has been used');
    }

    const user = await this.prisma.users.create({
      data: {
        username,
        hashed_password: await bcrypt.hash(dto.password, 12),
        email,
        role_id: role.id,
        fullname: dto.fullname,
        dob: new Date(dto.dob),
        phone: dto.phone,
      },
      include: { roles: true },
    });
    return toUserView(user);
  }

  // ---------- RPC handlers ----------
  async create({ dto, actorId }: CreateUserMsg): Promise<UserView> {
    const user = await this.createUser(dto);
    this.events.created(user, actorId);
    return user;
  }

  async findAll(q: FindUserQueryDto): Promise<Paginated<UserView>> {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const role = q.roleCode ? await this.resolveRole(q.roleCode) : undefined;
    const where: Prisma.usersWhereInput = {
      ...(role && { role_id: role.id }),
      ...(q.search && {
        OR: [
          { username: { contains: q.search, mode: 'insensitive' } },
          { fullname: { contains: q.search, mode: 'insensitive' } },
          { email: { contains: q.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.users.findMany({
        where,
        include: { roles: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { username: 'asc' },
      }),
      this.prisma.users.count({ where }),
    ]);
    return { items: items.map(toUserView), total, page, limit };
  }

  async findById(id: number): Promise<UserView> {
    const user = await this.findUserById(id);
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return toUserView(user);
  }

  async update({ id, data, actor }: UpdateUserMsg): Promise<UserView> {
    const user = await this.findById(id);
    if (actor.sub !== user.id) throw new ForbiddenException('You can only update your data');

    const patch = {
      fullname: data.fullname,
      phone: data.phone,
      dob: myParseDate(data.dob, 'dob'),
    };
    const changedFields = Object.entries(patch)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => k);

    if (!changedFields.length) return user;
    const updated = await this.prisma.users.update({
      where: { id: user.id },
      data: patch,
      include: { roles: true },
    });
    this.events.updated(id, changedFields, actor.sub);
    return toUserView(updated);
  }

  async updateRole({ id, roleCode, actor }: UpdateRoleMsg): Promise<UserView> {
    if (actor.roleCode !== Role.ADMIN) throw new ForbiddenException('ADMIN only');
    if (actor.sub === id) throw new ForbiddenException('Không thể tự đổi vai trò của chính mình');

    const current = await this.findUserById(id);
    if (!current) throw new NotFoundException('Không tìm thấy người dùng');
    const role = await this.resolveRole(roleCode);

    const user = await this.prisma.users.update({
      where: { id },
      data: { role_id: role.id },
      include: { roles: true },
    });
    if (current.role_id !== role.id) this.events.roleChanged(id, current.roles.code, role.code, actor.sub);
    return toUserView(user);
  }

  async deactivate({ id, actor }: DeactivateUserMsg): Promise<UserView> {
    if (actor.roleCode !== Role.ADMIN) throw new ForbiddenException('ADMIN only');
    if (actor.sub === id) throw new ForbiddenException('Không thể tự vô hiệu hóa chính mình');
    await this.findById(id);

    const user = await this.prisma.users.update({
      where: { id },
      data: { is_active: false },
      include: { roles: true },
    });
    const view = toUserView(user);
    this.events.deactivated(view, actor.sub);
    return view;
  }

  async stats(): Promise<UserStats> {
    const [total, active, groups] = await Promise.all([
      this.prisma.users.count(),
      this.prisma.users.count({ where: { is_active: true } }),
      this.prisma.users.groupBy({ by: ['role_id'], _count: { _all: true } }),
    ]);
    return {
      total,
      active,
      byRole: Object.fromEntries(groups.map((g) => [g.role_id, g._count._all])),
    };
  }

  async resolveRole(roleCode: Role) {
    const role = await this.prisma.roles.findUnique({ where: { code: roleCode } });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }
}
```

`src/modules/users/users.controller.ts`

```ts
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateUserMsg, DeactivateUserMsg, FindUserByIdMsg, FindUserQueryDto,
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
  findAll(@Payload() query: FindUserQueryDto) {
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
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import {
  ChangePasswordMsg, JwtPayload, LoginDto, LoginResult, RefreshTokenDto,
  RefreshTokenResult, Role,
} from '@app/shared';
import { UserEventsPublisher } from '../../messaging/publishers/user-events.publisher';
import { toUserView } from '../views.mapper';
import { UsersService } from '../users/users.service';
import { EmployeesService } from '../employees/employees.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly employees: EmployeesService,
    private readonly jwt: JwtService,
    private readonly events: UserEventsPublisher,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const username = dto.username.toLowerCase();
    const user = await this.users.findUserByUserName(username);
    const passwordOk = user ? await bcrypt.compare(dto.password, user.hashed_password) : false;

    if (!user || !passwordOk) {
      this.events.loginFailed({ username, reason: user ? 'WRONG_PASSWORD' : 'USER_NOT_FOUND' });
      throw new UnauthorizedException('Wrong username or password');
    }
    if (!user.is_active) {
      this.events.loginFailed({ username, reason: 'INACTIVE' });
      throw new ForbiddenException('Account has been deactivated');
    }

    const employee = await this.employees.findEmployeeByUserId(user.id);
    if (!employee) throw new UnauthorizedException('User is not permitted to access');

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      roleId: user.role_id,
      roleCode: user.roles.code as Role,
      employeeId: employee.id,
    };
    const { accessToken, refreshToken } = await this.generateTokens(payload);
    const view = toUserView(user);
    this.events.loggedIn(view);
    return { accessToken, refreshToken, user: view };
  }

  async refreshToken(dto: RefreshTokenDto): Promise<RefreshTokenResult> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(dto.refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (payload.tokenType !== 'refresh') throw new UnauthorizedException('Invalid refresh token');

    const user = await this.users.findUserById(payload.sub);
    if (!user || !user.is_active) throw new UnauthorizedException('User is inactive or no longer exists');
    const employee = await this.employees.findEmployeeByUserId(user.id);
    if (!employee) throw new UnauthorizedException('User is not permitted to access');
    return this.generateTokens({
      sub: user.id,
      username: user.username,
      roleId: user.role_id,
      roleCode: user.roles.code as Role,
      employeeId: employee.id,
    });
  }

  private async generateTokens(payload: JwtPayload): Promise<RefreshTokenResult> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync({ ...payload, tokenType: 'access' }),
      this.jwt.signAsync(
        { ...payload, tokenType: 'refresh' },
        {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '1d') as JwtSignOptions['expiresIn'],
        },
      ),
    ]);
    return { accessToken, refreshToken };
  }

  async changePassword({ actorId, dto }: ChangePasswordMsg) {
    const user = await this.users.findUserById(actorId);
    if (!user || !(await bcrypt.compare(dto.currentPassword, user.hashed_password))) {
      throw new UnauthorizedException('Wrong current password');
    }
    await this.users.setPassword(actorId, await bcrypt.hash(dto.newPassword, 12));
    this.events.passwordChanged(actorId);
    return { message: 'Password changed successfully' };
  }

  async forgetPassword({ actorId, dto }: any) {
    return { message: 'Password reset successfully' };
  }
}
```

`src/modules/auth/auth.controller.ts`

```ts
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ChangePasswordMsg, LoginDto, RefreshTokenDto, USER_CMD } from '@app/shared';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @MessagePattern(USER_CMD.LOGIN)
  login(@Payload() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @MessagePattern(USER_CMD.REFRESH_TOKEN)
  refreshToken(@Payload() dto: RefreshTokenDto) {
    return this.auth.refreshToken(dto);
  }

  @MessagePattern(USER_CMD.CHANGE_PASSWORD)
  changePassword(@Payload() msg: ChangePasswordMsg) {
    return this.auth.changePassword(msg);
  }

  @MessagePattern(USER_CMD.FORGET_PASSWORD)
  forgetPassword(@Payload() msg: any) {
    return this.auth.forgetPassword(msg);
  }
}
```

`src/modules/auth/auth.module.ts`

```ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { EmployeesModule } from '../employees/employees.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    UsersModule,
    EmployeesModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '6h') as JwtSignOptions['expiresIn'],
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
- Validate input từ bên ngoài ở **gateway**. Service chỉ validate lại các payload là class DTO (`CreateUserDto`, `LoginDto`, `RefreshTokenDto`, `FindUserQueryDto`); các payload dạng interface (`UpdateUserMsg`...) được tin cậy vì chỉ gateway gửi tới.
- Lỗi nghiệp vụ cứ `throw new NotFoundException(...)`, `ConflictException`, `ForbiddenException`...; `RpcErrorFilter` chuyển thành `{statusCode, message}` và gateway đổi lại thành HTTP status tương ứng.
- Đừng đưa `hashed_password` vào bất kỳ event hay response nào; luôn qua `toUserView`.

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
4. Dùng database `device_db` trên Neon (đã có sẵn hoặc tạo mới), điền `apps/device-service/.env` (`DATABASE_URL`), tạo `.env.example`.
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