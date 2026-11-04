# Cấu trúc Backend – NestJS Microservices

Gateway + 8 service, giao tiếp qua RabbitMQ (CloudAMQP), mỗi service một database trên Neon (trừ `report-service`), đóng gói bằng Docker.

> **Phạm vi hiện tại:** chưa có Saga, chưa có Redis. Khi cần, chỉ thêm code vào từng service, không phải đổi cấu trúc dưới đây.
> **Phiên bản tham chiếu:** Node 22, NestJS 11, Prisma 7. Nếu dùng phiên bản khác, kiểm tra lại docs của Prisma (`prisma.config.ts`, driver adapter) và `@nestjs/microservices` (RabbitMQ wildcards).

---

## 1. Tổng quan

```text
Client ──HTTP──► api-gateway (:3000, cổng DUY NHẤT mở ra ngoài)
                    │
                    │  RabbitMQ (CloudAMQP) – 1 exchange kiểu topic: "app.bus"
                    │    cmd.<service>.<action>   → request/response (client.send)
                    │    evt.<service>.<event>    → sự kiện          (client.emit)
                    │
 ┌───────┬─────────┬──────────────┬───────────┬──────────────┬────────┬──────────────┬───────┐
 user   device   maintenance   inventory   notification   report   ai-assistant   audit
 │       │          │             │            │          (không DB)     │            │
 ▼       ▼          ▼             ▼            ▼                         ▼            ▼
 Neon PostgreSQL – mỗi service một database riêng (ai-assistant bật thêm pgvector)
```

Ba nguyên tắc xuyên suốt:

1. **Gateway** chỉ nhận HTTP, xác thực JWT, kiểm tra role thô, rồi chuyển message. Không có nghiệp vụ, không đụng database.
2. **Mỗi service sở hữu database của nó.** Muốn dữ liệu của service khác thì gửi `cmd.*` (hỏi) hoặc nhận `evt.*` (được báo), không bao giờ đọc DB của nhau.
3. **`libs/shared` chỉ chứa "hợp đồng"** (tên pattern, kiểu payload, DTO đi qua ranh giới service, hàm dựng config RMQ). Không chứa nghiệp vụ, Prisma, hay provider có trạng thái.

---

## 2. Danh sách service

| Service | Trách nhiệm | Database (Neon) | Queue | RPC phục vụ |
|---|---|---|---|---|
| `api-gateway` | Entry point HTTP, JWT, route | không | không có queue (chỉ là client) | không |
| `user-service` | Xác thực (username, password, role), cấp JWT, quản lý thông tin người dùng | `user_db` | `user_queue` | `cmd.user.*` |
| `device-service` | Quản lý thiết bị | `device_db` | `device_queue` | `cmd.device.*` |
| `maintenance-service` | Phiếu/lịch bảo trì | `maintenance_db` | `maintenance_queue` | `cmd.maintenance.*` |
| `inventory-service` | Vật tư, phụ tùng, tồn kho | `inventory_db` | `inventory_queue` | `cmd.inventory.*` |
| `notification-service` | Gửi thông báo và **lưu lại để đọc lại** | `notification_db` | `notification_queue` | `cmd.notification.*` |
| `report-service` | Tổng hợp số liệu từ các service khác | **không có** | `report_queue` | `cmd.report.*` |
| `ai-assistant-service` | Tải tài liệu, trả lời dựa trên tài liệu (Gemini + pgvector) | `ai_assistant_db` (+ pgvector) | `ai_assistant_queue` | `cmd.ai.*` |
| `audit-service` | Lưu nhật ký hành động trong hệ thống | `audit_db` | `audit_queue` | `cmd.audit.*` |

### Sự kiện phát / nhận (khởi điểm, thêm bớt khi dựng từng service)

Mọi service đều **có thể** phát và nhận sự kiện của riêng nó. Bảng dưới là bộ sự kiện gợi ý ban đầu.

