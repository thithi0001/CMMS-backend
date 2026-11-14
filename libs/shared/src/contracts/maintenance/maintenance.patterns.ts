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

export const ACCEPTANCE_CMD = {
    CREATE: 'cmd.acceptance.create',
    UPDATE: 'cmd.acceptance.update',
    DELETE: 'cmd.acceptance.delete',
    FIND_ALL: 'cmd.acceptance.find_all',
    FIND_BY_ID: 'cmd.acceptance.find_by_id',
} as const;

export const ACCEPTANCE_EVT = {
    CREATED: 'evt.acceptance.created',
    UPDATED: 'evt.acceptance.updated',
    DELETED: 'evt.acceptance.deleted',
} as const;

export const ASSIGNEE_CMD = {
    CREATE: 'cmd.assignee.create',
    UPDATE: 'cmd.assignee.update',
    DELETE: 'cmd.assignee.delete',
    FIND_ALL: 'cmd.assignee.find_all',
    FIND_BY_ID: 'cmd.assignee.find_by_id',
} as const;

export const ASSIGNEE_EVT = {
    CREATED: 'evt.assignee.created',
    UPDATED: 'evt.assignee.updated',
    DELETED: 'evt.assignee.deleted',
} as const;

export const DAMAGE_REPORT_CMD = {
    CREATE: 'cmd.damage_report.create',
    UPDATE: 'cmd.damage_report.update',
    DELETE: 'cmd.damage_report.delete',
    FIND_ALL: 'cmd.damage_report.find_all',
    FIND_BY_ID: 'cmd.damage_report.find_by_id',
} as const;

export const DAMAGE_REPORT_EVT = {
    CREATED: 'evt.damage_report.created',
    UPDATED: 'evt.damage_report.updated',
    DELETED: 'evt.damage_report.deleted',
} as const;

export const DISPOSE_PROPOSAL_CMD = {
    CREATE: 'cmd.dispose_proposal.create',
    UPDATE: 'cmd.dispose_proposal.update',
    DELETE: 'cmd.dispose_proposal.delete',
    FIND_ALL: 'cmd.dispose_proposal.find_all',
    FIND_BY_ID: 'cmd.dispose_proposal.find_by_id',
} as const;

export const DISPOSE_PROPOSAL_EVT = {
    CREATED: 'evt.dispose_proposal.created',
    UPDATED: 'evt.dispose_proposal.updated',
    DELETED: 'evt.dispose_proposal.deleted',
} as const;

export const TASK_PROPOSAL_CMD = {
    CREATE: 'cmd.task.create',
    UPDATE: 'cmd.task.update',
    DELETE: 'cmd.task.delete',
    FIND_ALL: 'cmd.task.find_all',
    FIND_BY_ID: 'cmd.task.find_by_id',
} as const;

export const TASK_PROPOSAL_EVT = {
    CREATED: 'evt.task.created',
    UPDATED: 'evt.task.updated',
    DELETED: 'evt.task.deleted',
} as const;


