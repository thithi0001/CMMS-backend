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


