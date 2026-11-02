// import { Controller, Logger } from "@nestjs/common";
// import { EventPattern, Payload } from "@nestjs/microservices";
// import { DEVICE_EVT } from '@app/shared';
// import { DeviceBrokenPayload, EventEnvelope } from '@app/shared';

// @Controller()
// export class DeviceEventsConsumer {
//     private readonly logger = new Logger(DeviceEventsConsumer.name);

//     @EventPattern(DEVICE_EVT.BROKEN)
//     onDeviceBroken(@Payload() event: EventEnvelope<DeviceBrokenPayload>) {
//         this.logger.log(`Receive ${event.type} (eventId=${event.eventId})`);
//         // gọi service nội bộ
//     }
// }

// ví dụ