| Service | Phát (`evt.*`) | Nhận (`evt.*`) |
|---|---|---|
| user | `user.registered`, `user.created`, `user.logged_in`, `user.login_failed`, `user.updated`, `user.role_changed`, `user.password_changed`, `user.deactivated` | không (chưa cần) |
| device | `device.created`, `device.updated`, `device.status_changed`, `device.broken`, `device.retired` | `maintenance.ticket_completed` (đưa thiết bị về trạng thái hoạt động) |
| maintenance | `maintenance.ticket_created`, `maintenance.ticket_assigned`, `maintenance.ticket_completed` | `device.broken` (tự tạo phiếu) |
| inventory | `inventory.item_created`, `inventory.stock_changed`, `inventory.low_stock` | `maintenance.ticket_completed` (trừ vật tư đã dùng) |
| notification | `notification.sent`, `notification.failed` | `maintenance.ticket_created`, `maintenance.ticket_assigned`, `device.broken`, `inventory.low_stock`, `user.registered` |
| report | `report.generated` | không (không có DB để lưu, lấy số liệu bằng `cmd.*.stats`) |
| ai-assistant | `ai.document_uploaded`, `ai.document_ready`, `ai.document_failed`, `ai.question_asked` | `user.deactivated` (tùy chọn: dọn tài liệu) |
| audit | **không phát** (tránh vòng lặp vì nó nhận tất cả) | `evt.#` (toàn bộ sự kiện) |

---

## 3. Cây thư mục hoàn chỉnh

```text
backend/
├── apps/
│   ├── api-gateway/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── bus/                          # BusModule + BusService: gọi RPC qua RabbitMQ
│   │   │   ├── common/
│   │   │   │   ├── decorators/               # @Public, @Roles, @CurrentUser
│   │   │   │   ├── guards/                   # JwtAuthGuard, RolesGuard
│   │   │   │   └── filters/                  # RpcToHttpFilter (lỗi RPC → HTTP status)
│   │   │   └── modules/                      # mỗi module = nhóm route của 1 service
│   │   │       ├── auth/                     # /auth/*          → user-service
│   │   │       ├── users/                    # /users/*         → user-service
│   │   │       ├── devices/                  # /devices/*       → device-service
│   │   │       ├── maintenance/              # /maintenance/*
│   │   │       ├── inventory/                # /inventory/*
│   │   │       ├── notifications/            # /notifications/*
│   │   │       ├── reports/                  # /reports/*
│   │   │       ├── ai-assistant/             # /ai/*  (upload tài liệu, hỏi đáp)
│   │   │       └── audit/                    # /audit/*
│   │   ├── tsconfig.app.json
│   │   └── .env.example
│   │
│   ├── user-service/                         # ★ service mẫu – các service khác sao chép khung này
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/                   # commit vào Git
│   │   ├── prisma.config.ts
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── prisma/
│   │   │   │   ├── prisma.module.ts
│   │   │   │   ├── prisma.service.ts
│   │   │   │   └── generated/                # PrismaClient do Prisma sinh (gitignore)
│   │   │   ├── messaging/
│   │   │   │   ├── messaging.module.ts       # đăng ký BUS_CLIENT
│   │   │   │   ├── user-events.publisher.ts  # PHÁT sự kiện của user-service
│   │   │   │   └── consumers/                # NHẬN sự kiện của service khác (chưa có)
│   │   │   └── modules/
│   │   │       ├── auth/                     # login, register, đổi mật khẩu, cấp JWT
│   │   │       └── users/                    # CRUD thông tin người dùng, seed admin
│   │   ├── tsconfig.app.json
│   │   └── .env.example
│   │
│   ├── device-service/
│   │   ├── prisma/ + prisma.config.ts        # như user-service
│   │   └── src/
│   │       ├── prisma/
│   │       ├── messaging/
│   │       │   ├── device-events.publisher.ts
│   │       │   └── consumers/maintenance-events.consumer.ts
│   │       └── modules/devices/
│   │
│   ├── maintenance-service/
│   │   ├── prisma/ + prisma.config.ts
│   │   └── src/
│   │       ├── prisma/
│   │       ├── messaging/
│   │       │   ├── maintenance-events.publisher.ts
│   │       │   └── consumers/device-events.consumer.ts     # nghe evt.device.broken
│   │       └── modules/tickets/
│   │
│   ├── inventory-service/
│   │   ├── prisma/ + prisma.config.ts
│   │   └── src/
│   │       ├── prisma/
│   │       ├── messaging/
│   │       │   ├── inventory-events.publisher.ts
│   │       │   └── consumers/maintenance-events.consumer.ts
│   │       └── modules/items/
│   │
│   ├── notification-service/
│   │   ├── prisma/ + prisma.config.ts        # lưu thông báo để đọc lại
│   │   └── src/
│   │       ├── prisma/
│   │       ├── messaging/
│   │       │   ├── notification-events.publisher.ts
│   │       │   └── consumers/                # nhận nhiều nguồn: device, maintenance, inventory, user
│   │       └── modules/notifications/        # lưu DB, danh sách, đánh dấu đã đọc, kênh gửi
│   │
│   ├── report-service/                       # KHÔNG có prisma/
│   │   └── src/
│   │       ├── bus/                          # BusService (gọi cmd.*.stats của service khác)
│   │       ├── messaging/
│   │       │   ├── messaging.module.ts
│   │       │   └── report-events.publisher.ts
│   │       └── modules/reports/              # ghép số liệu từ nhiều service
│   │
│   ├── ai-assistant-service/
│   │   ├── prisma/ + prisma.config.ts        # migration đầu tiên có CREATE EXTENSION vector
│   │   └── src/
│   │       ├── prisma/
│   │       ├── messaging/
│   │       │   └── ai-events.publisher.ts
│   │       ├── gemini/                       # GeminiService: embed(), generate()
│   │       └── modules/
│   │           ├── documents/                # upload, parse (pdf/docx), chunk, embed, lưu vector
│   │           └── chat/                     # embed câu hỏi → tìm chunk gần nhất → Gemini Flash trả lời
│   │
│   └── audit-service/
│       ├── prisma/ + prisma.config.ts
│       └── src/
│           ├── prisma/
│           ├── messaging/
│           │   └── consumers/all-events.consumer.ts        # @EventPattern('evt.#')
│           └── modules/audit-logs/           # lưu và truy vấn nhật ký
│
├── libs/
│   └── shared/
│       └── src/
│           ├── index.ts                      # barrel export (import từ '@app/shared')
│           ├── constants/
│           │   └── messaging.constants.ts    # BUS_EXCHANGE, BUS_CLIENT, QUEUES, SERVICES
│           ├── messaging/
│           │   ├── bus-options.ts            # busClientOptions(), busServerOptions()
│           │   └── event-envelope.ts         # EventEnvelope, buildEvent()
│           ├── contracts/                    # HỢP ĐỒNG của từng service (chủ sở hữu = service đó)
│           │   ├── user/                     # patterns, events, dto, messages, types
│           │   ├── device/
│           │   ├── maintenance/
│           │   ├── inventory/
│           │   ├── notification/
│           │   ├── report/
│           │   ├── ai-assistant/
│           │   └── audit/
│           ├── types/                        # role.ts, jwt-payload.ts, pagination.ts
│           └── exceptions/
│               └── rpc-error.filter.ts       # lỗi trong service → {statusCode, message}
│
├── docker/
│   └── Dockerfile                            # 1 file cho cả 9 app (ARG APP)
├── docker-compose.yml
├── .dockerignore
├── .env.example                              # biến dùng chung
├── .gitignore
├── nest-cli.json
├── package.json
├── tsconfig.json
└── README.md
```

