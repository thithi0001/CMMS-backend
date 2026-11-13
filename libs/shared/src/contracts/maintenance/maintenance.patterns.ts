export const TASK_CMD = {
    CREATE: 'cmd.task.create',
    UPDATE: 'cmd.task.update',
    DELETE: 'cmd.task.delete',
    FIND_ALL: 'cmd.task.find_all',
    FIND_BY_ID: 'cmd.task.find_by_id',
    START: 'cmd.task.start',
    END: 'cmd.task.end',
    CANCEL: 'cmd.task.cancel',
    REOPEN: 'cmd.task.reopen',
    EVALUATE: 'cmd.task.evaluate',
    STATS: 'cmd.task.stats',
} as const;

export const TASK_EVT = {
    CREATED: 'evt.task.created',
    UPDATED: 'evt.task.updated',
    DELETED: 'evt.task.deleted',
    STAGE_CHANGED: 'evt.task.stage_changed',
} as const;

export const TICKET_CMD = {
    CREATE: 'cmd.ticket.create',
    UPDATE: 'cmd.ticket.update',
    DELETE: 'cmd.ticket.delete',
    FIND_ALL: 'cmd.ticket.find_all',
    FIND_BY_ID: 'cmd.ticket.find_by_id',
    CONFIRM: 'cmd.ticket.confirm',
    STATS: 'cmd.ticket.stats',
} as const;

export const TICKET_EVT = {
    CREATED: 'evt.ticket.created',
    UPDATED: 'evt.ticket.updated',
    DELETED: 'evt.ticket.deleted',
    CONFIRMED: 'evt.ticket.confirmed',
} as const;


