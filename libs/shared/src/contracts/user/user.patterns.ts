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
    ACTIVATED: 'cmd.user.activated',
} as const;