---

## 4. Giải thích các thư mục chính

| Thư mục | Mục đích |
|---|---|
| `apps/api-gateway` | App HTTP duy nhất. Controller chỉ validate input, lấy user từ JWT rồi gọi `BusService.send()`. |
| `apps/<x>-service` | Mỗi service là một app Nest độc lập, chạy như microservice RMQ, có `.env`, Prisma, module riêng. |
| `src/prisma/` | `PrismaModule`/`PrismaService` của riêng service + `generated/` (client do Prisma sinh, gitignore). |
| `src/messaging/` | **Mọi thứ liên quan RabbitMQ của service**: `*-events.publisher.ts` (phát) và `consumers/` (nhận). Muốn biết service phát/nhận gì chỉ cần mở thư mục này. |
| `src/modules/<domain>/` | Nghiệp vụ: controller (`@MessagePattern`), service, và dto/entity riêng nếu có. |
| `src/bus/` | Chỉ có ở service cần **gọi cmd sang service khác** (gateway, report). Là wrapper nhỏ quanh `ClientProxy.send()`. |
| `libs/shared/src/contracts/<service>/` | Pattern, payload sự kiện, DTO, kiểu trả về của service đó. Chủ sở hữu viết, service khác chỉ đọc. |
| `libs/shared/src/messaging/` | Hàm dựng config RMQ và `EventEnvelope`. |
| `docker/Dockerfile` | Một Dockerfile build bất kỳ app nào bằng `--build-arg APP=<tên>`. |

