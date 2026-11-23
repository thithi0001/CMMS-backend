export const INVENTORY_SOURCE_CMD = {
    CREATE: 'cmd.inventory_source.create',
    UPDATE: 'cmd.inventory_source.update',
    DELETE: 'cmd.inventory_source.delete',
    FIND_ALL: 'cmd.inventory_source.find_all',
    FIND_BY_ID: 'cmd.inventory_source.find_by_id',
} as const;

export const INVENTORY_SOURCE_EVT = {
    CREATED: 'evt.inventory_source.created',
    UPDATED: 'evt.inventory_source.updated',
    DELETED: 'evt.inventory_source.deleted',
} as const;

export const ITEM_CMD = {
    CREATE: 'cmd.item.create',
    UPDATE: 'cmd.item.update',
    FIND_ALL: 'cmd.item.find_all',
    FIND_BY_ID: 'cmd.item.find_by_id',
    UPDATE_STOCK: 'cmd.item.update_stock',
} as const;

export const ITEM_EVT = {
    CREATED: 'evt.item.created',
    UPDATED: 'evt.item.updated',
    STOCK_UPDATED: 'evt.item.stock_updated',
} as const;

export const BATCH_CMD = {
    CREATE: 'cmd.batch.create',
    CHANGE_QUANTITY: 'cmd.batch.change_quantity',
    DELETE: 'cmd.batch.delete',
    FIND_ALL: 'cmd.batch.find_all',
    FIND_BY_ID: 'cmd.batch.find_by_id',
} as const;

export const BATCH_EVT = {
    CREATED: 'evt.batch.created',
    QUANTITY_CHANGED: 'evt.batch.quantity_changed',
    DELETED: 'evt.batch.deleted',
} as const;

export const REQUIRE_ITEM_CMD = {
    CREATE: 'cmd.require_item.create',
    UPDATE: 'cmd.require_item.update',
    DELETE: 'cmd.require_item.delete',
    FIND_ALL: 'cmd.require_item.find_all',
    FIND_BY_ID: 'cmd.require_item.find_by_id',
    CONFIRM: 'cmd.require_item.confirm',
    FULFILL: 'cmd.require_item.fulfill',
} as const;

export const REQUIRE_ITEM_EVT = {
    CREATED: 'evt.require_item.created',
    UPDATED: 'evt.require_item.updated',
    DELETED: 'evt.require_item.deleted',
    CONFIRMED: 'evt.require_item.confirmed',
    FULFILLED: 'evt.require_item.fulfilled',
} as const;

export const USAGE_ITEM_LIST_CMD = {
    CREATE: 'cmd.usage_item_list.create',
    UPDATE: 'cmd.usage_item_list.update',
    ADD_ITEMS: 'cmd.usage_item_list.add_items',
    FIND_ALL: 'cmd.usage_item_list.find_all',
    FIND_BY_ID: 'cmd.usage_item_list.find_by_id',
} as const;

export const USAGE_ITEM_LIST_EVT = {
    CREATED: 'evt.usage_item_list.created',
    UPDATED: 'evt.usage_item_list.updated',
    ITEMS_ADDED: 'evt.usage_item_list.items_added',
} as const;


