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

export const DEVICE_CMD = {
    CREATE: 'cmd.device.create',
    UPDATE: 'cmd.device.update',
    FIND_ALL: 'cmd.device.find_all',
    FIND_BY_ID: 'cmd.device.find_by_id',
} as const;

export const DEVICE_EVT = {
    CREATED: 'evt.device.created',
    UPDATED: 'evt.device.updated',
} as const;