### Shared: nên và không nên

| Nên đặt | Không được đặt |
|---|---|
| Tên queue, pattern (`cmd.*`, `evt.*`) | Business logic (`*Service` của domain) |
| Interface payload sự kiện, DTO đi qua ranh giới service | Prisma schema, `PrismaService`, query |
| `EventEnvelope`, `busClientOptions/ServerOptions` | Secret, URL, giá trị cấu hình |
| `Role`, `JwtPayload`, `Paginated<T>` | Code chỉ một app dùng (ví dụ guard/decorator HTTP chỉ gateway dùng) |
| `RpcErrorFilter` | Module Nest "cho tiện" inject service domain |

Quy tắc chống "God module": chỉ đưa vào shared khi **≥ 2 app** dùng; shared **không import từ `apps/`**; thấy `class XxxService` trong `libs/shared` thì loại bỏ. Bên trong `libs/shared`, import bằng đường dẫn tương đối; các app import bằng `@app/shared`.

---

## 5. Quy ước messaging (RabbitMQ)

### Một exchange, một queue cho mỗi service

- Exchange `app.bus` (kiểu **topic**), tạo tự động khi app khởi động.
- Mỗi service có **một queue durable** (`user_queue`...). Queue được bind với đúng các routing key mà service có handler (`@MessagePattern` / `@EventPattern`).
- Mỗi app có **một `ClientProxy` duy nhất** (`BUS_CLIENT`) để vừa `send` vừa `emit`. Nhờ vậy publisher **không cần biết ai nhận**, thêm consumer mới không phải sửa publisher.

### Hai loại routing key (tách tiền tố để không lẫn)

| Loại | Dạng | API | Ví dụ |
|---|---|---|---|
| Lệnh (request/response) | `cmd.<service>.<action>` | `client.send()` + `@MessagePattern` | `cmd.user.login` |
| Sự kiện | `evt.<service>.<event>` | `client.emit()` + `@EventPattern` | `evt.device.broken` |

Audit bind `evt.#` nên **bắt buộc** tách `cmd.` và `evt.`; nếu không audit sẽ nhận cả bản sao của request RPC và trả lời trùng cho client.

### Envelope chuẩn cho mọi sự kiện

```ts
interface EventEnvelope<T> {
  eventId: string;        // uuid – để consumer chống xử lý trùng sau này
  correlationId: string;  // uuid – theo dõi một chuỗi sự kiện
  type: string;           // = routing key, ví dụ 'evt.device.broken'
  source: string;         // 'device-service'
  occurredAt: string;     // ISO
  actorId?: string;       // ai gây ra hành động (audit cần)
  data: T;                // payload nghiệp vụ
}
```

Hai trường `eventId`/`correlationId` gần như không tốn gì nhưng giúp thêm idempotency/saga về sau mà không phải sửa lại mọi event.

### Quy tắc

1. `cmd.*` chỉ gọi tới **service sở hữu** (tiền tố = tên service). Chủ yếu gateway và report gọi `cmd.*`. Service nghiệp vụ nói chuyện với nhau bằng `evt.*`, tránh chuỗi gọi đồng bộ.
2. Service nào muốn góp số liệu cho báo cáo thì expose `cmd.<service>.stats`. `report-service` gọi các `stats` này rồi ghép lại.
3. Sự kiện đặt tên ở thì quá khứ, payload có **đủ dữ liệu consumer cần** (không chỉ mỗi id), **không chứa mật khẩu/secret**.
4. Mỗi service chỉ bind routing key mà nó thực sự xử lý.
5. Audit không phát sự kiện (tránh vòng lặp vô hạn).
6. Không gửi file qua RabbitMQ, trừ ai-assistant (base64, giới hạn ≤ 10 MB).
7. Sự kiện phát lúc consumer đang tắt vẫn được giữ lại **nếu queue của consumer đã từng được tạo** (đã chạy ít nhất một lần). Chưa từng chạy thì sự kiện bị bỏ.
8. Service tắt thì `cmd.*` tới nó sẽ timeout (Gateway trả 504).
9. Mặc định `noAck: true` (đơn giản, message bị xóa ngay khi giao). Nếu cần không mất sự kiện khi consumer crash giữa chừng, chuyển consumer sự kiện sang `noAck: false` + ack thủ công sau.

