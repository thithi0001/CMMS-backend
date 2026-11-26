# Hướng dẫn dựng `api-gateway`

Gateway là **cổng duy nhất** mở ra ngoài: nhận HTTP, xác minh JWT, kiểm tra role thô, rồi chuyển message sang service qua RabbitMQ. Gateway **không** có nghiệp vụ, **không** có Prisma, **không** truy cập database.

> Điều kiện: đã làm xong **mục 9 "Khởi tạo nền"** trong `folder_structure.md` và nên dựng xong `user-service` trước (`user-service_instruction.md`) để có chỗ đăng nhập.

---

## 0. Phạm vi (giai đoạn này)

Dựng khung gateway và hai nhóm route của `user-service`. Các nhóm route khác thêm dần theo mục 10.

| Method | Route (có tiền tố `/api`) | Quyền | Pattern gửi đi |
|---|---|---|---|
| POST | `/auth/login` | public | `cmd.user.login` |
| POST | `/auth/refresh-token` | public | `cmd.user.refresh_token` |
| GET | `/auth/me` | đăng nhập | `cmd.user.find_by_id` |
| PATCH | `/auth/change-password` | đăng nhập | `cmd.user.change_password` |
| GET | `/users` | ADMIN, MANAGER | `cmd.user.find_all` |
| POST | `/users` | ADMIN, MANAGER | `cmd.user.create` |
| GET | `/users/:id` | đăng nhập | `cmd.user.find_by_id` |
| PATCH | `/users/:id` | đăng nhập (service chỉ cho chính chủ cập nhật) | `cmd.user.update` |
| PATCH | `/users/:id/role` | ADMIN | `cmd.user.update_role` |
| DELETE | `/users/:id` | ADMIN (vô hiệu hóa, không xóa thật) | `cmd.user.deactivate` |

Cơ chế chung:

- **Mặc định mọi route đều yêu cầu JWT** (guard toàn cục). Route công khai phải gắn `@Public()`. Cách này an toàn hơn việc nhớ gắn guard cho từng controller.
- Role thô kiểm tra ở gateway bằng `@Roles(...)`; quy tắc nghiệp vụ tinh hơn (chính chủ, không tự đổi role) do service kiểm tra.
- Lỗi từ service (`{statusCode, message}`) được `RpcToHttpFilter` đổi lại thành HTTP status tương ứng. Service không phản hồi trong thời gian quy định thì trả `504`.

---

## 1. Thư mục

```bash
mkdir -p apps/api-gateway/src/bus
mkdir -p apps/api-gateway/src/common/{decorators,guards,filters}
mkdir -p apps/api-gateway/src/modules/{auth,users}
```

Kết quả:

```text
apps/api-gateway/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── bus/            (bus.module.ts, bus.service.ts)
│   ├── common/
│   │   ├── decorators/ (public.decorator.ts, roles.decorator.ts, current-user.decorator.ts)
│   │   ├── guards/     (jwt-auth.guard.ts, roles.guard.ts)
│   │   └── filters/    (rpc-to-http.filter.ts)
│   └── modules/
│       ├── auth/       (auth.module.ts, auth.controller.ts)
│       └── users/      (users.module.ts, users.controller.ts)
├── tsconfig.app.json
└── .env.example
```

Decorator và guard **chỉ gateway dùng** nên nằm trong gateway, không đặt vào `libs/shared`.

---

## 2. Cài đặt bổ sung

Không cần package mới: mọi thứ đã cài ở bước nền (`@nestjs/jwt`, `@nestjs/microservices`, `class-validator`, `class-transformer`, `@nestjs/config`). Không dùng Passport; guard tự viết bằng `JwtService`.

Thêm script vào `package.json` (gốc):

```json
"start:gateway": "nest start api-gateway --watch"
```

---

## 3. Environment

`apps/api-gateway/.env.example` (commit), copy thành `.env` (không commit):

```env
PORT=3000
CORS_ORIGIN=http://localhost:5173
RPC_TIMEOUT_MS=10000
```

`RABBITMQ_URL` và `JWT_SECRET` lấy từ `.env` gốc. **`JWT_SECRET` phải giống hệt giá trị `user-service` dùng**, nếu không mọi request sẽ bị 401.

---

## 4. Bus: cổng nói chuyện với các service

`src/bus/bus.service.ts`

