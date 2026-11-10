export const TASK_CMD = {
    CREATE: 'cmd.task.create',
    UPDATE: 'cmd.task.update',
    DELETE: 'cmd.task.delete',
    FIND_ALL: 'cmd.task.find_all',
    FIND_BY_ID: 'cmd.task.find_by_id',
    FIND_BY_USER_ID: 'cmd.task.find_by_user_id',
    STATS: 'cmd.task.stats',
} as const;

export const TASK_EVT = {
    CREATED: 'evt.task.created',
    UPDATED: 'evt.task.updated',
    DELETED: 'evt.task.delete',
} as const;