---

## 6. Prisma & Database

- Mỗi service (trừ gateway, report) có `prisma/schema.prisma`, `prisma.config.ts`, `migrations/` **trong thư mục service**.
- Client sinh ra ngay trong `src/prisma/generated/` của service đó, nên service khác không có `PrismaClient` của nó để import.
- Neon: một project, nhiều database: `user_db`, `device_db`, `maintenance_db`, `inventory_db`, `notification_db`, `ai_assistant_db`, `audit_db` (kiểm tra giới hạn gói Neon bạn dùng).
- Mỗi service có hai biến: `DATABASE_URL` (pooled, host có `-pooler`, dùng lúc chạy) và `DIRECT_URL` (không pooled, dùng cho `prisma migrate`).
- Migration chạy từ máy dev trỏ thẳng vào Neon (`prisma migrate dev` / `prisma migrate deploy`), **không** chạy trong container khi khởi động.
- Sau khi `git clone`, mỗi service cần chạy `prisma generate` (Dockerfile tự làm).

### ai-assistant-service và pgvector

- Bật extension: migration đầu tiên của service này tạo bằng `--create-only` rồi thêm dòng `CREATE EXTENSION IF NOT EXISTS vector;` ở đầu file SQL.
- Prisma chưa hỗ trợ kiểu vector đầy đủ: khai báo cột bằng `Unsupported("vector(768)")`, ghi/tìm bằng `$executeRaw` / `$queryRaw` (toán tử `<=>` cosine distance).
- Số chiều embedding đặt cố định (khuyến nghị 768) và lấy từ biến môi trường để khớp với model.
- Hai bảng đủ dùng: `documents` (ownerId, tên file, trạng thái `PROCESSING|READY|FAILED`) và `document_chunks` (documentId, nội dung, embedding).
- Luồng: Gateway nhận file (multipart, memory, ≤ 10 MB, chỉ pdf/docx) → gửi base64 qua `cmd.ai.upload_document` → service lưu bản ghi `PROCESSING` và trả ngay → xử lý nền (parse, chunk, embed bằng Gemini embedding) → cập nhật `READY` và phát `evt.ai.document_ready`.
- Hỏi đáp: `cmd.ai.ask` → embed câu hỏi → tìm chunk gần nhất **chỉ trong tài liệu của chính người hỏi** → đưa vào prompt cho Gemini Flash → trả lời kèm nguồn.
- Tên model đặt trong env, kiểm tra tên mới nhất trên docs của Google AI. Gói thư viện dự kiến: `@google/genai`, `pdf-parse`, `mammoth`; gateway thêm `@types/multer` (dev).

---

## 7. Environment

Hai tầng, không lặp credential:

```text
backend/
├── .env                          # dùng chung: RABBITMQ_URL, JWT_SECRET   (gitignore)
├── .env.example                  # commit
└── apps/
    ├── api-gateway/.env(.example)
    ├── user-service/.env(.example)
    ├── device-service/.env(.example)
    ├── maintenance-service/.env(.example)
    ├── inventory-service/.env(.example)
    ├── notification-service/.env(.example)
    ├── ai-assistant-service/.env(.example)
    ├── audit-service/.env(.example)
    └── (report-service không có .env riêng, chỉ dùng .env gốc)
```

`.env.example` (gốc):

```env
NODE_ENV=development
RABBITMQ_URL=amqps://<user>:<password>@<host>.rmq.cloudamqp.com/<vhost>
# Dùng chung giữa user-service (ký) và api-gateway (xác minh). Sinh bằng:
# node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=change-me
```

Mẫu `apps/<db-service>/.env.example`:

```env
# Pooled (host có -pooler) – dùng lúc chạy
DATABASE_URL=postgresql://<user>:<pass>@<host>-pooler.<region>.aws.neon.tech/<db_name>?sslmode=require
# Direct – dùng cho prisma migrate
DIRECT_URL=postgresql://<user>:<pass>@<host>.<region>.aws.neon.tech/<db_name>?sslmode=require
```