```ts
import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { BUS_CLIENT } from '@app/shared';

@Injectable()
export class BusService implements OnApplicationBootstrap {
  private readonly timeoutMs: number;

  constructor(
    @Inject(BUS_CLIENT) private readonly client: ClientProxy,
    config: ConfigService,
  ) {
    this.timeoutMs = Number(config.get('RPC_TIMEOUT_MS', 10000));
  }

  async onApplicationBootstrap() {
    await this.client.connect(); // lỗi kết nối RabbitMQ hiện ngay lúc khởi động
  }

  /** Request/response tới service sở hữu pattern. Timeout nếu service không phản hồi. */
  send<TResult, TInput = unknown>(pattern: string, data: TInput): Promise<TResult> {
    return firstValueFrom(
      this.client.send<TResult, TInput>(pattern, data).pipe(timeout(this.timeoutMs)),
    );
  }
}
```

`src/bus/bus.module.ts`

```ts
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { BUS_CLIENT, busClientOptions } from '@app/shared';
import { BusService } from './bus.service';

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
  providers: [BusService],
  exports: [BusService],
})
export class BusModule {}
```

Chỉ **một** `ClientProxy` (một connection) cho cả gateway, gửi tới service nào là do routing key (`cmd.user.*` → `user_queue`...). Thêm service mới **không** cần đăng ký thêm client.

---

## 5. Common: decorators, guards, filter

### Decorators

`src/common/decorators/public.decorator.ts`

```ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

`src/common/decorators/roles.decorator.ts`

```ts
import { SetMetadata } from '@nestjs/common';
import { Role } from '@app/shared';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

`src/common/decorators/current-user.decorator.ts`

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '@app/shared';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload =>
    ctx.switchToHttp().getRequest().user,
);
```

### Guards

`src/common/guards/jwt-auth.guard.ts`

```ts
import {
  CanActivate, ExecutionContext, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '@app/shared';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Thiếu access token');
    }

    try {
      req.user = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
    return true;
  }
}
```

`src/common/guards/roles.guard.ts`

```ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload, Role } from '@app/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles?.length) return true; // route không yêu cầu role cụ thể

    const user: JwtPayload | undefined = ctx.switchToHttp().getRequest().user;
    if (!user || !roles.includes(user.roleCode)) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }
    return true;
  }
}
```

### Filter: lỗi RPC → HTTP

`src/common/filters/rpc-to-http.filter.ts`

```ts
import {
  ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { TimeoutError } from 'rxjs';

const isRpcError = (e: unknown): e is { statusCode: number; message: unknown } =>
  typeof e === 'object' && e !== null && typeof (e as any).statusCode === 'number';

@Catch()
export class RpcToHttpFilter implements ExceptionFilter {
  private readonly logger = new Logger(RpcToHttpFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: unknown = 'Internal server error';

    if (exception instanceof HttpException) {
      // lỗi phát sinh ngay tại gateway (validation, guard, 404 route...)
      status = exception.getStatus();
      const body = exception.getResponse();
      message = typeof body === 'string' ? body : ((body as any).message ?? exception.message);
    } else if (exception instanceof TimeoutError) {
      status = HttpStatus.GATEWAY_TIMEOUT;
      message = 'Service không phản hồi (timeout)';
    } else if (isRpcError(exception)) {
      // lỗi do service trả về qua RabbitMQ
      status = exception.statusCode;
      message = exception.message;
    } else {
      this.logger.error(exception);
    }

    res.status(status).json({ statusCode: status, message });
  }
}
```

---

## 6. Module `auth`

`src/modules/auth/auth.controller.ts`

```ts
import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import {
  ChangePasswordDto, ChangePasswordMsg, FindUserByIdMsg, JwtPayload, LoginDto,
  LoginResult, RefreshTokenDto, RefreshTokenResult, USER_CMD, UserView,
} from '@app/shared';
import { BusService } from '../../bus/bus.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly bus: BusService) {}

  @Public()
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.bus.send<LoginResult, LoginDto>(USER_CMD.LOGIN, dto);
  }

  @Public()
  @HttpCode(200)
  @Post('refresh-token')
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.bus.send<RefreshTokenResult, RefreshTokenDto>(USER_CMD.REFRESH_TOKEN, dto);
  }

  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.bus.send<UserView, FindUserByIdMsg>(USER_CMD.FIND_BY_ID, { id: user.sub });
  }

  @Patch('change-password')
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.bus.send<{ message: string }, ChangePasswordMsg>(USER_CMD.CHANGE_PASSWORD, {
      actorId: user.sub,
      dto,
    });
  }
}
```

`src/modules/auth/auth.module.ts`

```ts
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';

