export const USER_CMD = {
    CREATE: 'cmd.user.create',
    LOGIN: 'cmd.user.login',
    REFRESH_TOKEN: 'cmd.user.refresh_token',
    CHANGE_PASSWORD: 'cmd.user.change_password',
    FORGET_PASSWORD: 'cmd.user.forget_password',
    FIND_ALL: 'cmd.user.find_all',
    FIND_BY_ID: 'cmd.user.find_by_id',
    FIND_BY_EMAIL: 'cmd.user.find_by_email',
    FIND_BY_USERNAME: 'cmd.user.find_by_username',
    UPDATE: 'cmd.user.update',
    UPDATE_ROLE: 'cmd.user.update_role',
    DEACTIVATE: 'cmd.user.deactivate',
    ACTIVATE: 'cmd.user.activate',
    STATS: 'cmd.user.stats',
} as const;

export const USER_EVT = {
    CREATED: 'evt.user.created',
    LOGGED_IN: 'evt.user.logged_in',
    LOGIN_FAILED: 'evt.user.login_failed',
    UPDATED: 'evt.user.updated',
    ROLE_CHANGED: 'evt.user.role_changed',
    PASSWORD_CHANGED: 'evt.user.password_changed',
    DEACTIVATED: 'evt.user.deactivated',
    ACTIVATED: 'evt.user.activated',
} as const;

export const DEPARTMENT_CMD = {
  FIND_ALL: 'cmd.department.find_all',
  FIND_BY_ID: 'cmd.department.find_by_id',
  CREATE: 'cmd.department.create',
//   UPDATE: 'cmd.department.update',
} as const;

export const DEPARTMENT_EVT = {
    CREATED: 'evt.department.created',
    // UPDATED: 'evt.department.updated',
} as const;

export const EMPLOYEE_CMD = {
  GET_HISTORY: 'cmd.employee.get_history',
  FIND_BY_ID: 'cmd.employee.find_by_id',
  FIND_BY_USER_ID: 'cmd.employee.find_by_user_id', // current position
  FIND_ALL: 'cmd.employee.find_all',
  CREATE: 'cmd.employee.create',
  END: 'cmd.employee.end',
} as const;

export const EMPLOYEE_EVT = {
    CREATED: 'evt.employee.created',
    ENDED: 'evt.employee.ended',
} as const;

export const EXPERTISE_CMD = {
  FIND_ALL: 'cmd.expertise.find_all',
  FIND_BY_ID: 'cmd.expertise.find_by_id',
  FIND_BY_USER_ID: 'cmd.expertise.find_by_user_id',
  CREATE: 'cmd.expertise.create',
  ASSIGN: 'cmd.expertise.assign',
  REVOKE: 'cmd.expertise.revoke',
} as const;

export const EXPERTISE_EVT = {
  CREATED: 'evt.expertise.created',
  ASSIGNED: 'evt.expertise.assigned',
  REVOKED: 'evt.expertise.revoked',
} as const;


export const PASSWORD_RESET_CMD = {
  REQUEST: 'cmd.user.request_password_reset',
  VERIFY: 'cmd.user.verify_password_reset',
  RESET: 'cmd.user.reset_password',
} as const;

export const PASSWORD_RESET_EVT = {
    REQUESTED: 'evt.user.password_reset_requested',
    VERIFIED: 'evt.user.password_reset_verified',
    RESET: 'evt.user.password_reset',
} as const;