Biến riêng: `api-gateway` (`PORT`, `CORS_ORIGIN`, `RPC_TIMEOUT_MS`), `user-service` (`JWT_EXPIRES_IN`, `ADMIN_*`), `ai-assistant-service` (`GEMINI_API_KEY`, `GEMINI_CHAT_MODEL`, `GEMINI_EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`, `MAX_UPLOAD_MB`).

Lưu ý: vì `JWT_SECRET` nằm ở `.env` gốc nên mọi container đều nhận được nó. Với dự án này chấp nhận được; nếu muốn chặt hơn thì chép vào `.env` của hai app cần dùng (phải giống hệt nhau).

---

## 8. Docker

Docker chỉ đóng gói 9 app. **Không** có container PostgreSQL/RabbitMQ vì dùng Neon và CloudAMQP. Chỉ `api-gateway` mở port ra ngoài; các service chỉ kết nối **ra** CloudAMQP và Neon.

`docker/Dockerfile`:

```dockerfile
FROM node:24-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG APP
# Chỉ generate Prisma client nếu app có schema. DIRECT_URL giả chỉ để config nạp được lúc build.
RUN if [ -f apps/$APP/prisma/schema.prisma ]; then \
      DIRECT_URL="postgresql://build:build@localhost:5432/build" \
      npx prisma generate --config apps/$APP/prisma.config.ts; \
    fi
RUN npx nest build $APP

FROM node:24-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
ARG APP
ENV APP=$APP
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
CMD node dist/apps/$APP/main.js
```

`.dockerignore`:

```text
node_modules
dist
.git
.env
**/.env
**/generated
npm-debug.log
```

`docker-compose.yml`:

```yaml
x-app: &app
  restart: unless-stopped

services:
  api-gateway:
    <<: *app
    build: { context: ., dockerfile: docker/Dockerfile, args: { APP: api-gateway } }
    env_file: [.env, apps/api-gateway/.env]
    ports: ["3000:3000"]

  user-service:
    <<: *app
    build: { context: ., dockerfile: docker/Dockerfile, args: { APP: user-service } }
    env_file: [.env, apps/user-service/.env]

  device-service:
    <<: *app
    build: { context: ., dockerfile: docker/Dockerfile, args: { APP: device-service } }
    env_file: [.env, apps/device-service/.env]

  maintenance-service:
    <<: *app
    build: { context: ., dockerfile: docker/Dockerfile, args: { APP: maintenance-service } }
    env_file: [.env, apps/maintenance-service/.env]

  inventory-service:
    <<: *app
    build: { context: ., dockerfile: docker/Dockerfile, args: { APP: inventory-service } }
    env_file: [.env, apps/inventory-service/.env]

  notification-service:
    <<: *app
    build: { context: ., dockerfile: docker/Dockerfile, args: { APP: notification-service } }
    env_file: [.env, apps/notification-service/.env]

  report-service:
    <<: *app
    build: { context: ., dockerfile: docker/Dockerfile, args: { APP: report-service } }
    env_file: [.env]

  ai-assistant-service:
    <<: *app
    build: { context: ., dockerfile: docker/Dockerfile, args: { APP: ai-assistant-service } }
    env_file: [.env, apps/ai-assistant-service/.env]

  audit-service:
    <<: *app
    build: { context: ., dockerfile: docker/Dockerfile, args: { APP: audit-service } }
    env_file: [.env, apps/audit-service/.env]
```

Compose báo lỗi nếu file trong `env_file` không tồn tại, nên khi dựng dần chỉ build/up các service đã có `.env`: `docker compose up --build user-service api-gateway`.

Số kết nối CloudAMQP: mỗi app dùng khoảng 2 connection (1 server lắng nghe + 1 client), gateway 1. Với 9 app là khoảng 17. Gói free của CloudAMQP có giới hạn connection (kiểm tra lại trên trang gói), nên khi dev đừng chạy đồng thời cả bản local và bản Docker của cùng một service.

---

## 9. Khởi tạo nền (làm MỘT lần, trước khi dựng service)

### 9.1 Tạo monorepo

```bash
npm i -g @nestjs/cli@11

# App đầu tiên đặt tên là api-gateway để không phải xóa app mặc định
nest new api-gateway --package-manager npm

nest g app user-service
nest g app device-service
nest g app maintenance-service
nest g app inventory-service
nest g app notification-service
nest g app report-service
nest g app ai-assistant-service
nest g app audit-service

nest g lib shared --no-spec            # khi hỏi prefix, nhấn Enter để dùng @app → '@app/shared'

# Dọn boilerplate
rm -f apps/*/src/app.controller.ts apps/*/src/app.controller.spec.ts apps/*/src/app.service.ts
rm -rf apps/*/test
rm -f libs/shared/src/shared.module.ts libs/shared/src/shared.service.ts libs/shared/src/shared.service.spec.ts
```

