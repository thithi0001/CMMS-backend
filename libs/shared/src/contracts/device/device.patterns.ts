export const CATEGORY_CMD = {
    CREATE: 'cmd.category.create',
    UPDATE: 'cmd.category.update',
    DELETE: 'cmd.category.delete',
    FIND_ALL: 'cmd.category.find_all',
    FIND_BY_ID: 'cmd.category.find_by_id',
} as const;

export const CATEGORY_EVT = {
    CREATED: 'evt.category.created',
    UPDATED: 'evt.category.updated',
    DELETED: 'evt.category.deleted',
} as const;

export const SOURCE_CMD = {
    CREATE: 'cmd.source.create',
    UPDATE: 'cmd.source.update',
    FIND_ALL: 'cmd.source.find_all',
    FIND_BY_ID: 'cmd.source.find_by_id',
} as const;

export const SOURCE_EVT = {
    CREATED: 'evt.source.created',
    UPDATED: 'evt.source.updated',
} as const;

export const DEVICE_CMD = {
    CREATE: 'cmd.device.create',
    UPDATE: 'cmd.device.update',
    FIND_ALL: 'cmd.device.find_all',
    FIND_BY_ID: 'cmd.device.find_by_id',
    STATE_CHANGE: 'cmd.device.state_change',
} as const;

export const ASSIGN_DEVICE_CMD = {
    CREATE: 'cmd.assign_device.create',
    UPDATE: 'cmd.assign_device.update',
    DELETE: 'cmd.assign_device.delete',
} as const;

export const RETRIEVE_DEVICE_CMD = {
    CREATE: 'cmd.retrieve_device.create',
    UPDATE: 'cmd.retrieve_device.update',
    DELETE: 'cmd.retrieve_device.delete',
} as const;

export const HANDOVER_DEVICE_CMD = {
    CREATE: 'cmd.handover_device.create',
    UPDATE: 'cmd.handover_device.update',
    DELETE: 'cmd.handover_device.delete',
} as const;

export const DISPOSE_DEVICE_CMD = {
    DISPOSE: 'cmd.device.dispose',
} as const;

export const DEVICE_EMPLOYEE_CMD = {
    CREATE: 'cmd.device_employee.create',
    UPDATE: 'cmd.device_employee.update',
} as const;

export const DEVICE_EVT = {
    CREATED: 'evt.device.created',
    UPDATED: 'evt.device.updated',
    STATE_CHANGED: 'evt.device.state_changed',
} as const;

export const ASSIGN_DEVICE_EVT = {
    CREATED: 'evt.assign_device.created',
    UPDATED: 'evt.assign_device.updated',
    DELETED: 'evt.assign_device.deleted',
} as const;

export const RETRIEVE_DEVICE_EVT = {
    CREATED: 'evt.retrieve_device.created',
    UPDATED: 'evt.retrieve_device.updated',
    DELETED: 'evt.retrieve_device.deleted',
} as const;

export const HANDOVER_DEVICE_EVT = {
    CREATED: 'evt.handover_device.created',
    UPDATED: 'evt.handover_device.updated',
    DELETED: 'evt.handover_device.deleted',
} as const;

export const DISPOSE_DEVICE_EVT = {
    DISPOSED: 'evt.device.disposed',
} as const;

export const DEVICE_EMPLOYEE_EVT = {
    CREATED: 'evt.device_employee.created',
    UPDATED: 'evt.device_employee.updated',
} as const;



