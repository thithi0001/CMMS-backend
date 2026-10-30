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