Từ lúc này `app.module.ts` của các app còn tham chiếu file đã xóa; mỗi app sẽ được ghi đè `app.module.ts` khi dựng. Chỉ `nest start` / `nest build` app bạn đang làm.

Kiểm tra `tsconfig.json` gốc có `"@app/shared": ["libs/shared/src"]` và `"@app/shared/*": ["libs/shared/src/*"]` trong `paths`.

### 9.2 Cài package (tất cả service dùng chung một `node_modules`)

```bash
npm i @nestjs/microservices@^11 @nestjs/config @nestjs/jwt amqplib amqp-connection-manager \
      class-validator class-transformer @prisma/client@^7 @prisma/adapter-pg@^7 pg bcryptjs
npm i -D prisma@^7 dotenv @types/pg
```

Dùng `bcryptjs` (thuần JS) thay `bcrypt` để build Docker alpine không gặp lỗi native. Không cài thêm Passport, Swagger, Redis, v.v.

### 9.3 Bổ sung `.gitignore`

```text
.env
**/.env
node_modules
dist
**/src/prisma/generated
```

### 9.4 Tạo `libs/shared`

`libs/shared/src/constants/messaging.constants.ts`

```ts
export const BUS_EXCHANGE = 'app.bus';
export const BUS_CLIENT = 'BUS_CLIENT';

export const QUEUES = {
  USER: 'user_queue',
  DEVICE: 'device_queue',
  MAINTENANCE: 'maintenance_queue',
  INVENTORY: 'inventory_queue',
  NOTIFICATION: 'notification_queue',
  REPORT: 'report_queue',
  AI_ASSISTANT: 'ai_assistant_queue',
  AUDIT: 'audit_queue',
} as const;

export const SERVICES = {
  GATEWAY: 'api-gateway',
  USER: 'user-service',
  DEVICE: 'device-service',
  MAINTENANCE: 'maintenance-service',
  INVENTORY: 'inventory-service',
  NOTIFICATION: 'notification-service',
  REPORT: 'report-service',
  AI_ASSISTANT: 'ai-assistant-service',
  AUDIT: 'audit-service',
} as const;
```

`libs/shared/src/messaging/bus-options.ts`

```ts
import { RmqOptions, Transport } from '@nestjs/microservices';
import { BUS_EXCHANGE } from '../constants/messaging.constants';

/** Dùng cho ClientProxy: vừa send() vừa emit() qua exchange topic. */
export const busClientOptions = (url: string): RmqOptions => ({
  transport: Transport.RMQ,
  options: {
    urls: [url],
    exchange: BUS_EXCHANGE,
    exchangeType: 'topic',
    wildcards: true,
    persistent: true,
  },
});

/** Dùng cho app.connectMicroservice(): lắng nghe queue của service, bind theo các pattern có handler. */
export const busServerOptions = (url: string, queue: string): RmqOptions => ({
  transport: Transport.RMQ,
  options: {
    urls: [url],
    queue,
    queueOptions: { durable: true },
    exchange: BUS_EXCHANGE,
    exchangeType: 'topic',
    wildcards: true,
    persistent: true,
    noAck: true,
    prefetchCount: 10,
  },
});
```

`libs/shared/src/messaging/event-envelope.ts`

```ts
import { randomUUID } from 'crypto';

export interface EventEnvelope<T = unknown> {
  eventId: string;
  correlationId: string;
  type: string;
  source: string;
  occurredAt: string;
  actorId?: string;
  data: T;
}

export function buildEvent<T>(params: {
  type: string;
  source: string;
  data: T;
  actorId?: string;
  correlationId?: string;
}): EventEnvelope<T> {
  return {
    eventId: randomUUID(),
    correlationId: params.correlationId ?? randomUUID(),
    type: params.type,
    source: params.source,
    occurredAt: new Date().toISOString(),
    actorId: params.actorId,
    data: params.data,
  };
}
```

`libs/shared/src/exceptions/rpc-error.filter.ts`