@Module({ controllers: [AuthController] })
export class AuthModule {}
```

(`BusService` là global nên không cần import `BusModule`.)

---

## 7. Module `users`

`src/modules/users/users.controller.ts`

```ts
import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import {
  CreateUserDto, CreateUserMsg, DeactivateUserMsg, FindUserByIdMsg, FindUserQueryDto,
  JwtPayload, Paginated, Role, UpdateRoleDto, UpdateRoleMsg, UpdateUserDto, UpdateUserMsg,
  USER_CMD, UserView,
} from '@app/shared';
import { BusService } from '../../bus/bus.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly bus: BusService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get()
  findAll(@Query() query: FindUserQueryDto) {
    return this.bus.send<Paginated<UserView>, FindUserQueryDto>(USER_CMD.FIND_ALL, query);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: JwtPayload) {
    return this.bus.send<UserView, CreateUserMsg>(USER_CMD.CREATE, { dto, actorId: actor.sub });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bus.send<UserView, FindUserByIdMsg>(USER_CMD.FIND_BY_ID, { id });
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateUserDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.bus.send<UserView, UpdateUserMsg>(USER_CMD.UPDATE, { id, data, actor });
  }

  @Roles(Role.ADMIN)
  @Patch(':id/role')
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.bus.send<UserView, UpdateRoleMsg>(USER_CMD.UPDATE_ROLE, {
      id,
      roleCode: dto.roleCode,
      actor,
    });
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: JwtPayload) {
    return this.bus.send<UserView, DeactivateUserMsg>(USER_CMD.DEACTIVATE, { id, actor });
  }
}
```

`src/modules/users/users.module.ts`

```ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';

@Module({ controllers: [UsersController] })
export class UsersModule {}
```

---

## 8. `app.module.ts` và `main.ts`

`src/app.module.ts` (ghi đè)

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { BusModule } from './bus/bus.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api-gateway/.env', '.env'],
    }),
    // Gateway chỉ XÁC MINH token, không ký
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
    BusModule,
    AuthModule,
    UsersModule,
  ],
  providers: [
    // Thứ tự quan trọng: xác thực trước, phân quyền sau
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
```

`src/main.ts` (ghi đè)

```ts
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RpcToHttpFilter } from './common/filters/rpc-to-http.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.get<string>('CORS_ORIGIN', '*') });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new RpcToHttpFilter());

  const port = Number(config.get('PORT', 3000));
  await app.listen(port);
  Logger.log(`api-gateway chạy tại http://localhost:${port}/api`, 'Bootstrap');
}
bootstrap();
```

`whitelist` + `forbidNonWhitelisted` giúp chặn client lén gửi thêm trường (ví dụ `role` khi đăng ký).

---

## 9. Chạy và kiểm tra

Mở hai terminal:

```bash
npm run start:user      # terminal 1
npm run start:gateway   # terminal 2
```

Kịch bản kiểm tra (đổi mật khẩu admin theo `.env` của user-service):

```bash
BASE=http://localhost:3000/api

# 1. Đăng nhập admin → lấy token
curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"ChangeMe123!"}'
# → {"accessToken":"...","refreshToken":"...","user":{...}}   (copy accessToken vào biến)
TOKEN=<accessToken>

# 2. Xem thông tin bản thân
curl -s $BASE/auth/me -H "Authorization: Bearer $TOKEN"

# 3. Làm mới cặp token bằng refresh token
curl -s -X POST $BASE/auth/refresh-token -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<refresh-token>"}'

# 4. ADMIN hoặc MANAGER tạo user
curl -s -X POST $BASE/users -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"username":"an","password":"Password123","email":"an@example.com","roleCode":"EMPLOYEE","fullname":"Nguyen Van An","dob":"2000-01-01","phone":"0900000000"}'

