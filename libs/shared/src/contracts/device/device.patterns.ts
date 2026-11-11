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
    CREATE_ASSIGN_DEVICE: 'cmd.device.create_assign_device',
    UPDATE_ASSIGN_DEVICE: 'cmd.device.update_assign_device',
    DELETE_ASSIGN_DEVICE: 'cmd.device.delete_assign_device',
    CREATE_RETRIEVE_DEVICE: 'cmd.device.create_retrieve_device',
    UPDATE_RETRIEVE_DEVICE: 'cmd.device.update_retrieve_device',
    DELETE_RETRIEVE_DEVICE: 'cmd.device.delete_retrieve_device',
    CREATE_HANDOVER_DEVICE: 'cmd.device.create_handover_device',
    UPDATE_HANDOVER_DEVICE: 'cmd.device.update_handover_device',
    DELETE_HANDOVER_DEVICE: 'cmd.device.delete_handover_device',
    DISPOSE
} as const;

export const DEVICE_EVT = {
    CREATED: 'evt.device.created',
    UPDATED: 'evt.device.updated',
    STATE_CHANGED: 'evt.device.state_changed',
    ASSIGN_DEVICE_CREATED: 'evt.device.assign_device_created',
    ASSIGN_DEVICE_UPDATED: 'evt.device.assign_device_updated',
    ASSIGN_DEVICE_DELETED: 'evt.device.assign_device_deleted',
    RETRIEVE_DEVICE_CREATED: 'evt.device.retrieve_device_created',
    RETRIEVE_DEVICE_UPDATED: 'evt.device.retrieve_device_updated',
    RETRIEVE_DEVICE_DELETED: 'evt.device.retrieve_device_deleted',
    HANDOVER_DEVICE_CREATED: 'evt.device.handover_device_created',
    HANDOVER_DEVICE_UPDATED: 'evt.device.handover_device_updated',
    HANDOVER_DEVICE_DELETED: 'evt.device.handover_device_deleted',
} as const;