```ts
import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common';
import { RpcException, RpcExceptionFilter } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

/**
 * Trong service cứ throw NotFoundException/ConflictException/...;
 * filter đổi thành { statusCode, message } để Gateway map lại sang HTTP.
 */
@Catch()
export class RpcErrorFilter implements RpcExceptionFilter {
  private readonly logger = new Logger(RpcErrorFilter.name);

  catch(exception: unknown, _host: ArgumentsHost): Observable<never> {
    if (exception instanceof RpcException) {
      return throwError(() => exception.getError());
    }
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const message =
        typeof body === 'string' ? body : ((body as any).message ?? exception.message);
      return throwError(() => ({ statusCode: exception.getStatus(), message }));
    }
    this.logger.error(exception);
    return throwError(() => ({ statusCode: 500, message: 'Internal server error' }));
  }
}
```

`libs/shared/src/types/role.ts`

```ts
// Giữ đồng bộ với enum Role trong prisma/schema.prisma của user-service.
export const Role = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  TECHNICIAN: 'TECHNICIAN',
  EMPLOYEE: 'EMPLOYEE',
} as const;
export type Role = (typeof Role)[keyof typeof Role];
```

`libs/shared/src/types/jwt-payload.ts`

```ts
import { Role } from './role';

export interface JwtPayload {
  sub: string;       // userId
  username: string;
  role: Role;
  iat?: number;
  exp?: number;
}
```

`libs/shared/src/types/pagination.ts`

```ts
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
```

`libs/shared/src/index.ts`

```ts
export * from './constants/messaging.constants';
export * from './messaging/bus-options';
export * from './messaging/event-envelope';
export * from './exceptions/rpc-error.filter';
export * from './types/role';
export * from './types/jwt-payload';
export * from './types/pagination';

// Contracts: bỏ comment từng dòng khi dựng service tương ứng
// export * from './contracts/user';
// export * from './contracts/device';
// export * from './contracts/maintenance';
// export * from './contracts/inventory';
// export * from './contracts/notification';
// export * from './contracts/report';
// export * from './contracts/ai-assistant';
// export * from './contracts/audit';
```

### 9.5 Kiểm tra cấu hình build

Sau khi dựng service đầu tiên, chạy `npx nest build user-service` và xem file entry nằm ở đâu:

```bash
ls dist/apps/user-service
```

Nếu có `main.js` ngay trong đó thì `CMD node dist/apps/$APP/main.js` trong Dockerfile đúng. Nếu entry nằm ở `dist/apps/user-service/src/main.js` thì sửa `CMD` cho khớp.

### 9.6 Smoke test RabbitMQ (quan trọng, làm khi dựng service đầu tiên)

Thiết kế dùng `wildcards: true` + exchange topic của `@nestjs/microservices` cho cả `send()` lẫn `emit()`. Hãy xác nhận ngay bằng cách chạy `user-service` + `api-gateway` rồi gọi `POST /api/auth/login` (xem hai file instruction). Nếu bị timeout dù service đã chạy và queue đã bind đúng, kiểm tra phiên bản `@nestjs/microservices` và mục RabbitMQ wildcards trong docs. Phương án dự phòng là quay lại mô hình mỗi service một queue với client riêng cho từng queue.

---

## 10. Thứ tự dựng

1. Làm xong **mục 9** (nền).
2. `user-service` → `user-service_instruction.md` (làm trước vì gateway cần nó để đăng nhập).
3. `api-gateway` → `api-gateway_instruction.md`.
4. Các service nghiệp vụ theo thứ tự: `device` → `maintenance` → `inventory` → `notification` → `audit` → `report` → `ai-assistant`. Mỗi service lặp lại khung của `user-service` (xem checklist cuối file `user-service_instruction.md`).

---

## 11. Chưa có ở giai đoạn này (và sẽ thêm ở đâu)

| Muốn thêm | Chỗ thêm, không đổi cấu trúc |
|---|---|
| Saga | Event thành công/thất bại trong `contracts/`, consumer + hàm bù trừ trong `messaging/consumers/`, trạng thái trung gian trong schema Prisma. `eventId`/`correlationId` đã có sẵn trong envelope. |
| Redis | Module `src/redis/` trong app cần dùng (không đặt trong shared), thêm `REDIS_URL`; không thêm container nếu dùng Redis cloud. |
