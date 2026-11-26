# Luồng xử lý lỗi HTTP và RPC

Tài liệu này mô tả cách lỗi đi qua API Gateway và các microservice khi giao tiếp qua RabbitMQ, cùng ví dụ kiểm tra task trước khi tạo usage item list.

## Luồng tổng quát

```text
Client
  │ HTTP request
  ▼
API Gateway controller
  │ BusService.send()
  │ sendRpcRequest() — chờ phản hồi, áp dụng timeout
  ▼
RabbitMQ ── request/reply ──► Microservice nhận lệnh
                                  │ Controller @MessagePattern
                                  ▼
                              Service / database
                                  │
                    trả kết quả hoặc throw exception
                                  ▼
                         RpcErrorFilter của service
                                  │
                       { statusCode, message }
                                  ▼
RabbitMQ ◄───────────────────────┘
  │ phản hồi thành công hoặc lỗi
  ▼
sendRpcRequest() trong API Gateway
  │ lỗi RPC hợp lệ → HttpException
  ▼
RpcToHttpFilter
  │
  ▼
HTTP response
```

`ClientProxy.send()` là request–response: bên gọi chờ kết quả. `emit()` dùng cho sự kiện không cần phản hồi và không đi theo luồng xử lý lỗi đồng bộ này.

## Các thành phần xử lý lỗi

### 1. Service xử lý nghiệp vụ

Service ném exception NestJS phù hợp với lỗi, ví dụ:

- `NotFoundException` — không tìm thấy task hoặc tài nguyên.
- `BadRequestException` — dữ liệu đầu vào không hợp lệ.
- `ForbiddenException` — thao tác không được phép.
- `ConflictException` — xung đột trạng thái hoặc dữ liệu.

Lỗi bất ngờ cũng được chuyển qua filter, nhưng chi tiết không gửi ra ngoài; filter ghi log và trả lỗi 500 chung.

### 2. `RpcErrorFilter` ở microservice

Các microservice đăng ký filter này trong `main.ts`. Filter chuyển `HttpException` thành payload RPC:

```json
{ "statusCode": 404, "message": "Task not found" }
```

Payload này cho phép truyền mã lỗi và thông báo qua RabbitMQ mà không phụ thuộc vào đối tượng exception của NestJS.

- Với `RpcException`, filter chuyển tiếp nội dung của exception.
- Với `HttpException`, filter giữ status code và message.
- Với lỗi không xác định, filter log lỗi rồi trả `500` và message chung.

### 3. `sendRpcRequest()` dùng chung

Hàm trong [`rpc-request.ts`](../libs/shared/src/messaging/rpc-request.ts) được dùng bởi cả Gateway và các client nội bộ. Nó:

1. Gửi lệnh và chờ phản hồi trong khoảng timeout đã cấu hình.
2. Chuyển timeout thành `GatewayTimeoutException` (504).
3. Nếu nhận payload có `statusCode` là số nguyên từ 400–599 và có `message`, chuyển payload thành `HttpException` với status tương ứng.
4. Nếu lỗi không khớp payload RPC, chuyển thành `ServiceUnavailableException` (503), giữ lỗi gốc làm `cause`.

`isRpcErrorPayload()` là type guard dùng chung để chỉ nhận payload có cấu trúc hợp lệ; tránh coi một object bất kỳ có `statusCode` là lỗi RPC hợp lệ.

### 4. `RpcToHttpFilter` ở API Gateway

Gateway đăng ký filter này cho HTTP. Filter:

- Lấy status/message từ `HttpException`.
- Chuyển timeout thành 504.
- Nhận diện payload RPC hợp lệ nếu có lỗi chưa được `sendRpcRequest()` chuyển đổi.
- Với lỗi không xác định, ghi log và trả 500.

Phản hồi lỗi có cấu trúc:

```json
{
  "success": false,
  "data": {
    "statusCode": 404,
    "message": "Task not found"
  },
  "meta": {
    "timestamp": "..."
  }
}
```

Phản hồi thành công có cấu trúc riêng do `ResponseInterceptor` tạo:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "..."
  }
}
```

## Ví dụ: kiểm tra task trước khi tạo usage item list

1. Một consumer gửi `USAGE_ITEM_LIST_CMD.CREATE` tới Inventory Service. Hiện tại `UsageItemsController` có handler RabbitMQ cho command này; Gateway chưa có HTTP route tương ứng trong `InventoryModule`.
2. `UsageItemsService.create()` gọi `MaintenanceTasksClient.findById(dto.taskId)` trước khi mở transaction tồn kho.
3. Client gửi `TASK_CMD.FIND_BY_ID` qua RabbitMQ.
4. Maintenance Service xử lý lệnh bằng `TasksController` và `TasksService.findById()`.
5. Nếu task tồn tại, task được trả về và Inventory Service tiếp tục transaction tạo list.
6. Nếu task không tồn tại, Maintenance Service ném `NotFoundException`; `RpcErrorFilter` chuyển thành payload 404. `sendRpcRequest()` chuyển payload thành `HttpException`, Inventory Service trả lỗi RPC tiếp về Gateway, rồi Gateway tạo HTTP response 404 theo cấu trúc trên.
7. Nếu Maintenance Service không phản hồi đúng hạn, request kết thúc với 504. Nếu RabbitMQ hoặc service gặp lỗi giao tiếp khác, helper trả 503 thay vì tiếp tục tạo list.

Việc kiểm tra ở backend là bắt buộc; frontend có thể kiểm tra trước để cải thiện trải nghiệm nhưng không thay thế bước này.

## Các file liên quan

- [`rpc-request.ts`](../libs/shared/src/messaging/rpc-request.ts) — xử lý request–response, timeout và payload lỗi RPC dùng chung.
- [`rpc-error.filter.ts`](../libs/shared/src/exceptions/rpc-error.filter.ts) — chuẩn hóa lỗi tại microservice.
- [`rpc-to-http.filter.ts`](../apps/api-gateway/src/common/filters/rpc-to-http.filter.ts) — đổi lỗi thành HTTP response.
- [`bus.service.ts`](../apps/api-gateway/src/bus/bus.service.ts) — gửi RPC từ Gateway.
- [`maintenance-tasks.client.ts`](../apps/inventory-service/src/messaging/clients/maintenance-tasks.client.ts) — gọi Maintenance Service từ Inventory Service.
- [`usage-items.service.ts`](../apps/inventory-service/src/modules/usage-items/usage-items.service.ts) — kiểm tra task trước khi tạo danh sách.