# 5. Admin/Manager xem danh sách user
curl -s "$BASE/users?page=1&limit=10" -H "Authorization: Bearer $TOKEN"
```

Các trường hợp lỗi cần thấy đúng:

| Thao tác | Kết quả mong đợi |
|---|---|
| `GET /users` không có token | 401 "Thiếu access token" |
| Đăng nhập sai mật khẩu | 401 "Wrong username or password" |
| Đăng nhập bằng `an`, rồi `GET /users` | 403 (EMPLOYEE không được xem danh sách) |
| `POST /auth/refresh-token` với token sai/hết hạn | 401 |
| `POST /users` thiếu `roleCode`, `dob` hoặc trường bắt buộc | 400 |
| Tắt `user-service` rồi gọi `/auth/login` | 504 sau `RPC_TIMEOUT_MS` |
| `PATCH /users/<id của người khác>` bằng token EMPLOYEE | 403 (do user-service) |

Nếu đăng nhập bị timeout dù cả hai app đang chạy: kiểm tra `user_queue` đã có bindings `cmd.user.*` trong CloudAMQP chưa; nếu có mà vẫn timeout, xem mục 9.6 của `folder_structure.md` (RabbitMQ wildcards).

---

## 10. Thêm module cho service khác

Mỗi service mới chỉ cần: một thư mục `modules/<tên>/`, một controller, một module, và một dòng import trong `app.module.ts`. **Không** sửa `BusModule`, **không** đăng ký client mới.

Ví dụ `devices` (sau khi `device-service` đã có contract `DEVICE_CMD`):

`src/modules/devices/devices.controller.ts`

```ts
import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { DEVICE_CMD, CreateDeviceDto, FindDevicesQueryDto, JwtPayload, Role } from '@app/shared';
import { BusService } from '../../bus/bus.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('devices')
export class DevicesController {
  constructor(private readonly bus: BusService) {}

  @Get()
  findAll(@Query() query: FindDevicesQueryDto) {
    return this.bus.send(DEVICE_CMD.FIND_ALL, query);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post()
  create(@Body() dto: CreateDeviceDto, @CurrentUser() actor: JwtPayload) {
    return this.bus.send(DEVICE_CMD.CREATE, { dto, actorId: actor.sub });
  }

  @Patch(':id/report-broken')
  reportBroken(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: JwtPayload) {
    return this.bus.send(DEVICE_CMD.REPORT_BROKEN, { id, actor });
  }
}
```

Quy tắc khi viết controller ở gateway:

1. Controller **chỉ**: validate DTO (từ `@app/shared`), lấy người dùng từ `@CurrentUser()`, gọi `bus.send()`. Không `if/else` nghiệp vụ.
2. Truyền thông tin người thực hiện (`actor` / `actorId`) trong payload để service và audit biết ai làm.
3. Gắn `@Roles(...)` cho các route cần giới hạn; để trống nếu mọi người đã đăng nhập đều được dùng.
4. Chỉ gateway và `report-service` gọi `cmd.*` (đồng bộ); đừng để gateway chờ chuỗi nhiều service.

Ghi chú theo module:

| Module | Ghi chú |
|---|---|
| `reports` | Gateway gọi `cmd.report.*`; chính `report-service` mới gọi `cmd.*.stats` của các service khác. |
| `notifications` | Nên lọc theo người dùng hiện tại (`actor.sub`) ngay từ payload. |
| `audit` | Giới hạn `@Roles(Role.ADMIN)`. |
| `ai-assistant` | Upload dùng `FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })` kèm `@types/multer`; chỉ nhận pdf/docx (kiểm tra `file.mimetype`); gửi `file.buffer.toString('base64')` trong payload; route upload trả `202` vì xử lý ở service diễn ra nền. |

---

## 11. Docker

Block `api-gateway` đã có trong `docker-compose.yml` (xem `folder_structure.md`, mục 8) và là service **duy nhất** có `ports`.

```bash
docker compose up --build api-gateway user-service
curl http://localhost:3000/api/auth/login ...   # như mục 9
```

Trong container, `PORT` lấy từ `apps/api-gateway/.env` (giữ `3000` để khớp `"3000:3000"`).

---

## 12. Lưu ý và lỗi thường gặp

| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| Mọi route trả 401 dù token mới | `JWT_SECRET` ở gateway khác với user-service (nhớ cả hai đọc `.env` gốc). |
| `504` ngay khi gọi một route | Service tương ứng chưa chạy, hoặc queue chưa bind pattern đó (sai tên pattern/hằng số). |
| `Cannot find module '@app/shared'` | Thiếu alias trong `tsconfig.json` hoặc chưa export contract trong `libs/shared/src/index.ts`. |
| Body hợp lệ nhưng bị 400 "property ... should not exist" | DTO thiếu decorator `class-validator` cho trường đó (whitelist loại bỏ trường không có decorator). |
| Lỗi 500 "Internal server error" từ service | Xem log của **service** (gateway chỉ thấy lỗi đã được che). |
| Số kết nối CloudAMQP tăng dần | Có nơi tạo thêm `ClientProxy`. Giữ một `BUS_CLIENT` duy nhất cho mỗi app. |

Hạn chế đã biết: gateway chỉ xác minh chữ ký và hạn của token, không hỏi lại database. Token của tài khoản vừa bị vô hiệu hóa vẫn dùng được đến khi hết hạn (xem mục 11 của `user-service_instruction.md`).
