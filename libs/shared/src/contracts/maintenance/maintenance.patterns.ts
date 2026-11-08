export const TASK_CMD = {
    CREATE: 'cmd.task.create',
    UPDATE: 'cmd.task.update',
    FIND_ALL: 'cmd.task.find_all',
    FIND_BY_ID: 'cmd.task.find_by_id',
    FIND_BY_USER_ID: 'cmd.task.find_by_user_id',
} as const;

export const TASK_EVT = {
    CREATED: 'evt.task.created',
    UPDATED: 'evt.task.updated',
} as const;


